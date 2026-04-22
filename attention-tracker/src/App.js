// IMPORTS AND CHART.JS REGISTRATION
import { FaceMesh } from "@mediapipe/face_mesh";
import React, { useRef, useEffect, useState } from "react";
import * as Facemesh from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import jsPDF from 'jspdf';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// MAIN APP COMPONENT
function App() {
  
  // REFS
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const connect = window.drawConnectors;
  var camera = null;

  // STATE - CORE DETECTION
  const [focusScore, setFocusScore] = useState(0);
  const [status, setStatus] = useState("Initializing...");
  const [drowsinessLevel, setDrowsinessLevel] = useState(0);
  const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
  const [ear, setEAR] = useState(0);
  const [alert, setAlert] = useState("");
  const [lookingDirection, setLookingDirection] = useState("center");
  const [isDrowsy, setIsDrowsy] = useState(false);

  // STATE - SESSION TRACKING
  const [studyTime, setStudyTime] = useState(0);
  const [focusTime, setFocusTime] = useState(0);
  
  // STATE - UI CONTROLS
  const [darkMode, setDarkMode] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [focusHistoryData, setFocusHistoryData] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  
  // STATE - POMODORO TIMER
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState('focus');
  const [breakSuggestion, setBreakSuggestion] = useState("");
  
  // STATE - FOCUS REMINDER
  const [focusReminderEnabled, setFocusReminderEnabled] = useState(false);
  const [reminderDelay, setReminderDelay] = useState(10);
  
  // STATE - GOALS AND STREAKS
  const [dailyGoal, setDailyGoal] = useState(120);
  const [dailyProgress, setDailyProgress] = useState(0);
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  // REFS - DETECTION STATE
  const focusHistory = useRef([]);
  const closedFrames = useRef(0);
  const lookingAwayFrames = useRef(0);
  const lookingDownFrames = useRef(0);
  const lookingLeftFrames = useRef(0);
  const lookingRightFrames = useRef(0);
  const headDownWithEyesClosed = useRef(0);
  const lastValidLandmarks = useRef(null);
  
  // REFS - TIMERS
  const studyTimerRef = useRef(null);
  const focusTimerRef = useRef(null);
  const pomodoroTimerRef = useRef(null);
  const streakTimerRef = useRef(null);
  const reminderTimerRef = useRef(null);
  
  // REFS - AUDIO AND TRACKING
  const currentStreakRef = useRef(0);
  const audioContextRef = useRef(null);
  const frameCountRef = useRef(0);
  const graphDataRef = useRef({ scores: [], times: [] });

  // CONSTANTS - FACIAL LANDMARK INDICES
  const LEFT_EYE = [33, 160, 158, 133, 153, 144];
  const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
  const EAR_THRESHOLD = 0.23;
  const DROWSY_FRAMES = 25;
  const DISTRACTION_FRAMES = 30;
  const LOOKING_DOWN_FRAMES = 45;

  // THEME CONFIGURATION
  const theme = {
    dark: {
      bg: '#0a0a0a',
      card: '#1a1a1a',
      text: '#ffffff',
      secondary: '#888',
      border: '#333'
    },
    light: {
      bg: '#f5f5f5',
      card: '#ffffff',
      text: '#333333',
      secondary: '#666',
      border: '#ddd'
    }
  };

  const currentTheme = darkMode ? theme.dark : theme.light;

  // HANDLER FUNCTIONS
  
  // close handler
  const handleClose = () => {
    if (camera) {
      camera.stop();
    }
    if (studyTimerRef.current) clearInterval(studyTimerRef.current);
    if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current);
    if (streakTimerRef.current) clearInterval(streakTimerRef.current);
    if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
    
    window.location.href = '/';
  };

  // audio functions
  const playFocusReminder = () => {
    if (!focusReminderEnabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 660;
    gainNode.gain.value = 0.08;
    oscillator.type = 'sine';
    
    oscillator.start();
    
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 880;
      gain2.gain.value = 0.08;
      osc2.type = 'sine';
      osc2.start();
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.5);
    }, 100);
    
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    oscillator.stop(ctx.currentTime + 0.5);
  };

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const toggleFocusReminder = () => {
    if (!focusReminderEnabled) {
      initAudio();
    }
    setFocusReminderEnabled(!focusReminderEnabled);
  };

  // reset session
  const resetSession = () => {
    setStudyTime(0);
    setFocusTime(0);
    setFocusHistoryData([]);
    setTimestamps([]);
    graphDataRef.current = { scores: [], times: [] };
    focusHistory.current = [];
    setPomodoroTime(25 * 60);
    setPomodoroActive(false);
    setPomodoroMode('focus');
    setBreakSuggestion("");
    setLookingDirection("center");
    lookingLeftFrames.current = 0;
    lookingRightFrames.current = 0;
    lookingDownFrames.current = 0;
    closedFrames.current = 0;
    frameCountRef.current = 0;
    setIsDrowsy(false);
  };

  // format time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPomodoroTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // export report
  const exportReport = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleString();
    
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('FocusGuard Study Report', 105, 25, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${date}`, 105, 45, { align: 'center' });
    
    doc.setFillColor(240, 240, 240);
    doc.rect(10, 55, 190, 50, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Session Summary', 15, 70);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Study Time: ${formatTime(studyTime)}`, 20, 85);
    doc.text(`Focused Time: ${formatTime(focusTime)}`, 100, 85);
    doc.text(`Focus Rate: ${studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%`, 20, 95);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Metrics', 15, 120);
    
    const validScores = focusHistoryData.filter(s => s > 0);
    const avgScore = validScores.length > 0 ? 
      Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Average Focus Score: ${avgScore}%`, 20, 135);
    doc.text(`Peak Focus Score: ${focusHistoryData.length > 0 ? Math.max(...focusHistoryData) : 0}%`, 100, 135);
    doc.text(`Longest Focus Streak: ${longestStreak} minutes`, 20, 145);
    doc.text(`Daily Goal Progress: ${dailyProgress}/${dailyGoal} minutes`, 100, 145);
    
    doc.save(`focusguard-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // CALCULATION FUNCTIONS
  
  // euclidean distance
  const euclideanDist = (p1, p2) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  // eye aspect ratio
  const calculateEAR = (eye) => {
    const A = euclideanDist(eye[1], eye[5]);
    const B = euclideanDist(eye[2], eye[4]);
    const C = euclideanDist(eye[0], eye[3]);
    return (A + B) / (2.0 * C);
  };

  // head pose estimation
  const calculateHeadPose = (landmarks) => {
    const noseTip = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];

    const faceCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2
    };
    const noseOffset = noseTip.x - faceCenter.x;
    const eyeDistance = Math.abs(rightEye.x - leftEye.x);
    const yaw = (noseOffset / eyeDistance) * 90;

    const noseToChin = chin.y - noseTip.y;
    const eyeToNose = noseTip.y - faceCenter.y;
    const pitch = (eyeToNose / noseToChin) * 60 - 30;

    const eyeYDiff = rightEye.y - leftEye.y;
    const eyeXDiff = rightEye.x - leftEye.x;
    const roll = Math.atan2(eyeYDiff, eyeXDiff) * (180 / Math.PI);

    return { yaw, pitch, roll };
  };

  // focus score calculation
  const calculateFocusScore = (landmarks, earValue, pose) => {
    if (!landmarks || landmarks.length === 0) return 0;

    let score = 100;

    if (pose.yaw > 20) {
      lookingRightFrames.current += 1;
      lookingLeftFrames.current = Math.max(0, lookingLeftFrames.current - 1);
    } else if (pose.yaw < -20) {
      lookingLeftFrames.current += 1;
      lookingRightFrames.current = Math.max(0, lookingRightFrames.current - 1);
    } else {
      lookingLeftFrames.current = Math.max(0, lookingLeftFrames.current - 2);
      lookingRightFrames.current = Math.max(0, lookingRightFrames.current - 2);
    }

    if (pose.pitch > 25 && Math.abs(pose.yaw) < 25) {
      lookingDownFrames.current += 1;
    } else {
      lookingDownFrames.current = Math.max(0, lookingDownFrames.current - 1);
    }

    if (lookingLeftFrames.current > DISTRACTION_FRAMES || lookingRightFrames.current > DISTRACTION_FRAMES) {
      score -= 45;
    } else if (lookingLeftFrames.current > DISTRACTION_FRAMES / 2 || lookingRightFrames.current > DISTRACTION_FRAMES / 2) {
      score -= 25;
    } else if (lookingLeftFrames.current > 8 || lookingRightFrames.current > 8) {
      score -= 10;
    }

    if (lookingDownFrames.current > LOOKING_DOWN_FRAMES && earValue >= EAR_THRESHOLD) {
      score -= 15;
    }

    if (earValue < EAR_THRESHOLD) {
      if (closedFrames.current > DROWSY_FRAMES / 2) {
        score -= 40;
      } else {
        score -= 20;
      }
    }

    if (Math.abs(pose.roll) > 25) {
      score -= 10;
    }

    const nose = landmarks[1];
    const centerOffset = Math.abs(nose.x - 0.5);
    if (centerOffset > 0.3) score -= 10;
    else if (centerOffset > 0.2) score -= 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  // status and direction update
  const updateStatusAndDirection = (score, earValue, pose) => {
    if (pose.yaw > 20) {
      setLookingDirection("right");
    } else if (pose.yaw < -20) {
      setLookingDirection("left");
    } else if (pose.pitch > 25) {
      setLookingDirection("down");
    } else {
      setLookingDirection("center");
    }

    const headDown = pose.pitch > 20;
    
    if (headDown && earValue < EAR_THRESHOLD) {
      headDownWithEyesClosed.current += 1;
    } else {
      headDownWithEyesClosed.current = 0;
    }

    const drowsyDetected = headDownWithEyesClosed.current >= 15 || 
                    (earValue < EAR_THRESHOLD && closedFrames.current >= DROWSY_FRAMES);

    setIsDrowsy(drowsyDetected);

    if (drowsyDetected) {
      setAlert("DROWSINESS DETECTED! WAKE UP!");
      setStatus("DROWSY - NEEDS REST");
      return;
    }

    setAlert("");

    if (lookingLeftFrames.current > DISTRACTION_FRAMES) {
      setStatus("Distracted - Looking Left");
    } else if (lookingRightFrames.current > DISTRACTION_FRAMES) {
      setStatus("Distracted - Looking Right");
    } else if (lookingDownFrames.current > LOOKING_DOWN_FRAMES) {
      if (earValue < EAR_THRESHOLD) {
        setStatus("Drowsy - Head Down with Eyes Closed");
      } else {
        setStatus("Studying - Reading/Writing");
      }
    } else if (pose.pitch > 25 && earValue >= EAR_THRESHOLD) {
      setStatus("Studying - Looking at Desk");
    } else if (score >= 80) {
      setStatus("Highly Focused - Great Job!");
    } else if (score >= 65) {
      setStatus("Good Focus");
    } else if (score >= 50) {
      setStatus("Slightly Distracted");
    } else if (score >= 30) {
      setStatus("Distracted - Try to Focus");
    } else {
      setStatus("Not Focused");
    }
  };

  // MEDIAPIPE ON RESULTS CALLBACK
  function onResults(results) {
    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      lastValidLandmarks.current = landmarks;

      const leftEyePoints = LEFT_EYE.map(idx => landmarks[idx]);
      const rightEyePoints = RIGHT_EYE.map(idx => landmarks[idx]);

      const leftEAR = calculateEAR(leftEyePoints);
      const rightEAR = calculateEAR(rightEyePoints);
      const earValue = (leftEAR + rightEAR) / 2.0;
      setEAR(earValue);

      if (earValue < EAR_THRESHOLD) {
        closedFrames.current += 1;
      } else {
        closedFrames.current = Math.max(0, closedFrames.current - 1);
      }

      const drowsiness = Math.max(0, Math.min(100, 
        (EAR_THRESHOLD - earValue) * 400 + (closedFrames.current / DROWSY_FRAMES) * 50
      ));
      setDrowsinessLevel(Math.round(drowsiness));

      const pose = calculateHeadPose(landmarks);
      setHeadPose(pose);

      const currentScore = calculateFocusScore(landmarks, earValue, pose);

      focusHistory.current.push(currentScore);
      if (focusHistory.current.length > 15) {
        focusHistory.current.shift();
      }
      
      const weights = focusHistory.current.map((_, i) => (i + 1) / focusHistory.current.length);
      const weightedSum = focusHistory.current.reduce((sum, score, i) => sum + score * weights[i], 0);
      const weightSum = weights.reduce((a, b) => a + b, 0);
      const smoothedScore = Math.round(weightedSum / weightSum);
      
      setFocusScore(smoothedScore);

      updateStatusAndDirection(smoothedScore, earValue, pose);

      // update graph data every 60 frames (about 2 seconds at 30fps)
      frameCountRef.current += 1;
      if (frameCountRef.current >= 60) {
        frameCountRef.current = 0;
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        graphDataRef.current.scores.push(smoothedScore);
        graphDataRef.current.times.push(timeStr);
        
        // keep last 30 points for graph
        if (graphDataRef.current.scores.length > 30) {
          graphDataRef.current.scores.shift();
          graphDataRef.current.times.shift();
        }
        
        setFocusHistoryData([...graphDataRef.current.scores]);
        setTimestamps([...graphDataRef.current.times]);
      }

      const meshColor = alert ? "#FF0000" : 
        (smoothedScore >= 70 ? "#30FF30" : 
         smoothedScore >= 50 ? "#FFA500" : "#FF6347");
      
      connect(canvasCtx, landmarks, Facemesh.FACEMESH_TESSELATION, {
        color: meshColor + "70",
        lineWidth: 1,
      });

      const eyeColor = earValue < EAR_THRESHOLD ? "#FF0000" : "#00FF00";
      connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, { color: eyeColor });
      connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, { color: eyeColor });
      connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, { color: "#FF3030" });
      connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, { color: "#30FF30" });
      connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, { color: "#E0E0E0" });
      connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, { color: "#E0E0E0" });

      [leftEyePoints, rightEyePoints].forEach(eyePoints => {
        canvasCtx.beginPath();
        eyePoints.forEach((point, i) => {
          const x = point.x * canvasElement.width;
          const y = point.y * canvasElement.height;
          if (i === 0) canvasCtx.moveTo(x, y);
          else canvasCtx.lineTo(x, y);
        });
        canvasCtx.closePath();
        canvasCtx.strokeStyle = eyeColor;
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
      });

      const nose = landmarks[1];
      const arrowX = nose.x * canvasElement.width;
      const arrowY = nose.y * canvasElement.height;
      
      canvasCtx.beginPath();
      canvasCtx.arc(arrowX, arrowY, 6, 0, 2 * Math.PI);
      canvasCtx.fillStyle = smoothedScore >= 70 ? "#30FF30" : 
                           smoothedScore >= 50 ? "#FFA500" : "#FF3030";
      canvasCtx.fill();

      canvasCtx.beginPath();
      canvasCtx.moveTo(arrowX, arrowY);
      let dirX = arrowX;
      let dirY = arrowY;
      
      if (lookingDirection === "left") {
        dirX -= 40;
      } else if (lookingDirection === "right") {
        dirX += 40;
      } else if (lookingDirection === "down") {
        dirY += 40;
      } else {
        dirY -= 20;
      }
      
      canvasCtx.lineTo(dirX, dirY);
      canvasCtx.strokeStyle = "#FFD700";
      canvasCtx.lineWidth = 3;
      canvasCtx.stroke();

      canvasCtx.font = '14px Arial';
      canvasCtx.fillStyle = '#FFFFFF';
      canvasCtx.fillText(status, 10, 30);

    } else {
      setFocusScore(0);
      setStatus("No Face Detected");
      setDrowsinessLevel(0);
      setEAR(0);
      setHeadPose({ yaw: 0, pitch: 0, roll: 0 });
      setLookingDirection("center");
      closedFrames.current = 0;
      lookingLeftFrames.current = 0;
      lookingRightFrames.current = 0;
      lookingDownFrames.current = 0;
      setIsDrowsy(false);
    }

    canvasCtx.restore();
  }

  // CHART CONFIGURATION
  const chartData = {
    labels: timestamps.length > 0 ? timestamps : ['0:00'],
    datasets: [
      {
        label: 'Focus Score',
        data: focusHistoryData.length > 0 ? focusHistoryData : [0],
        borderColor: darkMode ? '#4CAF50' : '#2196F3',
        backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(33, 150, 243, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: focusHistoryData.length > 20 ? 2 : 4,
        pointHoverRadius: 6,
        borderWidth: 2.5,
      },
      {
        label: 'Threshold (50%)',
        data: Array(timestamps.length || 1).fill(50),
        borderColor: '#FFA500',
        borderDash: [5, 5],
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: currentTheme.text,
          font: { size: 11 }
        },
      },
      title: {
        display: true,
        text: 'Focus Score Timeline (Full Session)',
        color: currentTheme.text,
        font: { size: 13, weight: 'bold' }
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: currentTheme.border },
        ticks: { color: currentTheme.text, font: { size: 10 } },
        title: { display: true, text: 'Score (%)', color: currentTheme.text, font: { size: 11 } }
      },
      x: {
        grid: { color: currentTheme.border },
        ticks: { 
          color: currentTheme.text, 
          font: { size: 9 }, 
          maxRotation: 45,
          callback: function(val, index) {
            // show every 5th label to avoid crowding
            return index % 5 === 0 ? this.getLabelForValue(val) : '';
          }
        },
        title: { display: true, text: 'Time', color: currentTheme.text, font: { size: 11 } }
      },
    },
  };

  // USE EFFECTS
  
  // focus reminder effect
  useEffect(() => {
    if (focusReminderEnabled && focusScore < 50 && !isDrowsy) {
      if (!reminderTimerRef.current) {
        reminderTimerRef.current = setTimeout(() => {
          playFocusReminder();
          reminderTimerRef.current = null;
        }, reminderDelay * 1000);
      }
    } else {
      if (reminderTimerRef.current) {
        clearTimeout(reminderTimerRef.current);
        reminderTimerRef.current = null;
      }
    }
    
    return () => {
      if (reminderTimerRef.current) {
        clearTimeout(reminderTimerRef.current);
      }
    };
  }, [focusScore, focusReminderEnabled, reminderDelay, isDrowsy]);

  // local storage load
  useEffect(() => {
    const savedGoal = localStorage.getItem('dailyFocusGoal');
    const savedProgress = localStorage.getItem('dailyProgress');
    const savedStreak = localStorage.getItem('longestStreak');
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('progressDate');
    
    if (savedGoal) setDailyGoal(parseInt(savedGoal));
    if (savedStreak) setLongestStreak(parseInt(savedStreak));
    
    if (savedDate === today) {
      if (savedProgress) setDailyProgress(parseInt(savedProgress));
    } else {
      localStorage.setItem('progressDate', today);
      localStorage.setItem('dailyProgress', '0');
      setDailyProgress(0);
    }
  }, []);

  // local storage save
  useEffect(() => {
    localStorage.setItem('dailyProgress', dailyProgress.toString());
    localStorage.setItem('dailyGoal', dailyGoal.toString());
    localStorage.setItem('longestStreak', longestStreak.toString());
  }, [dailyProgress, dailyGoal, longestStreak]);

  // streak tracker
  useEffect(() => {
    streakTimerRef.current = setInterval(() => {
      if (focusScore >= 70 && !isDrowsy) {
        currentStreakRef.current += 1;
        setStreakCount(currentStreakRef.current);
        if (currentStreakRef.current > longestStreak) {
          setLongestStreak(currentStreakRef.current);
        }
      } else {
        currentStreakRef.current = 0;
        setStreakCount(0);
      }
    }, 60000);
    
    return () => clearInterval(streakTimerRef.current);
  }, [focusScore, longestStreak, isDrowsy]);

  // pomodoro timer
  useEffect(() => {
    if (pomodoroActive) {
      pomodoroTimerRef.current = setInterval(() => {
        setPomodoroTime(prev => {
          if (prev <= 1) {
            if (pomodoroMode === 'focus') {
              setPomodoroMode('break');
              setBreakSuggestion("Time for a 5-minute break!");
              return 5 * 60;
            } else {
              setPomodoroMode('focus');
              setBreakSuggestion("");
              setPomodoroActive(false);
              return 25 * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else if (pomodoroTimerRef.current) {
      clearInterval(pomodoroTimerRef.current);
    }
    
    return () => {
      if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current);
    };
  }, [pomodoroActive, pomodoroMode]);

  // break suggestion
  useEffect(() => {
    if (focusHistory.current.length >= 30) {
      const recentScores = focusHistory.current.slice(-30);
      const avgRecent = recentScores.reduce((a, b) => a + b, 0) / 30;
      
      if (avgRecent < 45 && studyTime > 1800) {
        setBreakSuggestion("Focus dropping. Consider taking a short break.");
      }
    }
  }, [focusScore, studyTime]);

  // daily progress update
  useEffect(() => {
    const focusedMinutes = Math.floor(focusTime / 60);
    setDailyProgress(focusedMinutes);
  }, [focusTime]);

  // study and focus timers
  useEffect(() => {
    studyTimerRef.current = setInterval(() => {
      setStudyTime(prev => prev + 1);
    }, 1000);

    focusTimerRef.current = setInterval(() => {
      // only increment focus time if score >= 50 AND not drowsy
      if (focusScore >= 50 && !isDrowsy) {
        setFocusTime(prev => prev + 1);
      }
    }, 1000);

    return () => {
      clearInterval(studyTimerRef.current);
      clearInterval(focusTimerRef.current);
    };
  }, [focusScore, isDrowsy]);

  // mediapipe initialization
  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      refineLandmarks: true,
    });

    faceMesh.onResults(onResults);

    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null
    ) {
      camera = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          await faceMesh.send({ image: webcamRef.current.video });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }

    return () => {
      if (camera) {
        camera.stop();
      }
    };
  }, []);

  // RENDER
  return (
    <div style={{ 
      display: 'flex', 
      backgroundColor: currentTheme.bg,
      minHeight: '100vh',
      color: currentTheme.text,
      padding: '12px',
      transition: 'all 0.3s ease',
      gap: '12px'
    }}>
      
      {/* LEFT PANEL - CONTROLS AND STATS */}
      <div style={{
        width: '260px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        
        {/* header with close button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ 
            color: darkMode ? '#4CAF50' : '#2196F3',
            fontSize: '20px',
            margin: '0'
          }}>
            FocusGuard
          </h1>
          <button
            onClick={handleClose}
            style={{
              padding: '5px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Close
          </button>
        </div>

        {/* theme and reminder controls */}
        <div style={{
          backgroundColor: currentTheme.card,
          padding: '10px',
          borderRadius: '8px',
          border: `1px solid ${currentTheme.border}`
        }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                flex: 1,
                padding: '7px',
                backgroundColor: currentTheme.bg,
                color: currentTheme.text,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {darkMode ? 'Light' : 'Dark'}
            </button>
            <button
              onClick={toggleFocusReminder}
              style={{
                flex: 1,
                padding: '7px',
                backgroundColor: focusReminderEnabled ? '#4CAF50' : currentTheme.bg,
                color: focusReminderEnabled ? 'white' : currentTheme.text,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {focusReminderEnabled ? 'Reminder On' : 'Reminder Off'}
            </button>
          </div>
          
          {focusReminderEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: currentTheme.secondary }}>Delay:</span>
              <input
                type="range"
                min="5"
                max="60"
                value={reminderDelay}
                onChange={(e) => setReminderDelay(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '11px', color: currentTheme.text, minWidth: '35px' }}>
                {reminderDelay}s
              </span>
            </div>
          )}
        </div>

        {/* focus score card */}
        <div style={{
          backgroundColor: currentTheme.card,
          padding: '12px',
          borderRadius: '8px',
          border: `1px solid ${currentTheme.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Focus Score</div>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: 'bold',
            color: focusScore >= 70 ? '#4CAF50' : focusScore >= 50 ? '#FFA500' : '#FF3030',
          }}>
            {focusScore}%
          </div>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 'bold',
            color: status.includes('Highly') || status.includes('Good') || status.includes('Studying') ? '#4CAF50' : 
                   status.includes('DROWSY') ? '#FF0000' : 
                   status.includes('Distracted') ? '#FF6347' : '#FFA500',
            marginTop: '8px'
          }}>
            {status}
          </div>
        </div>

        {/* pomodoro timer card */}
        <div style={{
          backgroundColor: currentTheme.card,
          padding: '12px',
          borderRadius: '8px',
          border: `1px solid ${currentTheme.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '5px' }}>
            {pomodoroMode === 'focus' ? 'Focus Timer' : 'Break Timer'}
          </div>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 'bold',
            color: pomodoroMode === 'focus' ? '#4CAF50' : '#FF9800',
          }}>
            {formatPomodoroTime(pomodoroTime)}
          </div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
            <button
              onClick={() => setPomodoroActive(!pomodoroActive)}
              style={{
                flex: 1,
                padding: '6px',
                backgroundColor: pomodoroActive ? '#f44336' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              {pomodoroActive ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={() => {
                setPomodoroTime(25 * 60);
                setPomodoroMode('focus');
                setPomodoroActive(false);
              }}
              style={{
                flex: 1,
                padding: '6px',
                backgroundColor: currentTheme.secondary,
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* daily goal card */}
        <div style={{
          backgroundColor: currentTheme.card,
          padding: '12px',
          borderRadius: '8px',
          border: `1px solid ${currentTheme.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: currentTheme.secondary }}>Daily Goal</span>
            <button
              onClick={() => setShowGoalSettings(!showGoalSettings)}
              style={{
                padding: '3px 8px',
                backgroundColor: currentTheme.bg,
                color: currentTheme.text,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Set
            </button>
          </div>
          
          {showGoalSettings && (
            <div style={{ marginBottom: '8px' }}>
              <input
                type="number"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Math.max(1, parseInt(e.target.value) || 120))}
                style={{
                  width: '100%',
                  padding: '4px',
                  borderRadius: '4px',
                  border: `1px solid ${currentTheme.border}`,
                  backgroundColor: currentTheme.bg,
                  color: currentTheme.text,
                  fontSize: '11px'
                }}
                min="1"
              />
            </div>
          )}
          
          <div style={{ 
            width: '100%', 
            height: '6px', 
            backgroundColor: currentTheme.border, 
            borderRadius: '3px',
            marginBottom: '6px'
          }}>
            <div style={{ 
              width: `${Math.min(100, (dailyProgress / dailyGoal) * 100)}%`, 
              height: '100%', 
              backgroundColor: dailyProgress >= dailyGoal ? '#4CAF50' : '#2196F3',
              borderRadius: '3px'
            }} />
          </div>
          <div style={{ fontSize: '11px', color: currentTheme.secondary, textAlign: 'center' }}>
            {dailyProgress}/{dailyGoal} min
          </div>
        </div>

        {/* streak card */}
        <div style={{
          backgroundColor: currentTheme.card,
          padding: '10px',
          borderRadius: '8px',
          border: `1px solid ${currentTheme.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Streak</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
            {streakCount}
          </div>
          <div style={{ fontSize: '10px', color: currentTheme.secondary }}>
            Best: {longestStreak} min
          </div>
        </div>

        {/* action buttons */}
        <div style={{
          backgroundColor: currentTheme.card,
          padding: '10px',
          borderRadius: '8px',
          border: `1px solid ${currentTheme.border}`,
          display: 'flex',
          gap: '6px'
        }}>
          <button
            onClick={() => setShowGraph(!showGraph)}
            style={{
              flex: 1,
              padding: '7px',
              backgroundColor: currentTheme.bg,
              color: currentTheme.text,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            {showGraph ? 'Hide Graph' : 'Show Graph'}
          </button>
          <button
            onClick={exportReport}
            style={{
              flex: 1,
              padding: '7px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Export
          </button>
          <button
            onClick={resetSession}
            style={{
              flex: 1,
              padding: '7px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* CENTER PANEL - CAMERA AND GRAPH */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        
        {/* alert banner */}
        {alert && (
          <div style={{
            backgroundColor: '#ff0000',
            color: 'white',
            padding: '8px 15px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            animation: 'pulse 1s infinite',
            boxShadow: '0 0 15px rgba(255,0,0,0.5)',
            width: '100%',
            textAlign: 'center'
          }}>
            {alert}
          </div>
        )}

        {/* break suggestion banner */}
        {breakSuggestion && !alert && (
          <div style={{
            backgroundColor: '#FF9800',
            color: 'white',
            padding: '8px 15px',
            borderRadius: '8px',
            fontSize: '13px',
            width: '100%',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            {breakSuggestion}
          </div>
        )}

        {/* webcam and canvas */}
        <div style={{ 
          position: 'relative', 
          width: '100%',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Webcam
            ref={webcamRef}
            style={{
              width: '100%',
              maxWidth: '720px',
              height: 'auto',
              aspectRatio: '4/3',
              borderRadius: '12px',
              border: alert ? '3px solid #ff0000' : `2px solid ${currentTheme.border}`,
              boxShadow: alert ? '0 0 20px rgba(255,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)'
            }}
            mirrored={true}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '12px',
            }}
          />
        </div>

        {/* focus graph */}
        {showGraph && (
          <div style={{
            backgroundColor: currentTheme.card,
            padding: '10px',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '720px',
            height: '160px',
            border: `1px solid ${currentTheme.border}`
          }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      {/* RIGHT PANEL - SESSION STATS */}
      <div style={{
        width: '180px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        
        {/* session stats card */}
        <div style={{
          backgroundColor: currentTheme.card,
          padding: '12px',
          borderRadius: '8px',
          border: `1px solid ${currentTheme.border}`,
        }}>
          <div style={{ fontSize: '12px', color: currentTheme.secondary, marginBottom: '12px', textAlign: 'center' }}>
            Session Stats
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Study Time</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: darkMode ? '#4CAF50' : '#2196F3' }}>
              {formatTime(studyTime)}
            </div>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Focused Time</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
              {formatTime(focusTime)}
            </div>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Focus Rate</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF9800' }}>
              {studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* ear value card */}
        <div style={{
          backgroundColor: currentTheme.card,
          padding: '10px',
          borderRadius: '8px',
          border: `1px solid ${currentTheme.border}`,
        }}>
          <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Eye Openness (EAR)</div>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold',
            color: ear < EAR_THRESHOLD ? '#FF0000' : '#4CAF50',
          }}>
            {ear.toFixed(3)}
          </div>
          <div style={{ fontSize: '9px', color: currentTheme.secondary, marginTop: '4px' }}>
            Threshold: {EAR_THRESHOLD}
          </div>
        </div>

        {/* drowsiness level card */}
        <div style={{
          backgroundColor: currentTheme.card,
          padding: '10px',
          borderRadius: '8px',
          border: `1px solid ${currentTheme.border}`,
        }}>
          <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Drowsiness Level</div>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold',
            color: drowsinessLevel > 30 ? '#FF0000' : '#4CAF50',
          }}>
            {drowsinessLevel}%
          </div>
        </div>

        {/* looking direction card */}
        <div style={{
          backgroundColor: currentTheme.card,
          padding: '10px',
          borderRadius: '8px',
          border: `1px solid ${currentTheme.border}`,
        }}>
          <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Looking Direction</div>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: lookingDirection === 'center' ? '#4CAF50' : 
                   lookingDirection === 'down' ? '#2196F3' : '#FF6347',
            textTransform: 'capitalize'
          }}>
            {lookingDirection}
          </div>
          <div style={{ fontSize: '9px', color: currentTheme.secondary, marginTop: '6px' }}>
            Yaw: {Math.round(headPose.yaw)}° | Pitch: {Math.round(headPose.pitch)}°
          </div>
        </div>
      </div>

      {/* animation styles */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.01); }
        }
      `}</style>
    </div>
  );
}

export default App; 

// // IMPORTS AND CHART.JS REGISTRATION

// import { FaceMesh } from "@mediapipe/face_mesh";
// import React, { useRef, useEffect, useState } from "react";
// import * as Facemesh from "@mediapipe/face_mesh";
// import * as cam from "@mediapipe/camera_utils";
// import Webcam from "react-webcam";
// import { Line } from 'react-chartjs-2';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// } from 'chart.js';
// import jsPDF from 'jspdf';

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// );

// // MAIN APP COMPONENT

// function App() {
  
//   // REFS
  
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const connect = window.drawConnectors;
//   var camera = null;

//   // STATE VARIABLES - CORE DETECTION

//   const [focusScore, setFocusScore] = useState(0);
//   const [status, setStatus] = useState("Initializing...");
//   const [drowsinessLevel, setDrowsinessLevel] = useState(0);
//   const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
//   const [ear, setEAR] = useState(0);
//   const [alert, setAlert] = useState("");
//   const [lookingDirection, setLookingDirection] = useState("center");

//   // STATE VARIABLES - SESSION TRACKING

//   const [studyTime, setStudyTime] = useState(0);
//   const [focusTime, setFocusTime] = useState(0);

//   // STATE VARIABLES - UI CONTROLS
//   const [darkMode, setDarkMode] = useState(true);
//   const [showGraph, setShowGraph] = useState(false);
//   const [focusHistoryData, setFocusHistoryData] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
//   const [timestamps, setTimestamps] = useState(['', '', '', '', '', '', '', '', '', '']);
  
//   // STATE VARIABLES - POMODORO TIMER
//   const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
//   const [pomodoroActive, setPomodoroActive] = useState(false);
//   const [pomodoroMode, setPomodoroMode] = useState('focus');
//   const [breakSuggestion, setBreakSuggestion] = useState("");
  
//   // STATE VARIABLES - FOCUS REMINDER
//   const [focusReminderEnabled, setFocusReminderEnabled] = useState(false);
//   const [reminderDelay, setReminderDelay] = useState(10);
  
//   // STATE VARIABLES - GOALS AND STREAKS
//   const [dailyGoal, setDailyGoal] = useState(120);
//   const [dailyProgress, setDailyProgress] = useState(0);
//   const [showGoalSettings, setShowGoalSettings] = useState(false);
//   const [streakCount, setStreakCount] = useState(0);
//   const [longestStreak, setLongestStreak] = useState(0);

//   // REFS FOR TRACKING - DETECTION STATE
//   const focusHistory = useRef([]);
//   const closedFrames = useRef(0);
//   const lookingAwayFrames = useRef(0);
//   const lookingDownFrames = useRef(0);
//   const lookingLeftFrames = useRef(0);
//   const lookingRightFrames = useRef(0);
//   const headDownWithEyesClosed = useRef(0);
//   const lastValidLandmarks = useRef(null);

//   // REFS FOR TIMERS
//   const studyTimerRef = useRef(null);
//   const focusTimerRef = useRef(null);
//   const pomodoroTimerRef = useRef(null);
//   const streakTimerRef = useRef(null);
//   const reminderTimerRef = useRef(null);
  
//   // REFS FOR AUDIO AND TRACKING
//   const currentStreakRef = useRef(0);
//   const audioContextRef = useRef(null);
//   const graphUpdateInterval = useRef(null);
//   const frameCountRef = useRef(0);
//   // CONSTANTS - FACIAL LANDMARK INDICES
  
//   const LEFT_EYE = [33, 160, 158, 133, 153, 144];
//   const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
//   const EAR_THRESHOLD = 0.23;
//   const DROWSY_FRAMES = 25;
//   const DISTRACTION_FRAMES = 30;
//   const LOOKING_DOWN_FRAMES = 45;

  
//   // THEME CONFIGURATION
  
//   const theme = {
//     dark: {
//       bg: '#0a0a0a',
//       card: '#1a1a1a',
//       text: '#ffffff',
//       secondary: '#888',
//       border: '#333'
//     },
//     light: {
//       bg: '#f5f5f5',
//       card: '#ffffff',
//       text: '#333333',
//       secondary: '#666',
//       border: '#ddd'
//     }
//   };

//   const currentTheme = darkMode ? theme.dark : theme.light;

  
//   // HANDLER FUNCTIONS
//   // ---------- CLOSE HANDLER ----------
//   const handleClose = () => {
//     if (camera) {
//       camera.stop();
//     }
//     if (studyTimerRef.current) clearInterval(studyTimerRef.current);
//     if (focusTimerRef.current) clearInterval(focusTimerRef.current);
//     if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current);
//     if (streakTimerRef.current) clearInterval(streakTimerRef.current);
//     if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
//     if (graphUpdateInterval.current) clearInterval(graphUpdateInterval.current);
    
//     // Navigate to home or previous page
//     window.location.href = '/';
//   };

//   // ---------- AUDIO FUNCTIONS ----------
//   const playFocusReminder = () => {
//     if (!focusReminderEnabled || !audioContextRef.current) return;
    
//     const ctx = audioContextRef.current;
//     const oscillator = ctx.createOscillator();
//     const gainNode = ctx.createGain();
    
//     oscillator.connect(gainNode);
//     gainNode.connect(ctx.destination);
    
//     oscillator.frequency.value = 660;
//     gainNode.gain.value = 0.08;
//     oscillator.type = 'sine';
    
//     oscillator.start();
    
//     setTimeout(() => {
//       const osc2 = ctx.createOscillator();
//       const gain2 = ctx.createGain();
//       osc2.connect(gain2);
//       gain2.connect(ctx.destination);
//       osc2.frequency.value = 880;
//       gain2.gain.value = 0.08;
//       osc2.type = 'sine';
//       osc2.start();
//       gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
//       osc2.stop(ctx.currentTime + 0.5);
//     }, 100);
    
//     gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
//     oscillator.stop(ctx.currentTime + 0.5);
//   };

//   const initAudio = () => {
//     if (!audioContextRef.current) {
//       audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
//     }
//     if (audioContextRef.current.state === 'suspended') {
//       audioContextRef.current.resume();
//     }
//   };

//   const toggleFocusReminder = () => {
//     if (!focusReminderEnabled) {
//       initAudio();
//     }
//     setFocusReminderEnabled(!focusReminderEnabled);
//   };

//   // ---------- RESET SESSION ----------
//   const resetSession = () => {
//     setStudyTime(0);
//     setFocusTime(0);
//     setFocusHistoryData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
//     setTimestamps(['', '', '', '', '', '', '', '', '', '']);
//     focusHistory.current = [];
//     setPomodoroTime(25 * 60);
//     setPomodoroActive(false);
//     setPomodoroMode('focus');
//     setBreakSuggestion("");
//     setLookingDirection("center");
//     lookingLeftFrames.current = 0;
//     lookingRightFrames.current = 0;
//     lookingDownFrames.current = 0;
//     closedFrames.current = 0;
//     frameCountRef.current = 0;
//   };

//   // ---------- FORMAT TIME ----------
//   const formatTime = (seconds) => {
//     const hours = Math.floor(seconds / 3600);
//     const mins = Math.floor((seconds % 3600) / 60);
//     const secs = seconds % 60;
//     if (hours > 0) {
//       return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//     }
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const formatPomodoroTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   // ---------- EXPORT REPORT ----------
//   const exportReport = () => {
//     const doc = new jsPDF();
//     const date = new Date().toLocaleString();
    
//     doc.setFillColor(41, 128, 185);
//     doc.rect(0, 0, 210, 40, 'F');
//     doc.setTextColor(255, 255, 255);
//     doc.setFontSize(24);
//     doc.setFont('helvetica', 'bold');
//     doc.text('FocusGuard Study Report', 105, 25, { align: 'center' });
    
//     doc.setTextColor(0, 0, 0);
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Generated: ${date}`, 105, 45, { align: 'center' });
    
//     doc.setFillColor(240, 240, 240);
//     doc.rect(10, 55, 190, 50, 'F');
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Session Summary', 15, 70);
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Total Study Time: ${formatTime(studyTime)}`, 20, 85);
//     doc.text(`Focused Time: ${formatTime(focusTime)}`, 100, 85);
//     doc.text(`Focus Rate: ${studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%`, 20, 95);
    
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Performance Metrics', 15, 120);
    
//     const avgScore = focusHistoryData.filter(s => s > 0).length > 0 ? 
//       Math.round(focusHistoryData.filter(s => s > 0).reduce((a, b) => a + b, 0) / focusHistoryData.filter(s => s > 0).length) : 0;
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Average Focus Score: ${avgScore}%`, 20, 135);
//     doc.text(`Peak Focus Score: ${focusHistoryData.length > 0 ? Math.max(...focusHistoryData) : 0}%`, 100, 135);
//     doc.text(`Longest Focus Streak: ${longestStreak} minutes`, 20, 145);
//     doc.text(`Daily Goal Progress: ${dailyProgress}/${dailyGoal} minutes`, 100, 145);
    
//     doc.save(`focusguard-report-${new Date().toISOString().split('T')[0]}.pdf`);
//   };

//   // ============================================
//   // CALCULATION FUNCTIONS
//   // ============================================
  
//   // ---------- EUCLIDEAN DISTANCE ----------
//   const euclideanDist = (p1, p2) => {
//     return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
//   };

//   // ---------- EYE ASPECT RATIO ----------
//   const calculateEAR = (eye) => {
//     const A = euclideanDist(eye[1], eye[5]);
//     const B = euclideanDist(eye[2], eye[4]);
//     const C = euclideanDist(eye[0], eye[3]);
//     return (A + B) / (2.0 * C);
//   };

//   // ---------- HEAD POSE ESTIMATION ----------
//   const calculateHeadPose = (landmarks) => {
//     const noseTip = landmarks[1];
//     const leftEye = landmarks[33];
//     const rightEye = landmarks[263];
//     const chin = landmarks[152];

//     const faceCenter = {
//       x: (leftEye.x + rightEye.x) / 2,
//       y: (leftEye.y + rightEye.y) / 2
//     };
//     const noseOffset = noseTip.x - faceCenter.x;
//     const eyeDistance = Math.abs(rightEye.x - leftEye.x);
//     const yaw = (noseOffset / eyeDistance) * 90;

//     const noseToChin = chin.y - noseTip.y;
//     const eyeToNose = noseTip.y - faceCenter.y;
//     const pitch = (eyeToNose / noseToChin) * 60 - 30;

//     const eyeYDiff = rightEye.y - leftEye.y;
//     const eyeXDiff = rightEye.x - leftEye.x;
//     const roll = Math.atan2(eyeYDiff, eyeXDiff) * (180 / Math.PI);

//     return { yaw, pitch, roll };
//   };

//   // ---------- FOCUS SCORE CALCULATION ----------
//   const calculateFocusScore = (landmarks, earValue, pose) => {
//     if (!landmarks || landmarks.length === 0) return 0;

//     let score = 100;

//     if (pose.yaw > 20) {
//       lookingRightFrames.current += 1;
//       lookingLeftFrames.current = Math.max(0, lookingLeftFrames.current - 1);
//     } else if (pose.yaw < -20) {
//       lookingLeftFrames.current += 1;
//       lookingRightFrames.current = Math.max(0, lookingRightFrames.current - 1);
//     } else {
//       lookingLeftFrames.current = Math.max(0, lookingLeftFrames.current - 2);
//       lookingRightFrames.current = Math.max(0, lookingRightFrames.current - 2);
//     }

//     if (pose.pitch > 25 && Math.abs(pose.yaw) < 25) {
//       lookingDownFrames.current += 1;
//     } else {
//       lookingDownFrames.current = Math.max(0, lookingDownFrames.current - 1);
//     }

//     if (lookingLeftFrames.current > DISTRACTION_FRAMES || lookingRightFrames.current > DISTRACTION_FRAMES) {
//       score -= 45;
//     } else if (lookingLeftFrames.current > DISTRACTION_FRAMES / 2 || lookingRightFrames.current > DISTRACTION_FRAMES / 2) {
//       score -= 25;
//     } else if (lookingLeftFrames.current > 8 || lookingRightFrames.current > 8) {
//       score -= 10;
//     }

//     if (lookingDownFrames.current > LOOKING_DOWN_FRAMES && earValue >= EAR_THRESHOLD) {
//       score -= 15;
//     }

//     if (earValue < EAR_THRESHOLD) {
//       if (closedFrames.current > DROWSY_FRAMES / 2) {
//         score -= 40;
//       } else {
//         score -= 20;
//       }
//     }

//     if (Math.abs(pose.roll) > 25) {
//       score -= 10;
//     }

//     const nose = landmarks[1];
//     const centerOffset = Math.abs(nose.x - 0.5);
//     if (centerOffset > 0.3) score -= 10;
//     else if (centerOffset > 0.2) score -= 5;

//     return Math.max(0, Math.min(100, Math.round(score)));
//   };

//   // ---------- STATUS AND DIRECTION UPDATE ----------
//   const updateStatusAndDirection = (score, earValue, pose) => {
//     if (pose.yaw > 20) {
//       setLookingDirection("right");
//     } else if (pose.yaw < -20) {
//       setLookingDirection("left");
//     } else if (pose.pitch > 25) {
//       setLookingDirection("down");
//     } else {
//       setLookingDirection("center");
//     }

//     const headDown = pose.pitch > 20;
    
//     if (headDown && earValue < EAR_THRESHOLD) {
//       headDownWithEyesClosed.current += 1;
//     } else {
//       headDownWithEyesClosed.current = 0;
//     }

//     const isDrowsy = headDownWithEyesClosed.current >= 15 || 
//                     (earValue < EAR_THRESHOLD && closedFrames.current >= DROWSY_FRAMES);

//     if (isDrowsy) {
//       setAlert("DROWSINESS DETECTED! WAKE UP!");
//       setStatus("DROWSY - NEEDS REST");
//       return;
//     }

//     setAlert("");

//     if (lookingLeftFrames.current > DISTRACTION_FRAMES) {
//       setStatus("Distracted - Looking Left");
//     } else if (lookingRightFrames.current > DISTRACTION_FRAMES) {
//       setStatus("Distracted - Looking Right");
//     } else if (lookingDownFrames.current > LOOKING_DOWN_FRAMES) {
//       if (earValue < EAR_THRESHOLD) {
//         setStatus("Drowsy - Head Down with Eyes Closed");
//       } else {
//         setStatus("Studying - Reading/Writing");
//       }
//     } else if (pose.pitch > 25 && earValue >= EAR_THRESHOLD) {
//       setStatus("Studying - Looking at Desk");
//     } else if (score >= 80) {
//       setStatus("Highly Focused - Great Job!");
//     } else if (score >= 65) {
//       setStatus("Good Focus");
//     } else if (score >= 50) {
//       setStatus("Slightly Distracted");
//     } else if (score >= 30) {
//       setStatus("Distracted - Try to Focus");
//     } else {
//       setStatus("Not Focused");
//     }
//   };

//   // ============================================
//   // MEDIAPIPE ON RESULTS CALLBACK
//   // ============================================
//   function onResults(results) {
//     const videoWidth = webcamRef.current.video.videoWidth;
//     const videoHeight = webcamRef.current.video.videoHeight;

//     canvasRef.current.width = videoWidth;
//     canvasRef.current.height = videoHeight;

//     const canvasElement = canvasRef.current;
//     const canvasCtx = canvasElement.getContext("2d");
//     canvasCtx.save();
//     canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
//     canvasCtx.drawImage(
//       results.image,
//       0,
//       0,
//       canvasElement.width,
//       canvasElement.height
//     );

//     if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
//       const landmarks = results.multiFaceLandmarks[0];
//       lastValidLandmarks.current = landmarks;

//       const leftEyePoints = LEFT_EYE.map(idx => landmarks[idx]);
//       const rightEyePoints = RIGHT_EYE.map(idx => landmarks[idx]);

//       const leftEAR = calculateEAR(leftEyePoints);
//       const rightEAR = calculateEAR(rightEyePoints);
//       const earValue = (leftEAR + rightEAR) / 2.0;
//       setEAR(earValue);

//       if (earValue < EAR_THRESHOLD) {
//         closedFrames.current += 1;
//       } else {
//         closedFrames.current = Math.max(0, closedFrames.current - 1);
//       }

//       const drowsiness = Math.max(0, Math.min(100, 
//         (EAR_THRESHOLD - earValue) * 400 + (closedFrames.current / DROWSY_FRAMES) * 50
//       ));
//       setDrowsinessLevel(Math.round(drowsiness));

//       const pose = calculateHeadPose(landmarks);
//       setHeadPose(pose);

//       const currentScore = calculateFocusScore(landmarks, earValue, pose);

//       focusHistory.current.push(currentScore);
//       if (focusHistory.current.length > 15) {
//         focusHistory.current.shift();
//       }
      
//       const weights = focusHistory.current.map((_, i) => (i + 1) / focusHistory.current.length);
//       const weightedSum = focusHistory.current.reduce((sum, score, i) => sum + score * weights[i], 0);
//       const weightSum = weights.reduce((a, b) => a + b, 0);
//       const smoothedScore = Math.round(weightedSum / weightSum);
      
//       setFocusScore(smoothedScore);

//       updateStatusAndDirection(smoothedScore, earValue, pose);

//       // Update graph data every 30 frames (about 1 second at 30fps)
//       frameCountRef.current += 1;
//       if (frameCountRef.current >= 30) {
//         frameCountRef.current = 0;
//         const now = new Date();
//         const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
//         setFocusHistoryData(prev => {
//           const newData = [...prev.slice(1), smoothedScore];
//           return newData;
//         });
//         setTimestamps(prev => {
//           const newTimes = [...prev.slice(1), timeStr];
//           return newTimes;
//         });
//       }

//       const meshColor = alert ? "#FF0000" : 
//         (smoothedScore >= 70 ? "#30FF30" : 
//          smoothedScore >= 50 ? "#FFA500" : "#FF6347");
      
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_TESSELATION, {
//         color: meshColor + "70",
//         lineWidth: 1,
//       });

//       const eyeColor = earValue < EAR_THRESHOLD ? "#FF0000" : "#00FF00";
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, { color: "#FF3030" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, { color: "#30FF30" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, { color: "#E0E0E0" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, { color: "#E0E0E0" });

//       [leftEyePoints, rightEyePoints].forEach(eyePoints => {
//         canvasCtx.beginPath();
//         eyePoints.forEach((point, i) => {
//           const x = point.x * canvasElement.width;
//           const y = point.y * canvasElement.height;
//           if (i === 0) canvasCtx.moveTo(x, y);
//           else canvasCtx.lineTo(x, y);
//         });
//         canvasCtx.closePath();
//         canvasCtx.strokeStyle = eyeColor;
//         canvasCtx.lineWidth = 2;
//         canvasCtx.stroke();
//       });

//       const nose = landmarks[1];
//       const arrowX = nose.x * canvasElement.width;
//       const arrowY = nose.y * canvasElement.height;
      
//       canvasCtx.beginPath();
//       canvasCtx.arc(arrowX, arrowY, 6, 0, 2 * Math.PI);
//       canvasCtx.fillStyle = smoothedScore >= 70 ? "#30FF30" : 
//                            smoothedScore >= 50 ? "#FFA500" : "#FF3030";
//       canvasCtx.fill();

//       canvasCtx.beginPath();
//       canvasCtx.moveTo(arrowX, arrowY);
//       let dirX = arrowX;
//       let dirY = arrowY;
      
//       if (lookingDirection === "left") {
//         dirX -= 40;
//       } else if (lookingDirection === "right") {
//         dirX += 40;
//       } else if (lookingDirection === "down") {
//         dirY += 40;
//       } else {
//         dirY -= 20;
//       }
      
//       canvasCtx.lineTo(dirX, dirY);
//       canvasCtx.strokeStyle = "#FFD700";
//       canvasCtx.lineWidth = 3;
//       canvasCtx.stroke();

//       canvasCtx.font = '14px Arial';
//       canvasCtx.fillStyle = '#FFFFFF';
//       canvasCtx.fillText(status, 10, 30);

//     } else {
//       setFocusScore(0);
//       setStatus("No Face Detected");
//       setDrowsinessLevel(0);
//       setEAR(0);
//       setHeadPose({ yaw: 0, pitch: 0, roll: 0 });
//       setLookingDirection("center");
//       closedFrames.current = 0;
//       lookingLeftFrames.current = 0;
//       lookingRightFrames.current = 0;
//       lookingDownFrames.current = 0;
//     }

//     canvasCtx.restore();
//   }

//   // CHART CONFIGURATION

//   const chartData = {
//     labels: timestamps,
//     datasets: [
//       {
//         label: 'Focus Score',
//         data: focusHistoryData,
//         borderColor: darkMode ? '#4CAF50' : '#2196F3',
//         backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(33, 150, 243, 0.15)',
//         fill: true,
//         tension: 0.4,
//         pointRadius: 4,
//         pointHoverRadius: 6,
//         borderWidth: 2.5,
//       },
//       {
//         label: 'Threshold (50%)',
//         data: Array(timestamps.length).fill(50),
//         borderColor: '#FFA500',
//         borderDash: [5, 5],
//         borderWidth: 1.5,
//         fill: false,
//         pointRadius: 0,
//       }
//     ],
//   };

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: {
//       legend: {
//         labels: {
//           color: currentTheme.text,
//           font: { size: 11 }
//         },
//       },
//       title: {
//         display: true,
//         text: 'Focus Score Timeline',
//         color: currentTheme.text,
//         font: { size: 13, weight: 'bold' }
//       },
//     },
//     scales: {
//       y: {
//         min: 0,
//         max: 100,
//         grid: { color: currentTheme.border },
//         ticks: { color: currentTheme.text, font: { size: 10 } },
//         title: { display: true, text: 'Score (%)', color: currentTheme.text, font: { size: 11 } }
//       },
//       x: {
//         grid: { color: currentTheme.border },
//         ticks: { color: currentTheme.text, font: { size: 9 }, maxRotation: 45 },
//         title: { display: true, text: 'Time', color: currentTheme.text, font: { size: 11 } }
//       },
//     },
//   };

//   // ============================================
//   // USE EFFECTS
//   // ============================================
  
//   // ---------- FOCUS REMINDER EFFECT ----------
//   useEffect(() => {
//     if (focusReminderEnabled && focusScore < 50) {
//       if (!reminderTimerRef.current) {
//         reminderTimerRef.current = setTimeout(() => {
//           playFocusReminder();
//           reminderTimerRef.current = null;
//         }, reminderDelay * 1000);
//       }
//     } else {
//       if (reminderTimerRef.current) {
//         clearTimeout(reminderTimerRef.current);
//         reminderTimerRef.current = null;
//       }
//     }
    
//     return () => {
//       if (reminderTimerRef.current) {
//         clearTimeout(reminderTimerRef.current);
//       }
//     };
//   }, [focusScore, focusReminderEnabled, reminderDelay]);

//   // ---------- LOCAL STORAGE LOAD ----------
//   useEffect(() => {
//     const savedGoal = localStorage.getItem('dailyFocusGoal');
//     const savedProgress = localStorage.getItem('dailyProgress');
//     const savedStreak = localStorage.getItem('longestStreak');
//     const today = new Date().toDateString();
//     const savedDate = localStorage.getItem('progressDate');
    
//     if (savedGoal) setDailyGoal(parseInt(savedGoal));
//     if (savedStreak) setLongestStreak(parseInt(savedStreak));
    
//     if (savedDate === today) {
//       if (savedProgress) setDailyProgress(parseInt(savedProgress));
//     } else {
//       localStorage.setItem('progressDate', today);
//       localStorage.setItem('dailyProgress', '0');
//       setDailyProgress(0);
//     }
//   }, []);

//   // ---------- LOCAL STORAGE SAVE ----------
//   useEffect(() => {
//     localStorage.setItem('dailyProgress', dailyProgress.toString());
//     localStorage.setItem('dailyGoal', dailyGoal.toString());
//     localStorage.setItem('longestStreak', longestStreak.toString());
//   }, [dailyProgress, dailyGoal, longestStreak]);

//   // ---------- STREAK TRACKER ----------
//   useEffect(() => {
//     streakTimerRef.current = setInterval(() => {
//       if (focusScore >= 70) {
//         currentStreakRef.current += 1;
//         setStreakCount(currentStreakRef.current);
//         if (currentStreakRef.current > longestStreak) {
//           setLongestStreak(currentStreakRef.current);
//         }
//       } else {
//         currentStreakRef.current = 0;
//         setStreakCount(0);
//       }
//     }, 60000);
    
//     return () => clearInterval(streakTimerRef.current);
//   }, [focusScore, longestStreak]);

//   // ---------- POMODORO TIMER ----------
//   useEffect(() => {
//     if (pomodoroActive) {
//       pomodoroTimerRef.current = setInterval(() => {
//         setPomodoroTime(prev => {
//           if (prev <= 1) {
//             if (pomodoroMode === 'focus') {
//               setPomodoroMode('break');
//               setBreakSuggestion("Time for a 5-minute break!");
//               return 5 * 60;
//             } else {
//               setPomodoroMode('focus');
//               setBreakSuggestion("");
//               setPomodoroActive(false);
//               return 25 * 60;
//             }
//           }
//           return prev - 1;
//         });
//       }, 1000);
//     } else if (pomodoroTimerRef.current) {
//       clearInterval(pomodoroTimerRef.current);
//     }
    
//     return () => {
//       if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current);
//     };
//   }, [pomodoroActive, pomodoroMode]);

//   // ---------- BREAK SUGGESTION ----------
//   useEffect(() => {
//     if (focusHistory.current.length >= 30) {
//       const recentScores = focusHistory.current.slice(-30);
//       const avgRecent = recentScores.reduce((a, b) => a + b, 0) / 30;
      
//       if (avgRecent < 45 && studyTime > 1800) {
//         setBreakSuggestion("Focus dropping. Consider taking a short break.");
//       }
//     }
//   }, [focusScore, studyTime]);

//   // ---------- DAILY PROGRESS UPDATE ----------
//   useEffect(() => {
//     const focusedMinutes = Math.floor(focusTime / 60);
//     setDailyProgress(focusedMinutes);
//   }, [focusTime]);

//   // ---------- STUDY AND FOCUS TIMERS ----------
//   useEffect(() => {
//     studyTimerRef.current = setInterval(() => {
//       setStudyTime(prev => prev + 1);
//     }, 1000);

//     focusTimerRef.current = setInterval(() => {
//       if (focusScore >= 50) {
//         setFocusTime(prev => prev + 1);
//       }
//     }, 1000);

//     return () => {
//       clearInterval(studyTimerRef.current);
//       clearInterval(focusTimerRef.current);
//     };
//   }, [focusScore]);

//   // ---------- MEDIAPIPE INITIALIZATION ----------
//   useEffect(() => {
//     const faceMesh = new FaceMesh({
//       locateFile: (file) => {
//         return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
//       },
//     });

//     faceMesh.setOptions({
//       maxNumFaces: 1,
//       minDetectionConfidence: 0.5,
//       minTrackingConfidence: 0.5,
//       refineLandmarks: true,
//     });

//     faceMesh.onResults(onResults);

//     if (
//       typeof webcamRef.current !== "undefined" &&
//       webcamRef.current !== null
//     ) {
//       camera = new cam.Camera(webcamRef.current.video, {
//         onFrame: async () => {
//           await faceMesh.send({ image: webcamRef.current.video });
//         },
//         width: 640,
//         height: 480,
//       });
//       camera.start();
//     }

//     return () => {
//       if (camera) {
//         camera.stop();
//       }
//     };
//   }, []);

//   // RENDER

//   return (
//     <div style={{ 
//       display: 'flex', 
//       backgroundColor: currentTheme.bg,
//       minHeight: '100vh',
//       color: currentTheme.text,
//       padding: '12px',
//       transition: 'all 0.3s ease',
//       gap: '12px'
//     }}>
      
//       {/* ============================================ */}
//       {/* LEFT PANEL - CONTROLS AND STATS */}
//       {/* ============================================ */}
//       <div style={{
//         width: '260px',
//         display: 'flex',
//         flexDirection: 'column',
//         gap: '10px'
//       }}>
        
//         {/* ---------- HEADER WITH CLOSE BUTTON ---------- */}
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//           <h1 style={{ 
//             color: darkMode ? '#4CAF50' : '#2196F3',
//             fontSize: '20px',
//             margin: '0'
//           }}>
//             FocusGuard
//           </h1>
//           <button
//             onClick={handleClose}
//             style={{
//               padding: '5px 12px',
//               backgroundColor: '#dc3545',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '12px',
//               fontWeight: 'bold'
//             }}
//           >
//             Close
//           </button>
//         </div>

//         {/* ---------- THEME AND REMINDER CONTROLS ---------- */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`
//         }}>
//           <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
//             <button
//               onClick={() => setDarkMode(!darkMode)}
//               style={{
//                 flex: 1,
//                 padding: '7px',
//                 backgroundColor: currentTheme.bg,
//                 color: currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '12px'
//               }}
//             >
//               {darkMode ? 'Light' : 'Dark'}
//             </button>
//             <button
//               onClick={toggleFocusReminder}
//               style={{
//                 flex: 1,
//                 padding: '7px',
//                 backgroundColor: focusReminderEnabled ? '#4CAF50' : currentTheme.bg,
//                 color: focusReminderEnabled ? 'white' : currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '12px'
//               }}
//             >
//               {focusReminderEnabled ? 'Reminder On' : 'Reminder Off'}
//             </button>
//           </div>
          
//           {focusReminderEnabled && (
//             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <span style={{ fontSize: '11px', color: currentTheme.secondary }}>Delay:</span>
//               <input
//                 type="range"
//                 min="5"
//                 max="60"
//                 value={reminderDelay}
//                 onChange={(e) => setReminderDelay(parseInt(e.target.value))}
//                 style={{ flex: 1 }}
//               />
//               <span style={{ fontSize: '11px', color: currentTheme.text, minWidth: '35px' }}>
//                 {reminderDelay}s
//               </span>
//             </div>
//           )}
//         </div>

//         {/* ---------- FOCUS SCORE CARD ---------- */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Focus Score</div>
//           <div style={{ 
//             fontSize: '48px', 
//             fontWeight: 'bold',
//             color: focusScore >= 70 ? '#4CAF50' : focusScore >= 50 ? '#FFA500' : '#FF3030',
//           }}>
//             {focusScore}%
//           </div>
//           <div style={{ 
//             fontSize: '12px', 
//             fontWeight: 'bold',
//             color: status.includes('Highly') || status.includes('Good') || status.includes('Studying') ? '#4CAF50' : 
//                    status.includes('DROWSY') ? '#FF0000' : 
//                    status.includes('Distracted') ? '#FF6347' : '#FFA500',
//             marginTop: '8px'
//           }}>
//             {status}
//           </div>
//         </div>

//         {/* ---------- POMODORO TIMER CARD ---------- */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '5px' }}>
//             {pomodoroMode === 'focus' ? 'Focus Timer' : 'Break Timer'}
//           </div>
//           <div style={{ 
//             fontSize: '32px', 
//             fontWeight: 'bold',
//             color: pomodoroMode === 'focus' ? '#4CAF50' : '#FF9800',
//           }}>
//             {formatPomodoroTime(pomodoroTime)}
//           </div>
//           <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
//             <button
//               onClick={() => setPomodoroActive(!pomodoroActive)}
//               style={{
//                 flex: 1,
//                 padding: '6px',
//                 backgroundColor: pomodoroActive ? '#f44336' : '#4CAF50',
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '11px'
//               }}
//             >
//               {pomodoroActive ? 'Pause' : 'Start'}
//             </button>
//             <button
//               onClick={() => {
//                 setPomodoroTime(25 * 60);
//                 setPomodoroMode('focus');
//                 setPomodoroActive(false);
//               }}
//               style={{
//                 flex: 1,
//                 padding: '6px',
//                 backgroundColor: currentTheme.secondary,
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '11px'
//               }}
//             >
//               Reset
//             </button>
//           </div>
//         </div>

//         {/* ---------- DAILY GOAL CARD ---------- */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
//             <span style={{ fontSize: '12px', color: currentTheme.secondary }}>Daily Goal</span>
//             <button
//               onClick={() => setShowGoalSettings(!showGoalSettings)}
//               style={{
//                 padding: '3px 8px',
//                 backgroundColor: currentTheme.bg,
//                 color: currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '4px',
//                 cursor: 'pointer',
//                 fontSize: '10px'
//               }}
//             >
//               Set
//             </button>
//           </div>
          
//           {showGoalSettings && (
//             <div style={{ marginBottom: '8px' }}>
//               <input
//                 type="number"
//                 value={dailyGoal}
//                 onChange={(e) => setDailyGoal(Math.max(1, parseInt(e.target.value) || 120))}
//                 style={{
//                   width: '100%',
//                   padding: '4px',
//                   borderRadius: '4px',
//                   border: `1px solid ${currentTheme.border}`,
//                   backgroundColor: currentTheme.bg,
//                   color: currentTheme.text,
//                   fontSize: '11px'
//                 }}
//                 min="1"
//               />
//             </div>
//           )}
          
//           <div style={{ 
//             width: '100%', 
//             height: '6px', 
//             backgroundColor: currentTheme.border, 
//             borderRadius: '3px',
//             marginBottom: '6px'
//           }}>
//             <div style={{ 
//               width: `${Math.min(100, (dailyProgress / dailyGoal) * 100)}%`, 
//               height: '100%', 
//               backgroundColor: dailyProgress >= dailyGoal ? '#4CAF50' : '#2196F3',
//               borderRadius: '3px'
//             }} />
//           </div>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, textAlign: 'center' }}>
//             {dailyProgress}/{dailyGoal} min
//           </div>
//         </div>

//         {/* ---------- STREAK CARD ---------- */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Streak</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
//             {streakCount}
//           </div>
//           <div style={{ fontSize: '10px', color: currentTheme.secondary }}>
//             Best: {longestStreak} min
//           </div>
//         </div>

//         {/* ---------- ACTION BUTTONS ---------- */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           display: 'flex',
//           gap: '6px'
//         }}>
//           <button
//             onClick={() => setShowGraph(!showGraph)}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: currentTheme.bg,
//               color: currentTheme.text,
//               border: `1px solid ${currentTheme.border}`,
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             {showGraph ? 'Hide Graph' : 'Show Graph'}
//           </button>
//           <button
//             onClick={exportReport}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: '#4CAF50',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             Export
//           </button>
//           <button
//             onClick={resetSession}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: '#f44336',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             Reset
//           </button>
//         </div>
//       </div>

//       {/* CENTER PANEL - CAMERA AND GRAPH */}
//       <div style={{
//         flex: 1,
//         display: 'flex',
//         flexDirection: 'column',
//         alignItems: 'center',
//         gap: '8px'
//       }}>
        
//         {/* ---------- ALERT BANNER ---------- */}
//         {alert && (
//           <div style={{
//             backgroundColor: '#ff0000',
//             color: 'white',
//             padding: '8px 15px',
//             borderRadius: '8px',
//             fontSize: '14px',
//             fontWeight: 'bold',
//             animation: 'pulse 1s infinite',
//             boxShadow: '0 0 15px rgba(255,0,0,0.5)',
//             width: '100%',
//             textAlign: 'center'
//           }}>
//             {alert}
//           </div>
//         )}

//         {/* ---------- BREAK SUGGESTION BANNER ---------- */}
//         {breakSuggestion && !alert && (
//           <div style={{
//             backgroundColor: '#FF9800',
//             color: 'white',
//             padding: '8px 15px',
//             borderRadius: '8px',
//             fontSize: '13px',
//             width: '100%',
//             textAlign: 'center',
//             fontWeight: 'bold'
//           }}>
//             {breakSuggestion}
//           </div>
//         )}

//         {/* ---------- WEBCAM AND CANVAS ---------- */}
//         <div style={{ 
//           position: 'relative', 
//           width: '100%',
//           display: 'flex',
//           justifyContent: 'center'
//         }}>
//           <Webcam
//             ref={webcamRef}
//             style={{
//               width: '100%',
//               maxWidth: '720px',
//               height: 'auto',
//               aspectRatio: '4/3',
//               borderRadius: '12px',
//               border: alert ? '3px solid #ff0000' : `2px solid ${currentTheme.border}`,
//               boxShadow: alert ? '0 0 20px rgba(255,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)'
//             }}
//             mirrored={true}
//           />
//           <canvas
//             ref={canvasRef}
//             style={{
//               position: "absolute",
//               top: 0,
//               left: 0,
//               width: '100%',
//               height: '100%',
//               borderRadius: '12px',
//             }}
//           />
//         </div>

//         {/* ---------- FOCUS GRAPH ---------- */}
//         {showGraph && (
//           <div style={{
//             backgroundColor: currentTheme.card,
//             padding: '10px',
//             borderRadius: '10px',
//             width: '100%',
//             maxWidth: '720px',
//             height: '160px',
//             border: `1px solid ${currentTheme.border}`
//           }}>
//             <Line data={chartData} options={chartOptions} />
//           </div>
//         )}
//       </div>

//       {/* RIGHT PANEL - SESSION STATS */}
//       <div style={{
//         width: '180px',
//         display: 'flex',
//         flexDirection: 'column',
//         gap: '10px'
//       }}>
        
//         {/* ---------- SESSION STATS CARD ---------- */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary, marginBottom: '12px', textAlign: 'center' }}>
//             Session Stats
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Study Time</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: darkMode ? '#4CAF50' : '#2196F3' }}>
//               {formatTime(studyTime)}
//             </div>
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Focused Time</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
//               {formatTime(focusTime)}
//             </div>
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Focus Rate</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF9800' }}>
//               {studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%
//             </div>
//           </div>
//         </div>

//         {/* ---------- EAR VALUE CARD ---------- */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Eye Openness (EAR)</div>
//           <div style={{ 
//             fontSize: '18px', 
//             fontWeight: 'bold',
//             color: ear < EAR_THRESHOLD ? '#FF0000' : '#4CAF50',
//           }}>
//             {ear.toFixed(3)}
//           </div>
//           <div style={{ fontSize: '9px', color: currentTheme.secondary, marginTop: '4px' }}>
//             Threshold: {EAR_THRESHOLD}
//           </div>
//         </div>

//         {/* ---------- DROWSINESS LEVEL CARD ---------- */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Drowsiness Level</div>
//           <div style={{ 
//             fontSize: '18px', 
//             fontWeight: 'bold',
//             color: drowsinessLevel > 30 ? '#FF0000' : '#4CAF50',
//           }}>
//             {drowsinessLevel}%
//           </div>
//         </div>

//         {/* ---------- LOOKING DIRECTION CARD ---------- */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Looking Direction</div>
//           <div style={{ 
//             fontSize: '16px', 
//             fontWeight: 'bold',
//             color: lookingDirection === 'center' ? '#4CAF50' : 
//                    lookingDirection === 'down' ? '#2196F3' : '#FF6347',
//             textTransform: 'capitalize'
//           }}>
//             {lookingDirection}
//           </div>
//           <div style={{ fontSize: '9px', color: currentTheme.secondary, marginTop: '6px' }}>
//             Yaw: {Math.round(headPose.yaw)}° | Pitch: {Math.round(headPose.pitch)}°
//           </div>
//         </div>
//       </div>

//       {/* ANIMATION STYLES */}
//       <style jsx>{`
//         @keyframes pulse {
//           0%, 100% { opacity: 1; transform: scale(1); }
//           50% { opacity: 0.8; transform: scale(1.01); }
//         }
//       `}</style>
//     </div>
//   );
// }

// export default App;

// import { FaceMesh } from "@mediapipe/face_mesh";
// import React, { useRef, useEffect, useState } from "react";
// import * as Facemesh from "@mediapipe/face_mesh";
// import * as cam from "@mediapipe/camera_utils";
// import Webcam from "react-webcam";
// import { Line } from 'react-chartjs-2';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// } from 'chart.js';
// import jsPDF from 'jspdf';

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// );

// function App() {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const connect = window.drawConnectors;
//   var camera = null;

//   const [focusScore, setFocusScore] = useState(0);
//   const [status, setStatus] = useState("Initializing...");
//   const [drowsinessLevel, setDrowsinessLevel] = useState(0);
//   const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
//   const [ear, setEAR] = useState(0);
//   const [alert, setAlert] = useState("");
//   const [studyTime, setStudyTime] = useState(0);
//   const [focusTime, setFocusTime] = useState(0);
//   const [darkMode, setDarkMode] = useState(true);
//   const [showGraph, setShowGraph] = useState(false);
//   const [focusHistoryData, setFocusHistoryData] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
//   const [timestamps, setTimestamps] = useState(['', '', '', '', '', '', '', '', '', '']);
  
//   const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
//   const [pomodoroActive, setPomodoroActive] = useState(false);
//   const [pomodoroMode, setPomodoroMode] = useState('focus');
//   const [breakSuggestion, setBreakSuggestion] = useState("");
//   const [focusReminderEnabled, setFocusReminderEnabled] = useState(false);
//   const [reminderDelay, setReminderDelay] = useState(10);
//   const [dailyGoal, setDailyGoal] = useState(120);
//   const [dailyProgress, setDailyProgress] = useState(0);
//   const [showGoalSettings, setShowGoalSettings] = useState(false);
//   const [streakCount, setStreakCount] = useState(0);
//   const [longestStreak, setLongestStreak] = useState(0);
//   const [lookingDirection, setLookingDirection] = useState("center");

//   const focusHistory = useRef([]);
//   const closedFrames = useRef(0);
//   const lookingAwayFrames = useRef(0);
//   const lookingDownFrames = useRef(0);
//   const lookingLeftFrames = useRef(0);
//   const lookingRightFrames = useRef(0);
//   const headDownWithEyesClosed = useRef(0);
//   const lastValidLandmarks = useRef(null);
//   const studyTimerRef = useRef(null);
//   const focusTimerRef = useRef(null);
//   const pomodoroTimerRef = useRef(null);
//   const streakTimerRef = useRef(null);
//   const reminderTimerRef = useRef(null);
//   const currentStreakRef = useRef(0);
//   const audioContextRef = useRef(null);
//   const graphUpdateInterval = useRef(null);
//   const frameCountRef = useRef(0);

//   const handleClose = () => {
//     if (camera) {
//       camera.stop();
//     }
//     if (studyTimerRef.current) clearInterval(studyTimerRef.current);
//     if (focusTimerRef.current) clearInterval(focusTimerRef.current);
//     if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current);
//     if (streakTimerRef.current) clearInterval(streakTimerRef.current);
//     if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
//     if (graphUpdateInterval.current) clearInterval(graphUpdateInterval.current);
    
//     // Navigate to home or previous page
//     window.location.href = '/';
//   };

//   const playFocusReminder = () => {
//     if (!focusReminderEnabled || !audioContextRef.current) return;
    
//     const ctx = audioContextRef.current;
//     const oscillator = ctx.createOscillator();
//     const gainNode = ctx.createGain();
    
//     oscillator.connect(gainNode);
//     gainNode.connect(ctx.destination);
    
//     oscillator.frequency.value = 660;
//     gainNode.gain.value = 0.08;
//     oscillator.type = 'sine';
    
//     oscillator.start();
    
//     setTimeout(() => {
//       const osc2 = ctx.createOscillator();
//       const gain2 = ctx.createGain();
//       osc2.connect(gain2);
//       gain2.connect(ctx.destination);
//       osc2.frequency.value = 880;
//       gain2.gain.value = 0.08;
//       osc2.type = 'sine';
//       osc2.start();
//       gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
//       osc2.stop(ctx.currentTime + 0.5);
//     }, 100);
    
//     gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
//     oscillator.stop(ctx.currentTime + 0.5);
//   };

//   const initAudio = () => {
//     if (!audioContextRef.current) {
//       audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
//     }
//     if (audioContextRef.current.state === 'suspended') {
//       audioContextRef.current.resume();
//     }
//   };

//   const toggleFocusReminder = () => {
//     if (!focusReminderEnabled) {
//       initAudio();
//     }
//     setFocusReminderEnabled(!focusReminderEnabled);
//   };

//   useEffect(() => {
//     if (focusReminderEnabled && focusScore < 50) {
//       if (!reminderTimerRef.current) {
//         reminderTimerRef.current = setTimeout(() => {
//           playFocusReminder();
//           reminderTimerRef.current = null;
//         }, reminderDelay * 1000);
//       }
//     } else {
//       if (reminderTimerRef.current) {
//         clearTimeout(reminderTimerRef.current);
//         reminderTimerRef.current = null;
//       }
//     }
    
//     return () => {
//       if (reminderTimerRef.current) {
//         clearTimeout(reminderTimerRef.current);
//       }
//     };
//   }, [focusScore, focusReminderEnabled, reminderDelay]);

//   useEffect(() => {
//     const savedGoal = localStorage.getItem('dailyFocusGoal');
//     const savedProgress = localStorage.getItem('dailyProgress');
//     const savedStreak = localStorage.getItem('longestStreak');
//     const today = new Date().toDateString();
//     const savedDate = localStorage.getItem('progressDate');
    
//     if (savedGoal) setDailyGoal(parseInt(savedGoal));
//     if (savedStreak) setLongestStreak(parseInt(savedStreak));
    
//     if (savedDate === today) {
//       if (savedProgress) setDailyProgress(parseInt(savedProgress));
//     } else {
//       localStorage.setItem('progressDate', today);
//       localStorage.setItem('dailyProgress', '0');
//       setDailyProgress(0);
//     }
//   }, []);

//   useEffect(() => {
//     localStorage.setItem('dailyProgress', dailyProgress.toString());
//     localStorage.setItem('dailyGoal', dailyGoal.toString());
//     localStorage.setItem('longestStreak', longestStreak.toString());
//   }, [dailyProgress, dailyGoal, longestStreak]);

//   useEffect(() => {
//     streakTimerRef.current = setInterval(() => {
//       if (focusScore >= 70) {
//         currentStreakRef.current += 1;
//         setStreakCount(currentStreakRef.current);
//         if (currentStreakRef.current > longestStreak) {
//           setLongestStreak(currentStreakRef.current);
//         }
//       } else {
//         currentStreakRef.current = 0;
//         setStreakCount(0);
//       }
//     }, 60000);
    
//     return () => clearInterval(streakTimerRef.current);
//   }, [focusScore, longestStreak]);

//   useEffect(() => {
//     if (pomodoroActive) {
//       pomodoroTimerRef.current = setInterval(() => {
//         setPomodoroTime(prev => {
//           if (prev <= 1) {
//             if (pomodoroMode === 'focus') {
//               setPomodoroMode('break');
//               setBreakSuggestion("Time for a 5-minute break!");
//               return 5 * 60;
//             } else {
//               setPomodoroMode('focus');
//               setBreakSuggestion("");
//               setPomodoroActive(false);
//               return 25 * 60;
//             }
//           }
//           return prev - 1;
//         });
//       }, 1000);
//     } else if (pomodoroTimerRef.current) {
//       clearInterval(pomodoroTimerRef.current);
//     }
    
//     return () => {
//       if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current);
//     };
//   }, [pomodoroActive, pomodoroMode]);

//   useEffect(() => {
//     if (focusHistory.current.length >= 30) {
//       const recentScores = focusHistory.current.slice(-30);
//       const avgRecent = recentScores.reduce((a, b) => a + b, 0) / 30;
      
//       if (avgRecent < 45 && studyTime > 1800) {
//         setBreakSuggestion("Focus dropping. Consider taking a short break.");
//       }
//     }
//   }, [focusScore, studyTime]);

//   useEffect(() => {
//     const focusedMinutes = Math.floor(focusTime / 60);
//     setDailyProgress(focusedMinutes);
//   }, [focusTime]);

//   const LEFT_EYE = [33, 160, 158, 133, 153, 144];
//   const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
//   const EAR_THRESHOLD = 0.23;
//   const DROWSY_FRAMES = 25;
//   const DISTRACTION_FRAMES = 30;
//   const LOOKING_DOWN_FRAMES = 45;

//   const theme = {
//     dark: {
//       bg: '#0a0a0a',
//       card: '#1a1a1a',
//       text: '#ffffff',
//       secondary: '#888',
//       border: '#333'
//     },
//     light: {
//       bg: '#f5f5f5',
//       card: '#ffffff',
//       text: '#333333',
//       secondary: '#666',
//       border: '#ddd'
//     }
//   };

//   const currentTheme = darkMode ? theme.dark : theme.light;

//   const euclideanDist = (p1, p2) => {
//     return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
//   };

//   const calculateEAR = (eye) => {
//     const A = euclideanDist(eye[1], eye[5]);
//     const B = euclideanDist(eye[2], eye[4]);
//     const C = euclideanDist(eye[0], eye[3]);
//     return (A + B) / (2.0 * C);
//   };

//   const calculateHeadPose = (landmarks) => {
//     const noseTip = landmarks[1];
//     const leftEye = landmarks[33];
//     const rightEye = landmarks[263];
//     const chin = landmarks[152];

//     const faceCenter = {
//       x: (leftEye.x + rightEye.x) / 2,
//       y: (leftEye.y + rightEye.y) / 2
//     };
//     const noseOffset = noseTip.x - faceCenter.x;
//     const eyeDistance = Math.abs(rightEye.x - leftEye.x);
//     const yaw = (noseOffset / eyeDistance) * 90;

//     const noseToChin = chin.y - noseTip.y;
//     const eyeToNose = noseTip.y - faceCenter.y;
//     const pitch = (eyeToNose / noseToChin) * 60 - 30;

//     const eyeYDiff = rightEye.y - leftEye.y;
//     const eyeXDiff = rightEye.x - leftEye.x;
//     const roll = Math.atan2(eyeYDiff, eyeXDiff) * (180 / Math.PI);

//     return { yaw, pitch, roll };
//   };

//   const calculateFocusScore = (landmarks, earValue, pose) => {
//     if (!landmarks || landmarks.length === 0) return 0;

//     let score = 100;

//     if (pose.yaw > 20) {
//       lookingRightFrames.current += 1;
//       lookingLeftFrames.current = Math.max(0, lookingLeftFrames.current - 1);
//     } else if (pose.yaw < -20) {
//       lookingLeftFrames.current += 1;
//       lookingRightFrames.current = Math.max(0, lookingRightFrames.current - 1);
//     } else {
//       lookingLeftFrames.current = Math.max(0, lookingLeftFrames.current - 2);
//       lookingRightFrames.current = Math.max(0, lookingRightFrames.current - 2);
//     }

//     if (pose.pitch > 25 && Math.abs(pose.yaw) < 25) {
//       lookingDownFrames.current += 1;
//     } else {
//       lookingDownFrames.current = Math.max(0, lookingDownFrames.current - 1);
//     }

//     if (lookingLeftFrames.current > DISTRACTION_FRAMES || lookingRightFrames.current > DISTRACTION_FRAMES) {
//       score -= 45;
//     } else if (lookingLeftFrames.current > DISTRACTION_FRAMES / 2 || lookingRightFrames.current > DISTRACTION_FRAMES / 2) {
//       score -= 25;
//     } else if (lookingLeftFrames.current > 8 || lookingRightFrames.current > 8) {
//       score -= 10;
//     }

//     if (lookingDownFrames.current > LOOKING_DOWN_FRAMES && earValue >= EAR_THRESHOLD) {
//       score -= 15;
//     }

//     if (earValue < EAR_THRESHOLD) {
//       if (closedFrames.current > DROWSY_FRAMES / 2) {
//         score -= 40;
//       } else {
//         score -= 20;
//       }
//     }

//     if (Math.abs(pose.roll) > 25) {
//       score -= 10;
//     }

//     const nose = landmarks[1];
//     const centerOffset = Math.abs(nose.x - 0.5);
//     if (centerOffset > 0.3) score -= 10;
//     else if (centerOffset > 0.2) score -= 5;

//     return Math.max(0, Math.min(100, Math.round(score)));
//   };

//   const updateStatusAndDirection = (score, earValue, pose) => {
//     if (pose.yaw > 20) {
//       setLookingDirection("right");
//     } else if (pose.yaw < -20) {
//       setLookingDirection("left");
//     } else if (pose.pitch > 25) {
//       setLookingDirection("down");
//     } else {
//       setLookingDirection("center");
//     }

//     const headDown = pose.pitch > 20;
    
//     if (headDown && earValue < EAR_THRESHOLD) {
//       headDownWithEyesClosed.current += 1;
//     } else {
//       headDownWithEyesClosed.current = 0;
//     }

//     const isDrowsy = headDownWithEyesClosed.current >= 15 || 
//                     (earValue < EAR_THRESHOLD && closedFrames.current >= DROWSY_FRAMES);

//     if (isDrowsy) {
//       setAlert("DROWSINESS DETECTED! WAKE UP!");
//       setStatus("DROWSY - NEEDS REST");
//       return;
//     }

//     setAlert("");

//     if (lookingLeftFrames.current > DISTRACTION_FRAMES) {
//       setStatus("Distracted - Looking Left");
//     } else if (lookingRightFrames.current > DISTRACTION_FRAMES) {
//       setStatus("Distracted - Looking Right");
//     } else if (lookingDownFrames.current > LOOKING_DOWN_FRAMES) {
//       if (earValue < EAR_THRESHOLD) {
//         setStatus("Drowsy - Head Down with Eyes Closed");
//       } else {
//         setStatus("Studying - Reading/Writing");
//       }
//     } else if (pose.pitch > 25 && earValue >= EAR_THRESHOLD) {
//       setStatus("Studying - Looking at Desk");
//     } else if (score >= 80) {
//       setStatus("Highly Focused - Great Job!");
//     } else if (score >= 65) {
//       setStatus("Good Focus");
//     } else if (score >= 50) {
//       setStatus("Slightly Distracted");
//     } else if (score >= 30) {
//       setStatus("Distracted - Try to Focus");
//     } else {
//       setStatus("Not Focused");
//     }
//   };

//   function onResults(results) {
//     const videoWidth = webcamRef.current.video.videoWidth;
//     const videoHeight = webcamRef.current.video.videoHeight;

//     canvasRef.current.width = videoWidth;
//     canvasRef.current.height = videoHeight;

//     const canvasElement = canvasRef.current;
//     const canvasCtx = canvasElement.getContext("2d");
//     canvasCtx.save();
//     canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
//     canvasCtx.drawImage(
//       results.image,
//       0,
//       0,
//       canvasElement.width,
//       canvasElement.height
//     );

//     if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
//       const landmarks = results.multiFaceLandmarks[0];
//       lastValidLandmarks.current = landmarks;

//       const leftEyePoints = LEFT_EYE.map(idx => landmarks[idx]);
//       const rightEyePoints = RIGHT_EYE.map(idx => landmarks[idx]);

//       const leftEAR = calculateEAR(leftEyePoints);
//       const rightEAR = calculateEAR(rightEyePoints);
//       const earValue = (leftEAR + rightEAR) / 2.0;
//       setEAR(earValue);

//       if (earValue < EAR_THRESHOLD) {
//         closedFrames.current += 1;
//       } else {
//         closedFrames.current = Math.max(0, closedFrames.current - 1);
//       }

//       const drowsiness = Math.max(0, Math.min(100, 
//         (EAR_THRESHOLD - earValue) * 400 + (closedFrames.current / DROWSY_FRAMES) * 50
//       ));
//       setDrowsinessLevel(Math.round(drowsiness));

//       const pose = calculateHeadPose(landmarks);
//       setHeadPose(pose);

//       const currentScore = calculateFocusScore(landmarks, earValue, pose);

//       focusHistory.current.push(currentScore);
//       if (focusHistory.current.length > 15) {
//         focusHistory.current.shift();
//       }
      
//       const weights = focusHistory.current.map((_, i) => (i + 1) / focusHistory.current.length);
//       const weightedSum = focusHistory.current.reduce((sum, score, i) => sum + score * weights[i], 0);
//       const weightSum = weights.reduce((a, b) => a + b, 0);
//       const smoothedScore = Math.round(weightedSum / weightSum);
      
//       setFocusScore(smoothedScore);

//       updateStatusAndDirection(smoothedScore, earValue, pose);

//       // Update graph data every 30 frames (about 1 second at 30fps)
//       frameCountRef.current += 1;
//       if (frameCountRef.current >= 30) {
//         frameCountRef.current = 0;
//         const now = new Date();
//         const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
//         setFocusHistoryData(prev => {
//           const newData = [...prev.slice(1), smoothedScore];
//           return newData;
//         });
//         setTimestamps(prev => {
//           const newTimes = [...prev.slice(1), timeStr];
//           return newTimes;
//         });
//       }

//       const meshColor = alert ? "#FF0000" : 
//         (smoothedScore >= 70 ? "#30FF30" : 
//          smoothedScore >= 50 ? "#FFA500" : "#FF6347");
      
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_TESSELATION, {
//         color: meshColor + "70",
//         lineWidth: 1,
//       });

//       const eyeColor = earValue < EAR_THRESHOLD ? "#FF0000" : "#00FF00";
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, { color: "#FF3030" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, { color: "#30FF30" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, { color: "#E0E0E0" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, { color: "#E0E0E0" });

//       [leftEyePoints, rightEyePoints].forEach(eyePoints => {
//         canvasCtx.beginPath();
//         eyePoints.forEach((point, i) => {
//           const x = point.x * canvasElement.width;
//           const y = point.y * canvasElement.height;
//           if (i === 0) canvasCtx.moveTo(x, y);
//           else canvasCtx.lineTo(x, y);
//         });
//         canvasCtx.closePath();
//         canvasCtx.strokeStyle = eyeColor;
//         canvasCtx.lineWidth = 2;
//         canvasCtx.stroke();
//       });

//       const nose = landmarks[1];
//       const arrowX = nose.x * canvasElement.width;
//       const arrowY = nose.y * canvasElement.height;
      
//       canvasCtx.beginPath();
//       canvasCtx.arc(arrowX, arrowY, 6, 0, 2 * Math.PI);
//       canvasCtx.fillStyle = smoothedScore >= 70 ? "#30FF30" : 
//                            smoothedScore >= 50 ? "#FFA500" : "#FF3030";
//       canvasCtx.fill();

//       canvasCtx.beginPath();
//       canvasCtx.moveTo(arrowX, arrowY);
//       let dirX = arrowX;
//       let dirY = arrowY;
      
//       if (lookingDirection === "left") {
//         dirX -= 40;
//       } else if (lookingDirection === "right") {
//         dirX += 40;
//       } else if (lookingDirection === "down") {
//         dirY += 40;
//       } else {
//         dirY -= 20;
//       }
      
//       canvasCtx.lineTo(dirX, dirY);
//       canvasCtx.strokeStyle = "#FFD700";
//       canvasCtx.lineWidth = 3;
//       canvasCtx.stroke();

//       canvasCtx.font = '14px Arial';
//       canvasCtx.fillStyle = '#FFFFFF';
//       canvasCtx.fillText(status, 10, 30);

//     } else {
//       setFocusScore(0);
//       setStatus("No Face Detected");
//       setDrowsinessLevel(0);
//       setEAR(0);
//       setHeadPose({ yaw: 0, pitch: 0, roll: 0 });
//       setLookingDirection("center");
//       closedFrames.current = 0;
//       lookingLeftFrames.current = 0;
//       lookingRightFrames.current = 0;
//       lookingDownFrames.current = 0;
//     }

//     canvasCtx.restore();
//   }

//   const exportReport = () => {
//     const doc = new jsPDF();
//     const date = new Date().toLocaleString();
    
//     doc.setFillColor(41, 128, 185);
//     doc.rect(0, 0, 210, 40, 'F');
//     doc.setTextColor(255, 255, 255);
//     doc.setFontSize(24);
//     doc.setFont('helvetica', 'bold');
//     doc.text('FocusGuard Study Report', 105, 25, { align: 'center' });
    
//     doc.setTextColor(0, 0, 0);
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Generated: ${date}`, 105, 45, { align: 'center' });
    
//     doc.setFillColor(240, 240, 240);
//     doc.rect(10, 55, 190, 50, 'F');
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Session Summary', 15, 70);
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Total Study Time: ${formatTime(studyTime)}`, 20, 85);
//     doc.text(`Focused Time: ${formatTime(focusTime)}`, 100, 85);
//     doc.text(`Focus Rate: ${studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%`, 20, 95);
    
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Performance Metrics', 15, 120);
    
//     const avgScore = focusHistoryData.filter(s => s > 0).length > 0 ? 
//       Math.round(focusHistoryData.filter(s => s > 0).reduce((a, b) => a + b, 0) / focusHistoryData.filter(s => s > 0).length) : 0;
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Average Focus Score: ${avgScore}%`, 20, 135);
//     doc.text(`Peak Focus Score: ${focusHistoryData.length > 0 ? Math.max(...focusHistoryData) : 0}%`, 100, 135);
//     doc.text(`Longest Focus Streak: ${longestStreak} minutes`, 20, 145);
//     doc.text(`Daily Goal Progress: ${dailyProgress}/${dailyGoal} minutes`, 100, 145);
    
//     doc.save(`focusguard-report-${new Date().toISOString().split('T')[0]}.pdf`);
//   };

//   const resetSession = () => {
//     setStudyTime(0);
//     setFocusTime(0);
//     setFocusHistoryData([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
//     setTimestamps(['', '', '', '', '', '', '', '', '', '']);
//     focusHistory.current = [];
//     setPomodoroTime(25 * 60);
//     setPomodoroActive(false);
//     setPomodoroMode('focus');
//     setBreakSuggestion("");
//     setLookingDirection("center");
//     lookingLeftFrames.current = 0;
//     lookingRightFrames.current = 0;
//     lookingDownFrames.current = 0;
//     closedFrames.current = 0;
//     frameCountRef.current = 0;
//   };

//   const formatTime = (seconds) => {
//     const hours = Math.floor(seconds / 3600);
//     const mins = Math.floor((seconds % 3600) / 60);
//     const secs = seconds % 60;
//     if (hours > 0) {
//       return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//     }
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const formatPomodoroTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const chartData = {
//     labels: timestamps,
//     datasets: [
//       {
//         label: 'Focus Score',
//         data: focusHistoryData,
//         borderColor: darkMode ? '#4CAF50' : '#2196F3',
//         backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(33, 150, 243, 0.15)',
//         fill: true,
//         tension: 0.4,
//         pointRadius: 4,
//         pointHoverRadius: 6,
//         borderWidth: 2.5,
//       },
//       {
//         label: 'Threshold (50%)',
//         data: Array(timestamps.length).fill(50),
//         borderColor: '#FFA500',
//         borderDash: [5, 5],
//         borderWidth: 1.5,
//         fill: false,
//         pointRadius: 0,
//       }
//     ],
//   };

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: {
//       legend: {
//         labels: {
//           color: currentTheme.text,
//           font: { size: 11 }
//         },
//       },
//       title: {
//         display: true,
//         text: 'Focus Score Timeline',
//         color: currentTheme.text,
//         font: { size: 13, weight: 'bold' }
//       },
//     },
//     scales: {
//       y: {
//         min: 0,
//         max: 100,
//         grid: { color: currentTheme.border },
//         ticks: { color: currentTheme.text, font: { size: 10 } },
//         title: { display: true, text: 'Score (%)', color: currentTheme.text, font: { size: 11 } }
//       },
//       x: {
//         grid: { color: currentTheme.border },
//         ticks: { color: currentTheme.text, font: { size: 9 }, maxRotation: 45 },
//         title: { display: true, text: 'Time', color: currentTheme.text, font: { size: 11 } }
//       },
//     },
//   };

//   useEffect(() => {
//     studyTimerRef.current = setInterval(() => {
//       setStudyTime(prev => prev + 1);
//     }, 1000);

//     focusTimerRef.current = setInterval(() => {
//       if (focusScore >= 50) {
//         setFocusTime(prev => prev + 1);
//       }
//     }, 1000);

//     return () => {
//       clearInterval(studyTimerRef.current);
//       clearInterval(focusTimerRef.current);
//     };
//   }, [focusScore]);

//   useEffect(() => {
//     const faceMesh = new FaceMesh({
//       locateFile: (file) => {
//         return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
//       },
//     });

//     faceMesh.setOptions({
//       maxNumFaces: 1,
//       minDetectionConfidence: 0.5,
//       minTrackingConfidence: 0.5,
//       refineLandmarks: true,
//     });

//     faceMesh.onResults(onResults);

//     if (
//       typeof webcamRef.current !== "undefined" &&
//       webcamRef.current !== null
//     ) {
//       camera = new cam.Camera(webcamRef.current.video, {
//         onFrame: async () => {
//           await faceMesh.send({ image: webcamRef.current.video });
//         },
//         width: 640,
//         height: 480,
//       });
//       camera.start();
//     }

//     return () => {
//       if (camera) {
//         camera.stop();
//       }
//     };
//   }, []);

//   return (
//     <div style={{ 
//       display: 'flex', 
//       backgroundColor: currentTheme.bg,
//       minHeight: '100vh',
//       color: currentTheme.text,
//       padding: '12px',
//       transition: 'all 0.3s ease',
//       gap: '12px'
//     }}>
//       <div style={{
//         width: '260px',
//         display: 'flex',
//         flexDirection: 'column',
//         gap: '10px'
//       }}>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//           <h1 style={{ 
//             color: darkMode ? '#4CAF50' : '#2196F3',
//             fontSize: '20px',
//             margin: '0'
//           }}>
//             FocusGuard
//           </h1>
//           <button
//             onClick={handleClose}
//             style={{
//               padding: '5px 12px',
//               backgroundColor: '#dc3545',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '12px',
//               fontWeight: 'bold'
//             }}
//           >
//             Close
//           </button>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`
//         }}>
//           <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
//             <button
//               onClick={() => setDarkMode(!darkMode)}
//               style={{
//                 flex: 1,
//                 padding: '7px',
//                 backgroundColor: currentTheme.bg,
//                 color: currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '12px'
//               }}
//             >
//               {darkMode ? 'Light' : 'Dark'}
//             </button>
//             <button
//               onClick={toggleFocusReminder}
//               style={{
//                 flex: 1,
//                 padding: '7px',
//                 backgroundColor: focusReminderEnabled ? '#4CAF50' : currentTheme.bg,
//                 color: focusReminderEnabled ? 'white' : currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '12px'
//               }}
//             >
//               {focusReminderEnabled ? 'Reminder On' : 'Reminder Off'}
//             </button>
//           </div>
          
//           {focusReminderEnabled && (
//             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <span style={{ fontSize: '11px', color: currentTheme.secondary }}>Delay:</span>
//               <input
//                 type="range"
//                 min="5"
//                 max="60"
//                 value={reminderDelay}
//                 onChange={(e) => setReminderDelay(parseInt(e.target.value))}
//                 style={{ flex: 1 }}
//               />
//               <span style={{ fontSize: '11px', color: currentTheme.text, minWidth: '35px' }}>
//                 {reminderDelay}s
//               </span>
//             </div>
//           )}
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Focus Score</div>
//           <div style={{ 
//             fontSize: '48px', 
//             fontWeight: 'bold',
//             color: focusScore >= 70 ? '#4CAF50' : focusScore >= 50 ? '#FFA500' : '#FF3030',
//           }}>
//             {focusScore}%
//           </div>
//           <div style={{ 
//             fontSize: '12px', 
//             fontWeight: 'bold',
//             color: status.includes('Highly') || status.includes('Good') || status.includes('Studying') ? '#4CAF50' : 
//                    status.includes('DROWSY') ? '#FF0000' : 
//                    status.includes('Distracted') ? '#FF6347' : '#FFA500',
//             marginTop: '8px'
//           }}>
//             {status}
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '5px' }}>
//             {pomodoroMode === 'focus' ? 'Focus Timer' : 'Break Timer'}
//           </div>
//           <div style={{ 
//             fontSize: '32px', 
//             fontWeight: 'bold',
//             color: pomodoroMode === 'focus' ? '#4CAF50' : '#FF9800',
//           }}>
//             {formatPomodoroTime(pomodoroTime)}
//           </div>
//           <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
//             <button
//               onClick={() => setPomodoroActive(!pomodoroActive)}
//               style={{
//                 flex: 1,
//                 padding: '6px',
//                 backgroundColor: pomodoroActive ? '#f44336' : '#4CAF50',
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '11px'
//               }}
//             >
//               {pomodoroActive ? 'Pause' : 'Start'}
//             </button>
//             <button
//               onClick={() => {
//                 setPomodoroTime(25 * 60);
//                 setPomodoroMode('focus');
//                 setPomodoroActive(false);
//               }}
//               style={{
//                 flex: 1,
//                 padding: '6px',
//                 backgroundColor: currentTheme.secondary,
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '11px'
//               }}
//             >
//               Reset
//             </button>
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
//             <span style={{ fontSize: '12px', color: currentTheme.secondary }}>Daily Goal</span>
//             <button
//               onClick={() => setShowGoalSettings(!showGoalSettings)}
//               style={{
//                 padding: '3px 8px',
//                 backgroundColor: currentTheme.bg,
//                 color: currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '4px',
//                 cursor: 'pointer',
//                 fontSize: '10px'
//               }}
//             >
//               Set
//             </button>
//           </div>
          
//           {showGoalSettings && (
//             <div style={{ marginBottom: '8px' }}>
//               <input
//                 type="number"
//                 value={dailyGoal}
//                 onChange={(e) => setDailyGoal(Math.max(1, parseInt(e.target.value) || 120))}
//                 style={{
//                   width: '100%',
//                   padding: '4px',
//                   borderRadius: '4px',
//                   border: `1px solid ${currentTheme.border}`,
//                   backgroundColor: currentTheme.bg,
//                   color: currentTheme.text,
//                   fontSize: '11px'
//                 }}
//                 min="1"
//               />
//             </div>
//           )}
          
//           <div style={{ 
//             width: '100%', 
//             height: '6px', 
//             backgroundColor: currentTheme.border, 
//             borderRadius: '3px',
//             marginBottom: '6px'
//           }}>
//             <div style={{ 
//               width: `${Math.min(100, (dailyProgress / dailyGoal) * 100)}%`, 
//               height: '100%', 
//               backgroundColor: dailyProgress >= dailyGoal ? '#4CAF50' : '#2196F3',
//               borderRadius: '3px'
//             }} />
//           </div>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, textAlign: 'center' }}>
//             {dailyProgress}/{dailyGoal} min
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Streak</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
//             {streakCount}
//           </div>
//           <div style={{ fontSize: '10px', color: currentTheme.secondary }}>
//             Best: {longestStreak} min
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           display: 'flex',
//           gap: '6px'
//         }}>
//           <button
//             onClick={() => setShowGraph(!showGraph)}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: currentTheme.bg,
//               color: currentTheme.text,
//               border: `1px solid ${currentTheme.border}`,
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             {showGraph ? 'Hide Graph' : 'Show Graph'}
//           </button>
//           <button
//             onClick={exportReport}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: '#4CAF50',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             Export
//           </button>
//           <button
//             onClick={resetSession}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: '#f44336',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             Reset
//           </button>
//         </div>
//       </div>

//       <div style={{
//         flex: 1,
//         display: 'flex',
//         flexDirection: 'column',
//         alignItems: 'center',
//         gap: '8px'
//       }}>
//         {alert && (
//           <div style={{
//             backgroundColor: '#ff0000',
//             color: 'white',
//             padding: '8px 15px',
//             borderRadius: '8px',
//             fontSize: '14px',
//             fontWeight: 'bold',
//             animation: 'pulse 1s infinite',
//             boxShadow: '0 0 15px rgba(255,0,0,0.5)',
//             width: '100%',
//             textAlign: 'center'
//           }}>
//             {alert}
//           </div>
//         )}

//         {breakSuggestion && !alert && (
//           <div style={{
//             backgroundColor: '#FF9800',
//             color: 'white',
//             padding: '8px 15px',
//             borderRadius: '8px',
//             fontSize: '13px',
//             width: '100%',
//             textAlign: 'center',
//             fontWeight: 'bold'
//           }}>
//             {breakSuggestion}
//           </div>
//         )}

//         <div style={{ 
//           position: 'relative', 
//           width: '100%',
//           display: 'flex',
//           justifyContent: 'center'
//         }}>
//           <Webcam
//             ref={webcamRef}
//             style={{
//               width: '100%',
//               maxWidth: '720px',
//               height: 'auto',
//               aspectRatio: '4/3',
//               borderRadius: '12px',
//               border: alert ? '3px solid #ff0000' : `2px solid ${currentTheme.border}`,
//               boxShadow: alert ? '0 0 20px rgba(255,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)'
//             }}
//             mirrored={true}
//           />
//           <canvas
//             ref={canvasRef}
//             style={{
//               position: "absolute",
//               top: 0,
//               left: 0,
//               width: '100%',
//               height: '100%',
//               borderRadius: '12px',
//             }}
//           />
//         </div>

//         {showGraph && (
//           <div style={{
//             backgroundColor: currentTheme.card,
//             padding: '10px',
//             borderRadius: '10px',
//             width: '100%',
//             maxWidth: '720px',
//             height: '160px',
//             border: `1px solid ${currentTheme.border}`
//           }}>
//             <Line data={chartData} options={chartOptions} />
//           </div>
//         )}
//       </div>

//       <div style={{
//         width: '180px',
//         display: 'flex',
//         flexDirection: 'column',
//         gap: '10px'
//       }}>
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary, marginBottom: '12px', textAlign: 'center' }}>
//             Session Stats
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Study Time</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: darkMode ? '#4CAF50' : '#2196F3' }}>
//               {formatTime(studyTime)}
//             </div>
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Focused Time</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
//               {formatTime(focusTime)}
//             </div>
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Focus Rate</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF9800' }}>
//               {studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%
//             </div>
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Eye Openness (EAR)</div>
//           <div style={{ 
//             fontSize: '18px', 
//             fontWeight: 'bold',
//             color: ear < EAR_THRESHOLD ? '#FF0000' : '#4CAF50',
//           }}>
//             {ear.toFixed(3)}
//           </div>
//           <div style={{ fontSize: '9px', color: currentTheme.secondary, marginTop: '4px' }}>
//             Threshold: {EAR_THRESHOLD}
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Drowsiness Level</div>
//           <div style={{ 
//             fontSize: '18px', 
//             fontWeight: 'bold',
//             color: drowsinessLevel > 30 ? '#FF0000' : '#4CAF50',
//           }}>
//             {drowsinessLevel}%
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Looking Direction</div>
//           <div style={{ 
//             fontSize: '16px', 
//             fontWeight: 'bold',
//             color: lookingDirection === 'center' ? '#4CAF50' : 
//                    lookingDirection === 'down' ? '#2196F3' : '#FF6347',
//             textTransform: 'capitalize'
//           }}>
//             {lookingDirection}
//           </div>
//           <div style={{ fontSize: '9px', color: currentTheme.secondary, marginTop: '6px' }}>
//             Yaw: {Math.round(headPose.yaw)}° | Pitch: {Math.round(headPose.pitch)}°
//           </div>
//         </div>
//       </div>

//       <style jsx>{`
//         @keyframes pulse {
//           0%, 100% { opacity: 1; transform: scale(1); }
//           50% { opacity: 0.8; transform: scale(1.01); }
//         }
//       `}</style>
//     </div>
//   );
// }

// export default App;

// import { FaceMesh } from "@mediapipe/face_mesh";
// import React, { useRef, useEffect, useState } from "react";
// import * as Facemesh from "@mediapipe/face_mesh";
// import * as cam from "@mediapipe/camera_utils";
// import Webcam from "react-webcam";
// import { Line } from 'react-chartjs-2';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// } from 'chart.js';
// import jsPDF from 'jspdf';

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// );

// function App() {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const connect = window.drawConnectors;
//   var camera = null;

//   const [focusScore, setFocusScore] = useState(0);
//   const [status, setStatus] = useState("Initializing...");
//   const [drowsinessLevel, setDrowsinessLevel] = useState(0);
//   const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
//   const [ear, setEAR] = useState(0);
//   const [alert, setAlert] = useState("");
//   const [studyTime, setStudyTime] = useState(0);
//   const [focusTime, setFocusTime] = useState(0);
//   const [darkMode, setDarkMode] = useState(true);
//   const [showGraph, setShowGraph] = useState(false);
//   const [focusHistoryData, setFocusHistoryData] = useState([0, 0, 0, 0, 0]);
//   const [timestamps, setTimestamps] = useState(['0:00', '0:00', '0:00', '0:00', '0:00']);
  
//   const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
//   const [pomodoroActive, setPomodoroActive] = useState(false);
//   const [pomodoroMode, setPomodoroMode] = useState('focus');
//   const [breakSuggestion, setBreakSuggestion] = useState("");
//   const [focusReminderEnabled, setFocusReminderEnabled] = useState(false);
//   const [reminderDelay, setReminderDelay] = useState(10);
//   const [dailyGoal, setDailyGoal] = useState(120);
//   const [dailyProgress, setDailyProgress] = useState(0);
//   const [showGoalSettings, setShowGoalSettings] = useState(false);
//   const [streakCount, setStreakCount] = useState(0);
//   const [longestStreak, setLongestStreak] = useState(0);
//   const [lookingDirection, setLookingDirection] = useState("center");

//   const focusHistory = useRef([]);
//   const closedFrames = useRef(0);
//   const lookingAwayFrames = useRef(0);
//   const lookingDownFrames = useRef(0);
//   const lookingLeftFrames = useRef(0);
//   const lookingRightFrames = useRef(0);
//   const headDownWithEyesClosed = useRef(0);
//   const lastValidLandmarks = useRef(null);
//   const studyTimerRef = useRef(null);
//   const focusTimerRef = useRef(null);
//   const pomodoroTimerRef = useRef(null);
//   const streakTimerRef = useRef(null);
//   const reminderTimerRef = useRef(null);
//   const currentStreakRef = useRef(0);
//   const audioContextRef = useRef(null);
//   const graphUpdateInterval = useRef(null);

//   const handleClose = () => {
//     if (camera) {
//       camera.stop();
//     }
//     if (studyTimerRef.current) clearInterval(studyTimerRef.current);
//     if (focusTimerRef.current) clearInterval(focusTimerRef.current);
//     if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current);
//     if (streakTimerRef.current) clearInterval(streakTimerRef.current);
//     if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
//     if (graphUpdateInterval.current) clearInterval(graphUpdateInterval.current);
//     window.close();
//   };

//   const playFocusReminder = () => {
//     if (!focusReminderEnabled || !audioContextRef.current) return;
    
//     const ctx = audioContextRef.current;
//     const oscillator = ctx.createOscillator();
//     const gainNode = ctx.createGain();
    
//     oscillator.connect(gainNode);
//     gainNode.connect(ctx.destination);
    
//     oscillator.frequency.value = 660;
//     gainNode.gain.value = 0.08;
//     oscillator.type = 'sine';
    
//     oscillator.start();
    
//     setTimeout(() => {
//       const osc2 = ctx.createOscillator();
//       const gain2 = ctx.createGain();
//       osc2.connect(gain2);
//       gain2.connect(ctx.destination);
//       osc2.frequency.value = 880;
//       gain2.gain.value = 0.08;
//       osc2.type = 'sine';
//       osc2.start();
//       gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
//       osc2.stop(ctx.currentTime + 0.5);
//     }, 100);
    
//     gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
//     oscillator.stop(ctx.currentTime + 0.5);
//   };

//   const initAudio = () => {
//     if (!audioContextRef.current) {
//       audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
//     }
//     if (audioContextRef.current.state === 'suspended') {
//       audioContextRef.current.resume();
//     }
//   };

//   const toggleFocusReminder = () => {
//     if (!focusReminderEnabled) {
//       initAudio();
//     }
//     setFocusReminderEnabled(!focusReminderEnabled);
//   };

//   useEffect(() => {
//     if (focusReminderEnabled && focusScore < 50) {
//       if (!reminderTimerRef.current) {
//         reminderTimerRef.current = setTimeout(() => {
//           playFocusReminder();
//           reminderTimerRef.current = null;
//         }, reminderDelay * 1000);
//       }
//     } else {
//       if (reminderTimerRef.current) {
//         clearTimeout(reminderTimerRef.current);
//         reminderTimerRef.current = null;
//       }
//     }
    
//     return () => {
//       if (reminderTimerRef.current) {
//         clearTimeout(reminderTimerRef.current);
//       }
//     };
//   }, [focusScore, focusReminderEnabled, reminderDelay]);

//   useEffect(() => {
//     const savedGoal = localStorage.getItem('dailyFocusGoal');
//     const savedProgress = localStorage.getItem('dailyProgress');
//     const savedStreak = localStorage.getItem('longestStreak');
//     const today = new Date().toDateString();
//     const savedDate = localStorage.getItem('progressDate');
    
//     if (savedGoal) setDailyGoal(parseInt(savedGoal));
//     if (savedStreak) setLongestStreak(parseInt(savedStreak));
    
//     if (savedDate === today) {
//       if (savedProgress) setDailyProgress(parseInt(savedProgress));
//     } else {
//       localStorage.setItem('progressDate', today);
//       localStorage.setItem('dailyProgress', '0');
//       setDailyProgress(0);
//     }
//   }, []);

//   useEffect(() => {
//     localStorage.setItem('dailyProgress', dailyProgress.toString());
//     localStorage.setItem('dailyGoal', dailyGoal.toString());
//     localStorage.setItem('longestStreak', longestStreak.toString());
//   }, [dailyProgress, dailyGoal, longestStreak]);

//   useEffect(() => {
//     streakTimerRef.current = setInterval(() => {
//       if (focusScore >= 70) {
//         currentStreakRef.current += 1;
//         setStreakCount(currentStreakRef.current);
//         if (currentStreakRef.current > longestStreak) {
//           setLongestStreak(currentStreakRef.current);
//         }
//       } else {
//         currentStreakRef.current = 0;
//         setStreakCount(0);
//       }
//     }, 60000);
    
//     return () => clearInterval(streakTimerRef.current);
//   }, [focusScore, longestStreak]);

//   useEffect(() => {
//     if (pomodoroActive) {
//       pomodoroTimerRef.current = setInterval(() => {
//         setPomodoroTime(prev => {
//           if (prev <= 1) {
//             if (pomodoroMode === 'focus') {
//               setPomodoroMode('break');
//               setBreakSuggestion("Time for a 5-minute break!");
//               return 5 * 60;
//             } else {
//               setPomodoroMode('focus');
//               setBreakSuggestion("");
//               setPomodoroActive(false);
//               return 25 * 60;
//             }
//           }
//           return prev - 1;
//         });
//       }, 1000);
//     } else if (pomodoroTimerRef.current) {
//       clearInterval(pomodoroTimerRef.current);
//     }
    
//     return () => {
//       if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current);
//     };
//   }, [pomodoroActive, pomodoroMode]);

//   useEffect(() => {
//     if (focusHistory.current.length >= 30) {
//       const recentScores = focusHistory.current.slice(-30);
//       const avgRecent = recentScores.reduce((a, b) => a + b, 0) / 30;
      
//       if (avgRecent < 45 && studyTime > 1800) {
//         setBreakSuggestion("Focus dropping. Consider taking a short break.");
//       }
//     }
//   }, [focusScore, studyTime]);

//   useEffect(() => {
//     const focusedMinutes = Math.floor(focusTime / 60);
//     setDailyProgress(focusedMinutes);
//   }, [focusTime]);

//   useEffect(() => {
//     graphUpdateInterval.current = setInterval(() => {
//       if (focusHistory.current.length > 0) {
//         const now = new Date();
//         const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
//         const avgScore = Math.round(focusHistory.current.reduce((a, b) => a + b, 0) / focusHistory.current.length);
//         setFocusHistoryData(prev => {
//           const newData = [...prev.slice(1), avgScore];
//           return newData;
//         });
//         setTimestamps(prev => {
//           const newTimes = [...prev.slice(1), timeStr];
//           return newTimes;
//         });
//       }
//     }, 10000);
    
//     return () => clearInterval(graphUpdateInterval.current);
//   }, []);

//   const LEFT_EYE = [33, 160, 158, 133, 153, 144];
//   const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
//   const EAR_THRESHOLD = 0.23;
//   const DROWSY_FRAMES = 25;
//   const DISTRACTION_FRAMES = 30;
//   const LOOKING_DOWN_FRAMES = 45;

//   const theme = {
//     dark: {
//       bg: '#0a0a0a',
//       card: '#1a1a1a',
//       text: '#ffffff',
//       secondary: '#888',
//       border: '#333'
//     },
//     light: {
//       bg: '#f5f5f5',
//       card: '#ffffff',
//       text: '#333333',
//       secondary: '#666',
//       border: '#ddd'
//     }
//   };

//   const currentTheme = darkMode ? theme.dark : theme.light;

//   const euclideanDist = (p1, p2) => {
//     return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
//   };

//   const calculateEAR = (eye) => {
//     const A = euclideanDist(eye[1], eye[5]);
//     const B = euclideanDist(eye[2], eye[4]);
//     const C = euclideanDist(eye[0], eye[3]);
//     return (A + B) / (2.0 * C);
//   };

//   const calculateHeadPose = (landmarks) => {
//     const noseTip = landmarks[1];
//     const leftEye = landmarks[33];
//     const rightEye = landmarks[263];
//     const chin = landmarks[152];

//     const faceCenter = {
//       x: (leftEye.x + rightEye.x) / 2,
//       y: (leftEye.y + rightEye.y) / 2
//     };
//     const noseOffset = noseTip.x - faceCenter.x;
//     const eyeDistance = Math.abs(rightEye.x - leftEye.x);
//     const yaw = (noseOffset / eyeDistance) * 90;

//     const noseToChin = chin.y - noseTip.y;
//     const eyeToNose = noseTip.y - faceCenter.y;
//     const pitch = (eyeToNose / noseToChin) * 60 - 30;

//     const eyeYDiff = rightEye.y - leftEye.y;
//     const eyeXDiff = rightEye.x - leftEye.x;
//     const roll = Math.atan2(eyeYDiff, eyeXDiff) * (180 / Math.PI);

//     return { yaw, pitch, roll };
//   };

//   const calculateFocusScore = (landmarks, earValue, pose) => {
//     if (!landmarks || landmarks.length === 0) return 0;

//     let score = 100;

//     if (pose.yaw > 20) {
//       lookingRightFrames.current += 1;
//       lookingLeftFrames.current = Math.max(0, lookingLeftFrames.current - 1);
//     } else if (pose.yaw < -20) {
//       lookingLeftFrames.current += 1;
//       lookingRightFrames.current = Math.max(0, lookingRightFrames.current - 1);
//     } else {
//       lookingLeftFrames.current = Math.max(0, lookingLeftFrames.current - 2);
//       lookingRightFrames.current = Math.max(0, lookingRightFrames.current - 2);
//     }

//     if (pose.pitch > 25 && Math.abs(pose.yaw) < 25) {
//       lookingDownFrames.current += 1;
//     } else {
//       lookingDownFrames.current = Math.max(0, lookingDownFrames.current - 1);
//     }

//     if (lookingLeftFrames.current > DISTRACTION_FRAMES || lookingRightFrames.current > DISTRACTION_FRAMES) {
//       score -= 45;
//     } else if (lookingLeftFrames.current > DISTRACTION_FRAMES / 2 || lookingRightFrames.current > DISTRACTION_FRAMES / 2) {
//       score -= 25;
//     } else if (lookingLeftFrames.current > 8 || lookingRightFrames.current > 8) {
//       score -= 10;
//     }

//     if (lookingDownFrames.current > LOOKING_DOWN_FRAMES && earValue >= EAR_THRESHOLD) {
//       score -= 15;
//     }

//     if (earValue < EAR_THRESHOLD) {
//       if (closedFrames.current > DROWSY_FRAMES / 2) {
//         score -= 40;
//       } else {
//         score -= 20;
//       }
//     }

//     if (Math.abs(pose.roll) > 25) {
//       score -= 10;
//     }

//     const nose = landmarks[1];
//     const centerOffset = Math.abs(nose.x - 0.5);
//     if (centerOffset > 0.3) score -= 10;
//     else if (centerOffset > 0.2) score -= 5;

//     return Math.max(0, Math.min(100, Math.round(score)));
//   };

//   const updateStatusAndDirection = (score, earValue, pose) => {
//     if (pose.yaw > 20) {
//       setLookingDirection("right");
//     } else if (pose.yaw < -20) {
//       setLookingDirection("left");
//     } else if (pose.pitch > 25) {
//       setLookingDirection("down");
//     } else {
//       setLookingDirection("center");
//     }

//     const headDown = pose.pitch > 20;
    
//     if (headDown && earValue < EAR_THRESHOLD) {
//       headDownWithEyesClosed.current += 1;
//     } else {
//       headDownWithEyesClosed.current = 0;
//     }

//     const isDrowsy = headDownWithEyesClosed.current >= 15 || 
//                     (earValue < EAR_THRESHOLD && closedFrames.current >= DROWSY_FRAMES);

//     if (isDrowsy) {
//       setAlert("DROWSINESS DETECTED! WAKE UP!");
//       setStatus("DROWSY - NEEDS REST");
//       return;
//     }

//     setAlert("");

//     if (lookingLeftFrames.current > DISTRACTION_FRAMES) {
//       setStatus("Distracted - Looking Left");
//     } else if (lookingRightFrames.current > DISTRACTION_FRAMES) {
//       setStatus("Distracted - Looking Right");
//     } else if (lookingDownFrames.current > LOOKING_DOWN_FRAMES) {
//       if (earValue < EAR_THRESHOLD) {
//         setStatus("Drowsy - Head Down with Eyes Closed");
//       } else {
//         setStatus("Studying - Reading/Writing");
//       }
//     } else if (pose.pitch > 25 && earValue >= EAR_THRESHOLD) {
//       setStatus("Studying - Looking at Desk");
//     } else if (score >= 80) {
//       setStatus("Highly Focused - Great Job!");
//     } else if (score >= 65) {
//       setStatus("Good Focus");
//     } else if (score >= 50) {
//       setStatus("Slightly Distracted");
//     } else if (score >= 30) {
//       setStatus("Distracted - Try to Focus");
//     } else {
//       setStatus("Not Focused");
//     }
//   };

//   function onResults(results) {
//     const videoWidth = webcamRef.current.video.videoWidth;
//     const videoHeight = webcamRef.current.video.videoHeight;

//     canvasRef.current.width = videoWidth;
//     canvasRef.current.height = videoHeight;

//     const canvasElement = canvasRef.current;
//     const canvasCtx = canvasElement.getContext("2d");
//     canvasCtx.save();
//     canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
//     canvasCtx.drawImage(
//       results.image,
//       0,
//       0,
//       canvasElement.width,
//       canvasElement.height
//     );

//     if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
//       const landmarks = results.multiFaceLandmarks[0];
//       lastValidLandmarks.current = landmarks;

//       const leftEyePoints = LEFT_EYE.map(idx => landmarks[idx]);
//       const rightEyePoints = RIGHT_EYE.map(idx => landmarks[idx]);

//       const leftEAR = calculateEAR(leftEyePoints);
//       const rightEAR = calculateEAR(rightEyePoints);
//       const earValue = (leftEAR + rightEAR) / 2.0;
//       setEAR(earValue);

//       if (earValue < EAR_THRESHOLD) {
//         closedFrames.current += 1;
//       } else {
//         closedFrames.current = Math.max(0, closedFrames.current - 1);
//       }

//       const drowsiness = Math.max(0, Math.min(100, 
//         (EAR_THRESHOLD - earValue) * 400 + (closedFrames.current / DROWSY_FRAMES) * 50
//       ));
//       setDrowsinessLevel(Math.round(drowsiness));

//       const pose = calculateHeadPose(landmarks);
//       setHeadPose(pose);

//       const currentScore = calculateFocusScore(landmarks, earValue, pose);

//       focusHistory.current.push(currentScore);
//       if (focusHistory.current.length > 15) {
//         focusHistory.current.shift();
//       }
      
//       const weights = focusHistory.current.map((_, i) => (i + 1) / focusHistory.current.length);
//       const weightedSum = focusHistory.current.reduce((sum, score, i) => sum + score * weights[i], 0);
//       const weightSum = weights.reduce((a, b) => a + b, 0);
//       const smoothedScore = Math.round(weightedSum / weightSum);
      
//       setFocusScore(smoothedScore);

//       updateStatusAndDirection(smoothedScore, earValue, pose);

//       const meshColor = alert ? "#FF0000" : 
//         (smoothedScore >= 70 ? "#30FF30" : 
//          smoothedScore >= 50 ? "#FFA500" : "#FF6347");
      
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_TESSELATION, {
//         color: meshColor + "70",
//         lineWidth: 1,
//       });

//       const eyeColor = earValue < EAR_THRESHOLD ? "#FF0000" : "#00FF00";
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, { color: "#FF3030" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, { color: "#30FF30" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, { color: "#E0E0E0" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, { color: "#E0E0E0" });

//       [leftEyePoints, rightEyePoints].forEach(eyePoints => {
//         canvasCtx.beginPath();
//         eyePoints.forEach((point, i) => {
//           const x = point.x * canvasElement.width;
//           const y = point.y * canvasElement.height;
//           if (i === 0) canvasCtx.moveTo(x, y);
//           else canvasCtx.lineTo(x, y);
//         });
//         canvasCtx.closePath();
//         canvasCtx.strokeStyle = eyeColor;
//         canvasCtx.lineWidth = 2;
//         canvasCtx.stroke();
//       });

//       const nose = landmarks[1];
//       const arrowX = nose.x * canvasElement.width;
//       const arrowY = nose.y * canvasElement.height;
      
//       canvasCtx.beginPath();
//       canvasCtx.arc(arrowX, arrowY, 6, 0, 2 * Math.PI);
//       canvasCtx.fillStyle = smoothedScore >= 70 ? "#30FF30" : 
//                            smoothedScore >= 50 ? "#FFA500" : "#FF3030";
//       canvasCtx.fill();

//       canvasCtx.beginPath();
//       canvasCtx.moveTo(arrowX, arrowY);
//       let dirX = arrowX;
//       let dirY = arrowY;
      
//       if (lookingDirection === "left") {
//         dirX -= 40;
//       } else if (lookingDirection === "right") {
//         dirX += 40;
//       } else if (lookingDirection === "down") {
//         dirY += 40;
//       } else {
//         dirY -= 20;
//       }
      
//       canvasCtx.lineTo(dirX, dirY);
//       canvasCtx.strokeStyle = "#FFD700";
//       canvasCtx.lineWidth = 3;
//       canvasCtx.stroke();

//       canvasCtx.font = '14px Arial';
//       canvasCtx.fillStyle = '#FFFFFF';
//       canvasCtx.fillText(status, 10, 30);

//     } else {
//       setFocusScore(0);
//       setStatus("No Face Detected");
//       setDrowsinessLevel(0);
//       setEAR(0);
//       setHeadPose({ yaw: 0, pitch: 0, roll: 0 });
//       setLookingDirection("center");
//       closedFrames.current = 0;
//       lookingLeftFrames.current = 0;
//       lookingRightFrames.current = 0;
//       lookingDownFrames.current = 0;
//     }

//     canvasCtx.restore();
//   }

//   const exportReport = () => {
//     const doc = new jsPDF();
//     const date = new Date().toLocaleString();
    
//     doc.setFillColor(41, 128, 185);
//     doc.rect(0, 0, 210, 40, 'F');
//     doc.setTextColor(255, 255, 255);
//     doc.setFontSize(24);
//     doc.setFont('helvetica', 'bold');
//     doc.text('FocusGuard Study Report', 105, 25, { align: 'center' });
    
//     doc.setTextColor(0, 0, 0);
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Generated: ${date}`, 105, 45, { align: 'center' });
    
//     doc.setFillColor(240, 240, 240);
//     doc.rect(10, 55, 190, 50, 'F');
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Session Summary', 15, 70);
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Total Study Time: ${formatTime(studyTime)}`, 20, 85);
//     doc.text(`Focused Time: ${formatTime(focusTime)}`, 100, 85);
//     doc.text(`Focus Rate: ${studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%`, 20, 95);
    
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Performance Metrics', 15, 120);
    
//     const avgScore = focusHistoryData.length > 0 ? 
//       Math.round(focusHistoryData.reduce((a, b) => a + b, 0) / focusHistoryData.length) : 0;
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Average Focus Score: ${avgScore}%`, 20, 135);
//     doc.text(`Peak Focus Score: ${focusHistoryData.length > 0 ? Math.max(...focusHistoryData) : 0}%`, 100, 135);
//     doc.text(`Longest Focus Streak: ${longestStreak} minutes`, 20, 145);
//     doc.text(`Daily Goal Progress: ${dailyProgress}/${dailyGoal} minutes`, 100, 145);
    
//     doc.save(`focusguard-report-${new Date().toISOString().split('T')[0]}.pdf`);
//   };

//   const resetSession = () => {
//     setStudyTime(0);
//     setFocusTime(0);
//     setFocusHistoryData([0, 0, 0, 0, 0]);
//     setTimestamps(['0:00', '0:00', '0:00', '0:00', '0:00']);
//     focusHistory.current = [];
//     setPomodoroTime(25 * 60);
//     setPomodoroActive(false);
//     setPomodoroMode('focus');
//     setBreakSuggestion("");
//     setLookingDirection("center");
//     lookingLeftFrames.current = 0;
//     lookingRightFrames.current = 0;
//     lookingDownFrames.current = 0;
//     closedFrames.current = 0;
//   };

//   const formatTime = (seconds) => {
//     const hours = Math.floor(seconds / 3600);
//     const mins = Math.floor((seconds % 3600) / 60);
//     const secs = seconds % 60;
//     if (hours > 0) {
//       return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//     }
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const formatPomodoroTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const chartData = {
//     labels: timestamps,
//     datasets: [
//       {
//         label: 'Focus Score',
//         data: focusHistoryData,
//         borderColor: darkMode ? '#4CAF50' : '#2196F3',
//         backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(33, 150, 243, 0.15)',
//         fill: true,
//         tension: 0.4,
//         pointRadius: 4,
//         pointHoverRadius: 6,
//         borderWidth: 2.5,
//       },
//       {
//         label: 'Threshold (50%)',
//         data: Array(timestamps.length).fill(50),
//         borderColor: '#FFA500',
//         borderDash: [5, 5],
//         borderWidth: 1.5,
//         fill: false,
//         pointRadius: 0,
//       }
//     ],
//   };

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: {
//       legend: {
//         labels: {
//           color: currentTheme.text,
//           font: { size: 11 }
//         },
//       },
//       title: {
//         display: true,
//         text: 'Focus Score Timeline',
//         color: currentTheme.text,
//         font: { size: 13, weight: 'bold' }
//       },
//     },
//     scales: {
//       y: {
//         min: 0,
//         max: 100,
//         grid: { color: currentTheme.border },
//         ticks: { color: currentTheme.text, font: { size: 10 } },
//         title: { display: true, text: 'Score (%)', color: currentTheme.text, font: { size: 11 } }
//       },
//       x: {
//         grid: { color: currentTheme.border },
//         ticks: { color: currentTheme.text, font: { size: 9 }, maxRotation: 45 },
//         title: { display: true, text: 'Time', color: currentTheme.text, font: { size: 11 } }
//       },
//     },
//   };

//   useEffect(() => {
//     studyTimerRef.current = setInterval(() => {
//       setStudyTime(prev => prev + 1);
//     }, 1000);

//     focusTimerRef.current = setInterval(() => {
//       if (focusScore >= 50) {
//         setFocusTime(prev => prev + 1);
//       }
//     }, 1000);

//     return () => {
//       clearInterval(studyTimerRef.current);
//       clearInterval(focusTimerRef.current);
//       if (graphUpdateInterval.current) clearInterval(graphUpdateInterval.current);
//     };
//   }, [focusScore]);

//   useEffect(() => {
//     const faceMesh = new FaceMesh({
//       locateFile: (file) => {
//         return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
//       },
//     });

//     faceMesh.setOptions({
//       maxNumFaces: 1,
//       minDetectionConfidence: 0.5,
//       minTrackingConfidence: 0.5,
//       refineLandmarks: true,
//     });

//     faceMesh.onResults(onResults);

//     if (
//       typeof webcamRef.current !== "undefined" &&
//       webcamRef.current !== null
//     ) {
//       camera = new cam.Camera(webcamRef.current.video, {
//         onFrame: async () => {
//           await faceMesh.send({ image: webcamRef.current.video });
//         },
//         width: 640,
//         height: 480,
//       });
//       camera.start();
//     }

//     return () => {
//       if (camera) {
//         camera.stop();
//       }
//     };
//   }, []);

//   return (
//     <div style={{ 
//       display: 'flex', 
//       backgroundColor: currentTheme.bg,
//       minHeight: '100vh',
//       color: currentTheme.text,
//       padding: '12px',
//       transition: 'all 0.3s ease',
//       gap: '12px'
//     }}>
//       <div style={{
//         width: '260px',
//         display: 'flex',
//         flexDirection: 'column',
//         gap: '10px'
//       }}>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//           <h1 style={{ 
//             color: darkMode ? '#4CAF50' : '#2196F3',
//             fontSize: '20px',
//             margin: '0'
//           }}>
//             FocusGuard
//           </h1>
//           <button
//             onClick={handleClose}
//             style={{
//               padding: '5px 12px',
//               backgroundColor: '#dc3545',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '12px',
//               fontWeight: 'bold'
//             }}
//           >
//             Close
//           </button>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`
//         }}>
//           <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
//             <button
//               onClick={() => setDarkMode(!darkMode)}
//               style={{
//                 flex: 1,
//                 padding: '7px',
//                 backgroundColor: currentTheme.bg,
//                 color: currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '12px'
//               }}
//             >
//               {darkMode ? 'Light' : 'Dark'}
//             </button>
//             <button
//               onClick={toggleFocusReminder}
//               style={{
//                 flex: 1,
//                 padding: '7px',
//                 backgroundColor: focusReminderEnabled ? '#4CAF50' : currentTheme.bg,
//                 color: focusReminderEnabled ? 'white' : currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '12px'
//               }}
//             >
//               {focusReminderEnabled ? 'Reminder On' : 'Reminder Off'}
//             </button>
//           </div>
          
//           {focusReminderEnabled && (
//             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <span style={{ fontSize: '11px', color: currentTheme.secondary }}>Delay:</span>
//               <input
//                 type="range"
//                 min="5"
//                 max="60"
//                 value={reminderDelay}
//                 onChange={(e) => setReminderDelay(parseInt(e.target.value))}
//                 style={{ flex: 1 }}
//               />
//               <span style={{ fontSize: '11px', color: currentTheme.text, minWidth: '35px' }}>
//                 {reminderDelay}s
//               </span>
//             </div>
//           )}
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Focus Score</div>
//           <div style={{ 
//             fontSize: '48px', 
//             fontWeight: 'bold',
//             color: focusScore >= 70 ? '#4CAF50' : focusScore >= 50 ? '#FFA500' : '#FF3030',
//           }}>
//             {focusScore}%
//           </div>
//           <div style={{ 
//             fontSize: '12px', 
//             fontWeight: 'bold',
//             color: status.includes('Highly') || status.includes('Good') || status.includes('Studying') ? '#4CAF50' : 
//                    status.includes('DROWSY') ? '#FF0000' : 
//                    status.includes('Distracted') ? '#FF6347' : '#FFA500',
//             marginTop: '8px'
//           }}>
//             {status}
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '5px' }}>
//             {pomodoroMode === 'focus' ? 'Focus Timer' : 'Break Timer'}
//           </div>
//           <div style={{ 
//             fontSize: '32px', 
//             fontWeight: 'bold',
//             color: pomodoroMode === 'focus' ? '#4CAF50' : '#FF9800',
//           }}>
//             {formatPomodoroTime(pomodoroTime)}
//           </div>
//           <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
//             <button
//               onClick={() => setPomodoroActive(!pomodoroActive)}
//               style={{
//                 flex: 1,
//                 padding: '6px',
//                 backgroundColor: pomodoroActive ? '#f44336' : '#4CAF50',
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '11px'
//               }}
//             >
//               {pomodoroActive ? 'Pause' : 'Start'}
//             </button>
//             <button
//               onClick={() => {
//                 setPomodoroTime(25 * 60);
//                 setPomodoroMode('focus');
//                 setPomodoroActive(false);
//               }}
//               style={{
//                 flex: 1,
//                 padding: '6px',
//                 backgroundColor: currentTheme.secondary,
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '11px'
//               }}
//             >
//               Reset
//             </button>
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
//             <span style={{ fontSize: '12px', color: currentTheme.secondary }}>Daily Goal</span>
//             <button
//               onClick={() => setShowGoalSettings(!showGoalSettings)}
//               style={{
//                 padding: '3px 8px',
//                 backgroundColor: currentTheme.bg,
//                 color: currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '4px',
//                 cursor: 'pointer',
//                 fontSize: '10px'
//               }}
//             >
//               Set
//             </button>
//           </div>
          
//           {showGoalSettings && (
//             <div style={{ marginBottom: '8px' }}>
//               <input
//                 type="number"
//                 value={dailyGoal}
//                 onChange={(e) => setDailyGoal(Math.max(1, parseInt(e.target.value) || 120))}
//                 style={{
//                   width: '100%',
//                   padding: '4px',
//                   borderRadius: '4px',
//                   border: `1px solid ${currentTheme.border}`,
//                   backgroundColor: currentTheme.bg,
//                   color: currentTheme.text,
//                   fontSize: '11px'
//                 }}
//                 min="1"
//               />
//             </div>
//           )}
          
//           <div style={{ 
//             width: '100%', 
//             height: '6px', 
//             backgroundColor: currentTheme.border, 
//             borderRadius: '3px',
//             marginBottom: '6px'
//           }}>
//             <div style={{ 
//               width: `${Math.min(100, (dailyProgress / dailyGoal) * 100)}%`, 
//               height: '100%', 
//               backgroundColor: dailyProgress >= dailyGoal ? '#4CAF50' : '#2196F3',
//               borderRadius: '3px'
//             }} />
//           </div>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, textAlign: 'center' }}>
//             {dailyProgress}/{dailyGoal} min
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Streak</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
//             {streakCount}
//           </div>
//           <div style={{ fontSize: '10px', color: currentTheme.secondary }}>
//             Best: {longestStreak} min
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           display: 'flex',
//           gap: '6px'
//         }}>
//           <button
//             onClick={() => setShowGraph(!showGraph)}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: currentTheme.bg,
//               color: currentTheme.text,
//               border: `1px solid ${currentTheme.border}`,
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             {showGraph ? 'Hide Graph' : 'Show Graph'}
//           </button>
//           <button
//             onClick={exportReport}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: '#4CAF50',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             Export
//           </button>
//           <button
//             onClick={resetSession}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: '#f44336',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             Reset
//           </button>
//         </div>
//       </div>

//       <div style={{
//         flex: 1,
//         display: 'flex',
//         flexDirection: 'column',
//         alignItems: 'center',
//         gap: '8px'
//       }}>
//         {alert && (
//           <div style={{
//             backgroundColor: '#ff0000',
//             color: 'white',
//             padding: '8px 15px',
//             borderRadius: '8px',
//             fontSize: '14px',
//             fontWeight: 'bold',
//             animation: 'pulse 1s infinite',
//             boxShadow: '0 0 15px rgba(255,0,0,0.5)',
//             width: '100%',
//             textAlign: 'center'
//           }}>
//             {alert}
//           </div>
//         )}

//         {breakSuggestion && !alert && (
//           <div style={{
//             backgroundColor: '#FF9800',
//             color: 'white',
//             padding: '8px 15px',
//             borderRadius: '8px',
//             fontSize: '13px',
//             width: '100%',
//             textAlign: 'center',
//             fontWeight: 'bold'
//           }}>
//             {breakSuggestion}
//           </div>
//         )}

//         <div style={{ 
//           position: 'relative', 
//           width: '100%',
//           display: 'flex',
//           justifyContent: 'center'
//         }}>
//           <Webcam
//             ref={webcamRef}
//             style={{
//               width: '100%',
//               maxWidth: '720px',
//               height: 'auto',
//               aspectRatio: '4/3',
//               borderRadius: '12px',
//               border: alert ? '3px solid #ff0000' : `2px solid ${currentTheme.border}`,
//               boxShadow: alert ? '0 0 20px rgba(255,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)'
//             }}
//             mirrored={true}
//           />
//           <canvas
//             ref={canvasRef}
//             style={{
//               position: "absolute",
//               top: 0,
//               left: 0,
//               width: '100%',
//               height: '100%',
//               borderRadius: '12px',
//             }}
//           />
//         </div>

//         {showGraph && (
//           <div style={{
//             backgroundColor: currentTheme.card,
//             padding: '10px',
//             borderRadius: '10px',
//             width: '100%',
//             maxWidth: '720px',
//             height: '160px',
//             border: `1px solid ${currentTheme.border}`
//           }}>
//             <Line data={chartData} options={chartOptions} />
//           </div>
//         )}
//       </div>

//       <div style={{
//         width: '180px',
//         display: 'flex',
//         flexDirection: 'column',
//         gap: '10px'
//       }}>
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary, marginBottom: '12px', textAlign: 'center' }}>
//             Session Stats
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Study Time</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: darkMode ? '#4CAF50' : '#2196F3' }}>
//               {formatTime(studyTime)}
//             </div>
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Focused Time</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
//               {formatTime(focusTime)}
//             </div>
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Focus Rate</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF9800' }}>
//               {studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%
//             </div>
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Eye Openness (EAR)</div>
//           <div style={{ 
//             fontSize: '18px', 
//             fontWeight: 'bold',
//             color: ear < EAR_THRESHOLD ? '#FF0000' : '#4CAF50',
//           }}>
//             {ear.toFixed(3)}
//           </div>
//           <div style={{ fontSize: '9px', color: currentTheme.secondary, marginTop: '4px' }}>
//             Threshold: {EAR_THRESHOLD}
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Drowsiness Level</div>
//           <div style={{ 
//             fontSize: '18px', 
//             fontWeight: 'bold',
//             color: drowsinessLevel > 30 ? '#FF0000' : '#4CAF50',
//           }}>
//             {drowsinessLevel}%
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Looking Direction</div>
//           <div style={{ 
//             fontSize: '16px', 
//             fontWeight: 'bold',
//             color: lookingDirection === 'center' ? '#4CAF50' : 
//                    lookingDirection === 'down' ? '#2196F3' : '#FF6347',
//             textTransform: 'capitalize'
//           }}>
//             {lookingDirection}
//           </div>
//           <div style={{ fontSize: '9px', color: currentTheme.secondary, marginTop: '6px' }}>
//             Yaw: {Math.round(headPose.yaw)}° | Pitch: {Math.round(headPose.pitch)}°
//           </div>
//         </div>
//       </div>

//       <style jsx>{`
//         @keyframes pulse {
//           0%, 100% { opacity: 1; transform: scale(1); }
//           50% { opacity: 0.8; transform: scale(1.01); }
//         }
//       `}</style>
//     </div>
//   );
// }

// export default App;

// import { FaceMesh } from "@mediapipe/face_mesh";
// import React, { useRef, useEffect, useState } from "react";
// import * as Facemesh from "@mediapipe/face_mesh";
// import * as cam from "@mediapipe/camera_utils";
// import Webcam from "react-webcam";
// import { Line } from 'react-chartjs-2';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// } from 'chart.js';
// import jsPDF from 'jspdf';

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// );

// function App() {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const connect = window.drawConnectors;
//   var camera = null;

//   const [focusScore, setFocusScore] = useState(0);
//   const [status, setStatus] = useState("Initializing...");
//   const [drowsinessLevel, setDrowsinessLevel] = useState(0);
//   const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
//   const [ear, setEAR] = useState(0);
//   const [alert, setAlert] = useState("");
//   const [studyTime, setStudyTime] = useState(0);
//   const [focusTime, setFocusTime] = useState(0);
//   const [darkMode, setDarkMode] = useState(true);
//   const [showGraph, setShowGraph] = useState(false);
//   const [focusHistoryData, setFocusHistoryData] = useState([0, 0, 0, 0, 0]);
//   const [timestamps, setTimestamps] = useState(['0:00', '0:00', '0:00', '0:00', '0:00']);
  
//   const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
//   const [pomodoroActive, setPomodoroActive] = useState(false);
//   const [pomodoroMode, setPomodoroMode] = useState('focus');
//   const [breakSuggestion, setBreakSuggestion] = useState("");
//   const [focusReminderEnabled, setFocusReminderEnabled] = useState(false);
//   const [reminderDelay, setReminderDelay] = useState(10);
//   const [dailyGoal, setDailyGoal] = useState(120);
//   const [dailyProgress, setDailyProgress] = useState(0);
//   const [showGoalSettings, setShowGoalSettings] = useState(false);
//   const [streakCount, setStreakCount] = useState(0);
//   const [longestStreak, setLongestStreak] = useState(0);
//   const [lookingDirection, setLookingDirection] = useState("center");

//   const focusHistory = useRef([]);
//   const closedFrames = useRef(0);
//   const lookingAwayFrames = useRef(0);
//   const lookingDownFrames = useRef(0);
//   const lookingLeftFrames = useRef(0);
//   const lookingRightFrames = useRef(0);
//   const headDownWithEyesClosed = useRef(0);
//   const lastValidLandmarks = useRef(null);
//   const studyTimerRef = useRef(null);
//   const focusTimerRef = useRef(null);
//   const pomodoroTimerRef = useRef(null);
//   const streakTimerRef = useRef(null);
//   const reminderTimerRef = useRef(null);
//   const currentStreakRef = useRef(0);
//   const audioContextRef = useRef(null);
//   const graphUpdateInterval = useRef(null);

//   const playFocusReminder = () => {
//     if (!focusReminderEnabled || !audioContextRef.current) return;
    
//     const ctx = audioContextRef.current;
//     const oscillator = ctx.createOscillator();
//     const gainNode = ctx.createGain();
    
//     oscillator.connect(gainNode);
//     gainNode.connect(ctx.destination);
    
//     oscillator.frequency.value = 660;
//     gainNode.gain.value = 0.08;
//     oscillator.type = 'sine';
    
//     oscillator.start();
    
//     setTimeout(() => {
//       const osc2 = ctx.createOscillator();
//       const gain2 = ctx.createGain();
//       osc2.connect(gain2);
//       gain2.connect(ctx.destination);
//       osc2.frequency.value = 880;
//       gain2.gain.value = 0.08;
//       osc2.type = 'sine';
//       osc2.start();
//       gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
//       osc2.stop(ctx.currentTime + 0.5);
//     }, 100);
    
//     gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
//     oscillator.stop(ctx.currentTime + 0.5);
//   };

//   const initAudio = () => {
//     if (!audioContextRef.current) {
//       audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
//     }
//     if (audioContextRef.current.state === 'suspended') {
//       audioContextRef.current.resume();
//     }
//   };

//   const toggleFocusReminder = () => {
//     if (!focusReminderEnabled) {
//       initAudio();
//     }
//     setFocusReminderEnabled(!focusReminderEnabled);
//   };

//   useEffect(() => {
//     if (focusReminderEnabled && focusScore < 50) {
//       if (!reminderTimerRef.current) {
//         reminderTimerRef.current = setTimeout(() => {
//           playFocusReminder();
//           reminderTimerRef.current = null;
//         }, reminderDelay * 1000);
//       }
//     } else {
//       if (reminderTimerRef.current) {
//         clearTimeout(reminderTimerRef.current);
//         reminderTimerRef.current = null;
//       }
//     }
    
//     return () => {
//       if (reminderTimerRef.current) {
//         clearTimeout(reminderTimerRef.current);
//       }
//     };
//   }, [focusScore, focusReminderEnabled, reminderDelay]);

//   useEffect(() => {
//     const savedGoal = localStorage.getItem('dailyFocusGoal');
//     const savedProgress = localStorage.getItem('dailyProgress');
//     const savedStreak = localStorage.getItem('longestStreak');
//     const today = new Date().toDateString();
//     const savedDate = localStorage.getItem('progressDate');
    
//     if (savedGoal) setDailyGoal(parseInt(savedGoal));
//     if (savedStreak) setLongestStreak(parseInt(savedStreak));
    
//     if (savedDate === today) {
//       if (savedProgress) setDailyProgress(parseInt(savedProgress));
//     } else {
//       localStorage.setItem('progressDate', today);
//       localStorage.setItem('dailyProgress', '0');
//       setDailyProgress(0);
//     }
//   }, []);

//   useEffect(() => {
//     localStorage.setItem('dailyProgress', dailyProgress.toString());
//     localStorage.setItem('dailyGoal', dailyGoal.toString());
//     localStorage.setItem('longestStreak', longestStreak.toString());
//   }, [dailyProgress, dailyGoal, longestStreak]);

//   useEffect(() => {
//     streakTimerRef.current = setInterval(() => {
//       if (focusScore >= 70) {
//         currentStreakRef.current += 1;
//         setStreakCount(currentStreakRef.current);
//         if (currentStreakRef.current > longestStreak) {
//           setLongestStreak(currentStreakRef.current);
//         }
//       } else {
//         currentStreakRef.current = 0;
//         setStreakCount(0);
//       }
//     }, 60000);
    
//     return () => clearInterval(streakTimerRef.current);
//   }, [focusScore, longestStreak]);

//   useEffect(() => {
//     if (pomodoroActive) {
//       pomodoroTimerRef.current = setInterval(() => {
//         setPomodoroTime(prev => {
//           if (prev <= 1) {
//             if (pomodoroMode === 'focus') {
//               setPomodoroMode('break');
//               setBreakSuggestion("Time for a 5-minute break!");
//               return 5 * 60;
//             } else {
//               setPomodoroMode('focus');
//               setBreakSuggestion("");
//               setPomodoroActive(false);
//               return 25 * 60;
//             }
//           }
//           return prev - 1;
//         });
//       }, 1000);
//     } else if (pomodoroTimerRef.current) {
//       clearInterval(pomodoroTimerRef.current);
//     }
    
//     return () => {
//       if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current);
//     };
//   }, [pomodoroActive, pomodoroMode]);

//   useEffect(() => {
//     if (focusHistory.current.length >= 30) {
//       const recentScores = focusHistory.current.slice(-30);
//       const avgRecent = recentScores.reduce((a, b) => a + b, 0) / 30;
      
//       if (avgRecent < 45 && studyTime > 1800) {
//         setBreakSuggestion("Focus dropping. Consider taking a short break.");
//       }
//     }
//   }, [focusScore, studyTime]);

//   useEffect(() => {
//     const focusedMinutes = Math.floor(focusTime / 60);
//     setDailyProgress(focusedMinutes);
//   }, [focusTime]);

//   useEffect(() => {
//     graphUpdateInterval.current = setInterval(() => {
//       if (focusHistory.current.length > 0) {
//         const now = new Date();
//         const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
//         const avgScore = Math.round(focusHistory.current.reduce((a, b) => a + b, 0) / focusHistory.current.length);
//         setFocusHistoryData(prev => {
//           const newData = [...prev.slice(1), avgScore];
//           return newData;
//         });
//         setTimestamps(prev => {
//           const newTimes = [...prev.slice(1), timeStr];
//           return newTimes;
//         });
//       }
//     }, 10000);
    
//     return () => clearInterval(graphUpdateInterval.current);
//   }, []);

//   const LEFT_EYE = [33, 160, 158, 133, 153, 144];
//   const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
//   const EAR_THRESHOLD = 0.23;
//   const DROWSY_FRAMES = 25;
//   const DISTRACTION_FRAMES = 30;
//   const LOOKING_DOWN_FRAMES = 45;

//   const theme = {
//     dark: {
//       bg: '#0a0a0a',
//       card: '#1a1a1a',
//       text: '#ffffff',
//       secondary: '#888',
//       border: '#333'
//     },
//     light: {
//       bg: '#f5f5f5',
//       card: '#ffffff',
//       text: '#333333',
//       secondary: '#666',
//       border: '#ddd'
//     }
//   };

//   const currentTheme = darkMode ? theme.dark : theme.light;

//   const euclideanDist = (p1, p2) => {
//     return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
//   };

//   const calculateEAR = (eye) => {
//     const A = euclideanDist(eye[1], eye[5]);
//     const B = euclideanDist(eye[2], eye[4]);
//     const C = euclideanDist(eye[0], eye[3]);
//     return (A + B) / (2.0 * C);
//   };

//   const calculateHeadPose = (landmarks) => {
//     const noseTip = landmarks[1];
//     const leftEye = landmarks[33];
//     const rightEye = landmarks[263];
//     const chin = landmarks[152];

//     const faceCenter = {
//       x: (leftEye.x + rightEye.x) / 2,
//       y: (leftEye.y + rightEye.y) / 2
//     };
//     const noseOffset = noseTip.x - faceCenter.x;
//     const eyeDistance = Math.abs(rightEye.x - leftEye.x);
//     const yaw = (noseOffset / eyeDistance) * 90;

//     const noseToChin = chin.y - noseTip.y;
//     const eyeToNose = noseTip.y - faceCenter.y;
//     const pitch = (eyeToNose / noseToChin) * 60 - 30;

//     const eyeYDiff = rightEye.y - leftEye.y;
//     const eyeXDiff = rightEye.x - leftEye.x;
//     const roll = Math.atan2(eyeYDiff, eyeXDiff) * (180 / Math.PI);

//     return { yaw, pitch, roll };
//   };

//   const calculateFocusScore = (landmarks, earValue, pose) => {
//     if (!landmarks || landmarks.length === 0) return 0;

//     let score = 100;

//     // Track looking left/right
//     if (pose.yaw > 20) {
//       lookingRightFrames.current += 1;
//       lookingLeftFrames.current = Math.max(0, lookingLeftFrames.current - 1);
//     } else if (pose.yaw < -20) {
//       lookingLeftFrames.current += 1;
//       lookingRightFrames.current = Math.max(0, lookingRightFrames.current - 1);
//     } else {
//       lookingLeftFrames.current = Math.max(0, lookingLeftFrames.current - 2);
//       lookingRightFrames.current = Math.max(0, lookingRightFrames.current - 2);
//     }

//     // Track looking down
//     if (pose.pitch > 25 && Math.abs(pose.yaw) < 25) {
//       lookingDownFrames.current += 1;
//     } else {
//       lookingDownFrames.current = Math.max(0, lookingDownFrames.current - 1);
//     }

//     // Penalties for looking left/right (distracted)
//     if (lookingLeftFrames.current > DISTRACTION_FRAMES || lookingRightFrames.current > DISTRACTION_FRAMES) {
//       score -= 45;
//     } else if (lookingLeftFrames.current > DISTRACTION_FRAMES / 2 || lookingRightFrames.current > DISTRACTION_FRAMES / 2) {
//       score -= 25;
//     } else if (lookingLeftFrames.current > 8 || lookingRightFrames.current > 8) {
//       score -= 10;
//     }

//     // Looking down penalty - only if eyes are open (reading/studying is OK)
//     if (lookingDownFrames.current > LOOKING_DOWN_FRAMES && earValue >= EAR_THRESHOLD) {
//       score -= 15; // Small penalty for extended looking down
//     }

//     // Drowsiness penalty (eyes closed)
//     if (earValue < EAR_THRESHOLD) {
//       if (closedFrames.current > DROWSY_FRAMES / 2) {
//         score -= 40;
//       } else {
//         score -= 20;
//       }
//     }

//     // Head tilt penalty
//     if (Math.abs(pose.roll) > 25) {
//       score -= 10;
//     }

//     // Face centering
//     const nose = landmarks[1];
//     const centerOffset = Math.abs(nose.x - 0.5);
//     if (centerOffset > 0.3) score -= 10;
//     else if (centerOffset > 0.2) score -= 5;

//     return Math.max(0, Math.min(100, Math.round(score)));
//   };

//   const updateStatusAndDirection = (score, earValue, pose) => {
//     // Determine looking direction
//     if (pose.yaw > 20) {
//       setLookingDirection("right");
//     } else if (pose.yaw < -20) {
//       setLookingDirection("left");
//     } else if (pose.pitch > 25) {
//       setLookingDirection("down");
//     } else {
//       setLookingDirection("center");
//     }

//     // Check drowsiness
//     const headDown = pose.pitch > 20;
    
//     if (headDown && earValue < EAR_THRESHOLD) {
//       headDownWithEyesClosed.current += 1;
//     } else {
//       headDownWithEyesClosed.current = 0;
//     }

//     const isDrowsy = headDownWithEyesClosed.current >= 15 || 
//                     (earValue < EAR_THRESHOLD && closedFrames.current >= DROWSY_FRAMES);

//     if (isDrowsy) {
//       setAlert("DROWSINESS DETECTED! WAKE UP!");
//       setStatus("DROWSY - NEEDS REST");
//       return;
//     }

//     setAlert("");

//     // Status based on looking direction
//     if (lookingLeftFrames.current > DISTRACTION_FRAMES) {
//       setStatus("Distracted - Looking Left");
//     } else if (lookingRightFrames.current > DISTRACTION_FRAMES) {
//       setStatus("Distracted - Looking Right");
//     } else if (lookingDownFrames.current > LOOKING_DOWN_FRAMES) {
//       if (earValue < EAR_THRESHOLD) {
//         setStatus("Drowsy - Head Down with Eyes Closed");
//       } else {
//         setStatus("Studying - Reading/Writing");
//       }
//     } else if (pose.pitch > 25 && earValue >= EAR_THRESHOLD) {
//       setStatus("Studying - Looking at Desk");
//     } else if (score >= 80) {
//       setStatus("Highly Focused - Great Job!");
//     } else if (score >= 65) {
//       setStatus("Good Focus");
//     } else if (score >= 50) {
//       setStatus("Slightly Distracted");
//     } else if (score >= 30) {
//       setStatus("Distracted - Try to Focus");
//     } else {
//       setStatus("Not Focused");
//     }
//   };

//   function onResults(results) {
//     const videoWidth = webcamRef.current.video.videoWidth;
//     const videoHeight = webcamRef.current.video.videoHeight;

//     canvasRef.current.width = videoWidth;
//     canvasRef.current.height = videoHeight;

//     const canvasElement = canvasRef.current;
//     const canvasCtx = canvasElement.getContext("2d");
//     canvasCtx.save();
//     canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
//     canvasCtx.drawImage(
//       results.image,
//       0,
//       0,
//       canvasElement.width,
//       canvasElement.height
//     );

//     if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
//       const landmarks = results.multiFaceLandmarks[0];
//       lastValidLandmarks.current = landmarks;

//       const leftEyePoints = LEFT_EYE.map(idx => landmarks[idx]);
//       const rightEyePoints = RIGHT_EYE.map(idx => landmarks[idx]);

//       const leftEAR = calculateEAR(leftEyePoints);
//       const rightEAR = calculateEAR(rightEyePoints);
//       const earValue = (leftEAR + rightEAR) / 2.0;
//       setEAR(earValue);

//       if (earValue < EAR_THRESHOLD) {
//         closedFrames.current += 1;
//       } else {
//         closedFrames.current = Math.max(0, closedFrames.current - 1);
//       }

//       const drowsiness = Math.max(0, Math.min(100, 
//         (EAR_THRESHOLD - earValue) * 400 + (closedFrames.current / DROWSY_FRAMES) * 50
//       ));
//       setDrowsinessLevel(Math.round(drowsiness));

//       const pose = calculateHeadPose(landmarks);
//       setHeadPose(pose);

//       const currentScore = calculateFocusScore(landmarks, earValue, pose);

//       focusHistory.current.push(currentScore);
//       if (focusHistory.current.length > 15) {
//         focusHistory.current.shift();
//       }
      
//       const weights = focusHistory.current.map((_, i) => (i + 1) / focusHistory.current.length);
//       const weightedSum = focusHistory.current.reduce((sum, score, i) => sum + score * weights[i], 0);
//       const weightSum = weights.reduce((a, b) => a + b, 0);
//       const smoothedScore = Math.round(weightedSum / weightSum);
      
//       setFocusScore(smoothedScore);

//       updateStatusAndDirection(smoothedScore, earValue, pose);

//       const meshColor = alert ? "#FF0000" : 
//         (smoothedScore >= 70 ? "#30FF30" : 
//          smoothedScore >= 50 ? "#FFA500" : "#FF6347");
      
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_TESSELATION, {
//         color: meshColor + "70",
//         lineWidth: 1,
//       });

//       const eyeColor = earValue < EAR_THRESHOLD ? "#FF0000" : "#00FF00";
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, { color: "#FF3030" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, { color: "#30FF30" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, { color: "#E0E0E0" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, { color: "#E0E0E0" });

//       [leftEyePoints, rightEyePoints].forEach(eyePoints => {
//         canvasCtx.beginPath();
//         eyePoints.forEach((point, i) => {
//           const x = point.x * canvasElement.width;
//           const y = point.y * canvasElement.height;
//           if (i === 0) canvasCtx.moveTo(x, y);
//           else canvasCtx.lineTo(x, y);
//         });
//         canvasCtx.closePath();
//         canvasCtx.strokeStyle = eyeColor;
//         canvasCtx.lineWidth = 2;
//         canvasCtx.stroke();
//       });

//       // Draw direction arrow
//       const nose = landmarks[1];
//       const arrowX = nose.x * canvasElement.width;
//       const arrowY = nose.y * canvasElement.height;
      
//       canvasCtx.beginPath();
//       canvasCtx.arc(arrowX, arrowY, 6, 0, 2 * Math.PI);
//       canvasCtx.fillStyle = smoothedScore >= 70 ? "#30FF30" : 
//                            smoothedScore >= 50 ? "#FFA500" : "#FF3030";
//       canvasCtx.fill();

//       // Draw looking direction indicator
//       canvasCtx.beginPath();
//       canvasCtx.moveTo(arrowX, arrowY);
//       let dirX = arrowX;
//       let dirY = arrowY;
      
//       if (lookingDirection === "left") {
//         dirX -= 40;
//       } else if (lookingDirection === "right") {
//         dirX += 40;
//       } else if (lookingDirection === "down") {
//         dirY += 40;
//       } else {
//         dirY -= 20;
//       }
      
//       canvasCtx.lineTo(dirX, dirY);
//       canvasCtx.strokeStyle = "#FFD700";
//       canvasCtx.lineWidth = 3;
//       canvasCtx.stroke();

//       canvasCtx.font = '14px Arial';
//       canvasCtx.fillStyle = '#FFFFFF';
//       canvasCtx.fillText(status, 10, 30);

//     } else {
//       setFocusScore(0);
//       setStatus("No Face Detected");
//       setDrowsinessLevel(0);
//       setEAR(0);
//       setHeadPose({ yaw: 0, pitch: 0, roll: 0 });
//       setLookingDirection("center");
//       closedFrames.current = 0;
//       lookingLeftFrames.current = 0;
//       lookingRightFrames.current = 0;
//       lookingDownFrames.current = 0;
//     }

//     canvasCtx.restore();
//   }

//   const exportReport = () => {
//     const doc = new jsPDF();
//     const date = new Date().toLocaleString();
    
//     doc.setFillColor(41, 128, 185);
//     doc.rect(0, 0, 210, 40, 'F');
//     doc.setTextColor(255, 255, 255);
//     doc.setFontSize(24);
//     doc.setFont('helvetica', 'bold');
//     doc.text('FocusGuard Study Report', 105, 25, { align: 'center' });
    
//     doc.setTextColor(0, 0, 0);
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Generated: ${date}`, 105, 45, { align: 'center' });
    
//     doc.setFillColor(240, 240, 240);
//     doc.rect(10, 55, 190, 50, 'F');
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Session Summary', 15, 70);
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Total Study Time: ${formatTime(studyTime)}`, 20, 85);
//     doc.text(`Focused Time: ${formatTime(focusTime)}`, 100, 85);
//     doc.text(`Focus Rate: ${studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%`, 20, 95);
    
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Performance Metrics', 15, 120);
    
//     const avgScore = focusHistoryData.length > 0 ? 
//       Math.round(focusHistoryData.reduce((a, b) => a + b, 0) / focusHistoryData.length) : 0;
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Average Focus Score: ${avgScore}%`, 20, 135);
//     doc.text(`Peak Focus Score: ${focusHistoryData.length > 0 ? Math.max(...focusHistoryData) : 0}%`, 100, 135);
//     doc.text(`Longest Focus Streak: ${longestStreak} minutes`, 20, 145);
//     doc.text(`Daily Goal Progress: ${dailyProgress}/${dailyGoal} minutes`, 100, 145);
    
//     doc.save(`focusguard-report-${new Date().toISOString().split('T')[0]}.pdf`);
//   };

//   const resetSession = () => {
//     setStudyTime(0);
//     setFocusTime(0);
//     setFocusHistoryData([0, 0, 0, 0, 0]);
//     setTimestamps(['0:00', '0:00', '0:00', '0:00', '0:00']);
//     focusHistory.current = [];
//     setPomodoroTime(25 * 60);
//     setPomodoroActive(false);
//     setPomodoroMode('focus');
//     setBreakSuggestion("");
//     setLookingDirection("center");
//     lookingLeftFrames.current = 0;
//     lookingRightFrames.current = 0;
//     lookingDownFrames.current = 0;
//     closedFrames.current = 0;
//   };

//   const formatTime = (seconds) => {
//     const hours = Math.floor(seconds / 3600);
//     const mins = Math.floor((seconds % 3600) / 60);
//     const secs = seconds % 60;
//     if (hours > 0) {
//       return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//     }
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const formatPomodoroTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const chartData = {
//     labels: timestamps,
//     datasets: [
//       {
//         label: 'Focus Score',
//         data: focusHistoryData,
//         borderColor: darkMode ? '#4CAF50' : '#2196F3',
//         backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(33, 150, 243, 0.15)',
//         fill: true,
//         tension: 0.4,
//         pointRadius: 4,
//         pointHoverRadius: 6,
//         borderWidth: 2.5,
//       },
//       {
//         label: 'Threshold (50%)',
//         data: Array(timestamps.length).fill(50),
//         borderColor: '#FFA500',
//         borderDash: [5, 5],
//         borderWidth: 1.5,
//         fill: false,
//         pointRadius: 0,
//       }
//     ],
//   };

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: {
//       legend: {
//         labels: {
//           color: currentTheme.text,
//           font: { size: 11 }
//         },
//       },
//       title: {
//         display: true,
//         text: 'Focus Score Timeline',
//         color: currentTheme.text,
//         font: { size: 13, weight: 'bold' }
//       },
//     },
//     scales: {
//       y: {
//         min: 0,
//         max: 100,
//         grid: { color: currentTheme.border },
//         ticks: { color: currentTheme.text, font: { size: 10 } },
//         title: { display: true, text: 'Score (%)', color: currentTheme.text, font: { size: 11 } }
//       },
//       x: {
//         grid: { color: currentTheme.border },
//         ticks: { color: currentTheme.text, font: { size: 9 }, maxRotation: 45 },
//         title: { display: true, text: 'Time', color: currentTheme.text, font: { size: 11 } }
//       },
//     },
//   };

//   useEffect(() => {
//     studyTimerRef.current = setInterval(() => {
//       setStudyTime(prev => prev + 1);
//     }, 1000);

//     focusTimerRef.current = setInterval(() => {
//       if (focusScore >= 50) {
//         setFocusTime(prev => prev + 1);
//       }
//     }, 1000);

//     return () => {
//       clearInterval(studyTimerRef.current);
//       clearInterval(focusTimerRef.current);
//       if (graphUpdateInterval.current) clearInterval(graphUpdateInterval.current);
//     };
//   }, [focusScore]);

//   useEffect(() => {
//     const faceMesh = new FaceMesh({
//       locateFile: (file) => {
//         return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
//       },
//     });

//     faceMesh.setOptions({
//       maxNumFaces: 1,
//       minDetectionConfidence: 0.5,
//       minTrackingConfidence: 0.5,
//       refineLandmarks: true,
//     });

//     faceMesh.onResults(onResults);

//     if (
//       typeof webcamRef.current !== "undefined" &&
//       webcamRef.current !== null
//     ) {
//       camera = new cam.Camera(webcamRef.current.video, {
//         onFrame: async () => {
//           await faceMesh.send({ image: webcamRef.current.video });
//         },
//         width: 640,
//         height: 480,
//       });
//       camera.start();
//     }

//     return () => {
//       if (camera) {
//         camera.stop();
//       }
//     };
//   }, []);

//   return (
//     <div style={{ 
//       display: 'flex', 
//       backgroundColor: currentTheme.bg,
//       minHeight: '100vh',
//       color: currentTheme.text,
//       padding: '12px',
//       transition: 'all 0.3s ease',
//       gap: '12px'
//     }}>
//       {/* Left Panel - Controls */}
//       <div style={{
//         width: '260px',
//         display: 'flex',
//         flexDirection: 'column',
//         gap: '10px'
//       }}>
//         <h1 style={{ 
//           color: darkMode ? '#4CAF50' : '#2196F3',
//           fontSize: '20px',
//           margin: '0 0 5px 0'
//         }}>
//           FocusGuard
//         </h1>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`
//         }}>
//           <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
//             <button
//               onClick={() => setDarkMode(!darkMode)}
//               style={{
//                 flex: 1,
//                 padding: '7px',
//                 backgroundColor: currentTheme.bg,
//                 color: currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '12px'
//               }}
//             >
//               {darkMode ? 'Light' : 'Dark'}
//             </button>
//             <button
//               onClick={toggleFocusReminder}
//               style={{
//                 flex: 1,
//                 padding: '7px',
//                 backgroundColor: focusReminderEnabled ? '#4CAF50' : currentTheme.bg,
//                 color: focusReminderEnabled ? 'white' : currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '12px'
//               }}
//             >
//               {focusReminderEnabled ? 'Reminder On' : 'Reminder Off'}
//             </button>
//           </div>
          
//           {focusReminderEnabled && (
//             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <span style={{ fontSize: '11px', color: currentTheme.secondary }}>Delay:</span>
//               <input
//                 type="range"
//                 min="5"
//                 max="60"
//                 value={reminderDelay}
//                 onChange={(e) => setReminderDelay(parseInt(e.target.value))}
//                 style={{ flex: 1 }}
//               />
//               <span style={{ fontSize: '11px', color: currentTheme.text, minWidth: '35px' }}>
//                 {reminderDelay}s
//               </span>
//             </div>
//           )}
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Focus Score</div>
//           <div style={{ 
//             fontSize: '48px', 
//             fontWeight: 'bold',
//             color: focusScore >= 70 ? '#4CAF50' : focusScore >= 50 ? '#FFA500' : '#FF3030',
//           }}>
//             {focusScore}%
//           </div>
//           <div style={{ 
//             fontSize: '12px', 
//             fontWeight: 'bold',
//             color: status.includes('Highly') || status.includes('Good') || status.includes('Studying') ? '#4CAF50' : 
//                    status.includes('DROWSY') ? '#FF0000' : 
//                    status.includes('Distracted') ? '#FF6347' : '#FFA500',
//             marginTop: '8px'
//           }}>
//             {status}
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '5px' }}>
//             {pomodoroMode === 'focus' ? 'Focus Timer' : 'Break Timer'}
//           </div>
//           <div style={{ 
//             fontSize: '32px', 
//             fontWeight: 'bold',
//             color: pomodoroMode === 'focus' ? '#4CAF50' : '#FF9800',
//           }}>
//             {formatPomodoroTime(pomodoroTime)}
//           </div>
//           <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
//             <button
//               onClick={() => setPomodoroActive(!pomodoroActive)}
//               style={{
//                 flex: 1,
//                 padding: '6px',
//                 backgroundColor: pomodoroActive ? '#f44336' : '#4CAF50',
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '11px'
//               }}
//             >
//               {pomodoroActive ? 'Pause' : 'Start'}
//             </button>
//             <button
//               onClick={() => {
//                 setPomodoroTime(25 * 60);
//                 setPomodoroMode('focus');
//                 setPomodoroActive(false);
//               }}
//               style={{
//                 flex: 1,
//                 padding: '6px',
//                 backgroundColor: currentTheme.secondary,
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '11px'
//               }}
//             >
//               Reset
//             </button>
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
//             <span style={{ fontSize: '12px', color: currentTheme.secondary }}>Daily Goal</span>
//             <button
//               onClick={() => setShowGoalSettings(!showGoalSettings)}
//               style={{
//                 padding: '3px 8px',
//                 backgroundColor: currentTheme.bg,
//                 color: currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '4px',
//                 cursor: 'pointer',
//                 fontSize: '10px'
//               }}
//             >
//               Set
//             </button>
//           </div>
          
//           {showGoalSettings && (
//             <div style={{ marginBottom: '8px' }}>
//               <input
//                 type="number"
//                 value={dailyGoal}
//                 onChange={(e) => setDailyGoal(Math.max(1, parseInt(e.target.value) || 120))}
//                 style={{
//                   width: '100%',
//                   padding: '4px',
//                   borderRadius: '4px',
//                   border: `1px solid ${currentTheme.border}`,
//                   backgroundColor: currentTheme.bg,
//                   color: currentTheme.text,
//                   fontSize: '11px'
//                 }}
//                 min="1"
//               />
//             </div>
//           )}
          
//           <div style={{ 
//             width: '100%', 
//             height: '6px', 
//             backgroundColor: currentTheme.border, 
//             borderRadius: '3px',
//             marginBottom: '6px'
//           }}>
//             <div style={{ 
//               width: `${Math.min(100, (dailyProgress / dailyGoal) * 100)}%`, 
//               height: '100%', 
//               backgroundColor: dailyProgress >= dailyGoal ? '#4CAF50' : '#2196F3',
//               borderRadius: '3px'
//             }} />
//           </div>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, textAlign: 'center' }}>
//             {dailyProgress}/{dailyGoal} min
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Streak</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
//             {streakCount}
//           </div>
//           <div style={{ fontSize: '10px', color: currentTheme.secondary }}>
//             Best: {longestStreak} min
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//           display: 'flex',
//           gap: '6px'
//         }}>
//           <button
//             onClick={() => setShowGraph(!showGraph)}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: currentTheme.bg,
//               color: currentTheme.text,
//               border: `1px solid ${currentTheme.border}`,
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             {showGraph ? 'Hide Graph' : 'Show Graph'}
//           </button>
//           <button
//             onClick={exportReport}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: '#4CAF50',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             Export
//           </button>
//           <button
//             onClick={resetSession}
//             style={{
//               flex: 1,
//               padding: '7px',
//               backgroundColor: '#f44336',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '11px'
//             }}
//           >
//             Reset
//           </button>
//         </div>
//       </div>

//       {/* Center Panel - Camera */}
//       <div style={{
//         flex: 1,
//         display: 'flex',
//         flexDirection: 'column',
//         alignItems: 'center',
//         gap: '8px'
//       }}>
//         {alert && (
//           <div style={{
//             backgroundColor: '#ff0000',
//             color: 'white',
//             padding: '8px 15px',
//             borderRadius: '8px',
//             fontSize: '14px',
//             fontWeight: 'bold',
//             animation: 'pulse 1s infinite',
//             boxShadow: '0 0 15px rgba(255,0,0,0.5)',
//             width: '100%',
//             textAlign: 'center'
//           }}>
//             {alert}
//           </div>
//         )}

//         {breakSuggestion && !alert && (
//           <div style={{
//             backgroundColor: '#FF9800',
//             color: 'white',
//             padding: '8px 15px',
//             borderRadius: '8px',
//             fontSize: '13px',
//             width: '100%',
//             textAlign: 'center',
//             fontWeight: 'bold'
//           }}>
//             {breakSuggestion}
//           </div>
//         )}

//         <div style={{ 
//           position: 'relative', 
//           width: '100%',
//           display: 'flex',
//           justifyContent: 'center'
//         }}>
//           <Webcam
//             ref={webcamRef}
//             style={{
//               width: '100%',
//               maxWidth: '720px',
//               height: 'auto',
//               aspectRatio: '4/3',
//               borderRadius: '12px',
//               border: alert ? '3px solid #ff0000' : `2px solid ${currentTheme.border}`,
//               boxShadow: alert ? '0 0 20px rgba(255,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)'
//             }}
//             mirrored={true}
//           />
//           <canvas
//             ref={canvasRef}
//             style={{
//               position: "absolute",
//               top: 0,
//               left: 0,
//               width: '100%',
//               height: '100%',
//               borderRadius: '12px',
//             }}
//           />
//         </div>

//         {showGraph && (
//           <div style={{
//             backgroundColor: currentTheme.card,
//             padding: '10px',
//             borderRadius: '10px',
//             width: '100%',
//             maxWidth: '720px',
//             height: '160px',
//             border: `1px solid ${currentTheme.border}`
//           }}>
//             <Line data={chartData} options={chartOptions} />
//           </div>
//         )}
//       </div>

//       {/* Right Panel - Stats */}
//       <div style={{
//         width: '180px',
//         display: 'flex',
//         flexDirection: 'column',
//         gap: '10px'
//       }}>
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary, marginBottom: '12px', textAlign: 'center' }}>
//             Session Stats
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Study Time</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: darkMode ? '#4CAF50' : '#2196F3' }}>
//               {formatTime(studyTime)}
//             </div>
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Focused Time</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4CAF50' }}>
//               {formatTime(focusTime)}
//             </div>
//           </div>
          
//           <div style={{ marginBottom: '12px' }}>
//             <div style={{ fontSize: '10px', color: currentTheme.secondary }}>Focus Rate</div>
//             <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF9800' }}>
//               {studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%
//             </div>
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Eye Openness (EAR)</div>
//           <div style={{ 
//             fontSize: '18px', 
//             fontWeight: 'bold',
//             color: ear < EAR_THRESHOLD ? '#FF0000' : '#4CAF50',
//           }}>
//             {ear.toFixed(3)}
//           </div>
//           <div style={{ fontSize: '9px', color: currentTheme.secondary, marginTop: '4px' }}>
//             Threshold: {EAR_THRESHOLD}
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Drowsiness Level</div>
//           <div style={{ 
//             fontSize: '18px', 
//             fontWeight: 'bold',
//             color: drowsinessLevel > 30 ? '#FF0000' : '#4CAF50',
//           }}>
//             {drowsinessLevel}%
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '10px',
//           borderRadius: '8px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary, marginBottom: '6px' }}>Looking Direction</div>
//           <div style={{ 
//             fontSize: '16px', 
//             fontWeight: 'bold',
//             color: lookingDirection === 'center' ? '#4CAF50' : 
//                    lookingDirection === 'down' ? '#2196F3' : '#FF6347',
//             textTransform: 'capitalize'
//           }}>
//             {lookingDirection}
//           </div>
//           <div style={{ fontSize: '9px', color: currentTheme.secondary, marginTop: '6px' }}>
//             Yaw: {Math.round(headPose.yaw)}° | Pitch: {Math.round(headPose.pitch)}°
//           </div>
//         </div>
//       </div>

//       <style jsx>{`
//         @keyframes pulse {
//           0%, 100% { opacity: 1; transform: scale(1); }
//           50% { opacity: 0.8; transform: scale(1.01); }
//         }
//       `}</style>
//     </div>
//   );
// }

// export default App;


// import { FaceMesh } from "@mediapipe/face_mesh";
// import React, { useRef, useEffect, useState } from "react";
// import * as Facemesh from "@mediapipe/face_mesh";
// import * as cam from "@mediapipe/camera_utils";
// import Webcam from "react-webcam";
// import { Line } from 'react-chartjs-2';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// } from 'chart.js';
// import jsPDF from 'jspdf';

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// );

// function App() {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const connect = window.drawConnectors;
//   var camera = null;

//   const [focusScore, setFocusScore] = useState(0);
//   const [status, setStatus] = useState("Initializing...");
//   const [drowsinessLevel, setDrowsinessLevel] = useState(0);
//   const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
//   const [ear, setEAR] = useState(0);
//   const [alert, setAlert] = useState("");
//   const [studyTime, setStudyTime] = useState(0);
//   const [focusTime, setFocusTime] = useState(0);
//   const [distractionCount, setDistractionCount] = useState(0);
//   const [darkMode, setDarkMode] = useState(true);
//   const [showGraph, setShowGraph] = useState(false);
//   const [focusHistoryData, setFocusHistoryData] = useState([0, 0, 0, 0, 0]);
//   const [timestamps, setTimestamps] = useState(['0:00', '0:00', '0:00', '0:00', '0:00']);
  
//   const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
//   const [pomodoroActive, setPomodoroActive] = useState(false);
//   const [pomodoroMode, setPomodoroMode] = useState('focus');
//   const [breakSuggestion, setBreakSuggestion] = useState("");
//   const [focusReminderEnabled, setFocusReminderEnabled] = useState(false);
//   const [reminderDelay, setReminderDelay] = useState(10);
//   const [dailyGoal, setDailyGoal] = useState(120);
//   const [dailyProgress, setDailyProgress] = useState(0);
//   const [showGoalSettings, setShowGoalSettings] = useState(false);
//   const [streakCount, setStreakCount] = useState(0);
//   const [longestStreak, setLongestStreak] = useState(0);

//   const focusHistory = useRef([]);
//   const closedFrames = useRef(0);
//   const lookingAwayFrames = useRef(0);
//   const lookingDownFrames = useRef(0);
//   const headDownWithEyesClosed = useRef(0);
//   const lastValidLandmarks = useRef(null);
//   const studyTimerRef = useRef(null);
//   const focusTimerRef = useRef(null);
//   const distractionTimerRef = useRef(null);
//   const pomodoroTimerRef = useRef(null);
//   const streakTimerRef = useRef(null);
//   const reminderTimerRef = useRef(null);
//   const isDistractedRef = useRef(false);
//   const currentStreakRef = useRef(0);
//   const audioContextRef = useRef(null);
//   const graphUpdateInterval = useRef(null);
//   const distractionStartTime = useRef(null);

//   const playFocusReminder = () => {
//     if (!focusReminderEnabled || !audioContextRef.current) return;
    
//     const ctx = audioContextRef.current;
//     const oscillator = ctx.createOscillator();
//     const gainNode = ctx.createGain();
    
//     oscillator.connect(gainNode);
//     gainNode.connect(ctx.destination);
    
//     oscillator.frequency.value = 660;
//     gainNode.gain.value = 0.08;
//     oscillator.type = 'sine';
    
//     oscillator.start();
    
//     setTimeout(() => {
//       const osc2 = ctx.createOscillator();
//       const gain2 = ctx.createGain();
//       osc2.connect(gain2);
//       gain2.connect(ctx.destination);
//       osc2.frequency.value = 880;
//       gain2.gain.value = 0.08;
//       osc2.type = 'sine';
//       osc2.start();
//       gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
//       osc2.stop(ctx.currentTime + 0.5);
//     }, 100);
    
//     gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
//     oscillator.stop(ctx.currentTime + 0.5);
//   };

//   const initAudio = () => {
//     if (!audioContextRef.current) {
//       audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
//     }
//     if (audioContextRef.current.state === 'suspended') {
//       audioContextRef.current.resume();
//     }
//   };

//   const toggleFocusReminder = () => {
//     if (!focusReminderEnabled) {
//       initAudio();
//     }
//     setFocusReminderEnabled(!focusReminderEnabled);
//   };

//   useEffect(() => {
//     if (focusReminderEnabled && focusScore < 50) {
//       if (!reminderTimerRef.current) {
//         reminderTimerRef.current = setTimeout(() => {
//           playFocusReminder();
//           reminderTimerRef.current = null;
//         }, reminderDelay * 1000);
//       }
//     } else {
//       if (reminderTimerRef.current) {
//         clearTimeout(reminderTimerRef.current);
//         reminderTimerRef.current = null;
//       }
//     }
    
//     return () => {
//       if (reminderTimerRef.current) {
//         clearTimeout(reminderTimerRef.current);
//       }
//     };
//   }, [focusScore, focusReminderEnabled, reminderDelay]);

//   useEffect(() => {
//     const savedGoal = localStorage.getItem('dailyFocusGoal');
//     const savedProgress = localStorage.getItem('dailyProgress');
//     const savedStreak = localStorage.getItem('longestStreak');
//     const today = new Date().toDateString();
//     const savedDate = localStorage.getItem('progressDate');
    
//     if (savedGoal) setDailyGoal(parseInt(savedGoal));
//     if (savedStreak) setLongestStreak(parseInt(savedStreak));
    
//     if (savedDate === today) {
//       if (savedProgress) setDailyProgress(parseInt(savedProgress));
//     } else {
//       localStorage.setItem('progressDate', today);
//       localStorage.setItem('dailyProgress', '0');
//       setDailyProgress(0);
//     }
//   }, []);

//   useEffect(() => {
//     localStorage.setItem('dailyProgress', dailyProgress.toString());
//     localStorage.setItem('dailyGoal', dailyGoal.toString());
//     localStorage.setItem('longestStreak', longestStreak.toString());
//   }, [dailyProgress, dailyGoal, longestStreak]);

//   useEffect(() => {
//     streakTimerRef.current = setInterval(() => {
//       if (focusScore >= 70) {
//         currentStreakRef.current += 1;
//         setStreakCount(currentStreakRef.current);
//         if (currentStreakRef.current > longestStreak) {
//           setLongestStreak(currentStreakRef.current);
//         }
//       } else {
//         currentStreakRef.current = 0;
//         setStreakCount(0);
//       }
//     }, 60000);
    
//     return () => clearInterval(streakTimerRef.current);
//   }, [focusScore, longestStreak]);

//   useEffect(() => {
//     if (pomodoroActive) {
//       pomodoroTimerRef.current = setInterval(() => {
//         setPomodoroTime(prev => {
//           if (prev <= 1) {
//             if (pomodoroMode === 'focus') {
//               setPomodoroMode('break');
//               setBreakSuggestion("Time for a 5-minute break!");
//               return 5 * 60;
//             } else {
//               setPomodoroMode('focus');
//               setBreakSuggestion("");
//               setPomodoroActive(false);
//               return 25 * 60;
//             }
//           }
//           return prev - 1;
//         });
//       }, 1000);
//     } else if (pomodoroTimerRef.current) {
//       clearInterval(pomodoroTimerRef.current);
//     }
    
//     return () => {
//       if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current);
//     };
//   }, [pomodoroActive, pomodoroMode]);

//   useEffect(() => {
//     if (focusHistory.current.length >= 30) {
//       const recentScores = focusHistory.current.slice(-30);
//       const avgRecent = recentScores.reduce((a, b) => a + b, 0) / 30;
      
//       if (avgRecent < 45 && studyTime > 1800) {
//         setBreakSuggestion("Focus dropping. Consider taking a short break.");
//       }
//     }
//   }, [focusScore, studyTime]);

//   useEffect(() => {
//     const focusedMinutes = Math.floor(focusTime / 60);
//     setDailyProgress(focusedMinutes);
//   }, [focusTime]);

//   useEffect(() => {
//     graphUpdateInterval.current = setInterval(() => {
//       if (focusHistory.current.length > 0) {
//         const now = new Date();
//         const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
//         const avgScore = Math.round(focusHistory.current.reduce((a, b) => a + b, 0) / focusHistory.current.length);
//         setFocusHistoryData(prev => {
//           const newData = [...prev.slice(1), avgScore];
//           return newData;
//         });
//         setTimestamps(prev => {
//           const newTimes = [...prev.slice(1), timeStr];
//           return newTimes;
//         });
//       }
//     }, 10000);
    
//     return () => clearInterval(graphUpdateInterval.current);
//   }, []);

//   const LEFT_EYE = [33, 160, 158, 133, 153, 144];
//   const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
//   const EAR_THRESHOLD = 0.23;
//   const DROWSY_FRAMES = 25;
//   const DISTRACTION_FRAMES = 45;
//   const LOOKING_DOWN_FRAMES = 60;

//   const theme = {
//     dark: {
//       bg: '#0a0a0a',
//       card: '#1a1a1a',
//       text: '#ffffff',
//       secondary: '#888',
//       border: '#333'
//     },
//     light: {
//       bg: '#f5f5f5',
//       card: '#ffffff',
//       text: '#333333',
//       secondary: '#666',
//       border: '#ddd'
//     }
//   };

//   const currentTheme = darkMode ? theme.dark : theme.light;

//   const euclideanDist = (p1, p2) => {
//     return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
//   };

//   const calculateEAR = (eye) => {
//     const A = euclideanDist(eye[1], eye[5]);
//     const B = euclideanDist(eye[2], eye[4]);
//     const C = euclideanDist(eye[0], eye[3]);
//     return (A + B) / (2.0 * C);
//   };

//   const calculateHeadPose = (landmarks) => {
//     const noseTip = landmarks[1];
//     const leftEye = landmarks[33];
//     const rightEye = landmarks[263];
//     const chin = landmarks[152];

//     const faceCenter = {
//       x: (leftEye.x + rightEye.x) / 2,
//       y: (leftEye.y + rightEye.y) / 2
//     };
//     const noseOffset = noseTip.x - faceCenter.x;
//     const eyeDistance = Math.abs(rightEye.x - leftEye.x);
//     const yaw = (noseOffset / eyeDistance) * 90;

//     const noseToChin = chin.y - noseTip.y;
//     const eyeToNose = noseTip.y - faceCenter.y;
//     const pitch = (eyeToNose / noseToChin) * 60 - 30;

//     const eyeYDiff = rightEye.y - leftEye.y;
//     const eyeXDiff = rightEye.x - leftEye.x;
//     const roll = Math.atan2(eyeYDiff, eyeXDiff) * (180 / Math.PI);

//     return { yaw, pitch, roll };
//   };

//   const checkDrowsiness = (earValue, pitch, yaw, closedFramesCount) => {
//     const headDown = pitch > 20;
//     const uprightEyesClosed = Math.abs(pitch) < 15 && earValue < EAR_THRESHOLD;
    
//     if (headDown && earValue < EAR_THRESHOLD) {
//       headDownWithEyesClosed.current += 1;
//     } else {
//       headDownWithEyesClosed.current = 0;
//     }

//     if (headDownWithEyesClosed.current >= 15 || 
//         (uprightEyesClosed && closedFramesCount >= DROWSY_FRAMES * 1.5)) {
//       return true;
//     }
//     return false;
//   };

//   const calculateFocusScore = (landmarks, earValue, pose) => {
//     if (!landmarks || landmarks.length === 0) return 0;

//     let score = 100;

//     if (Math.abs(pose.yaw) > 35) {
//       lookingAwayFrames.current += 1;
//     } else {
//       lookingAwayFrames.current = Math.max(0, lookingAwayFrames.current - 2);
//     }

//     if (pose.pitch > 30 && Math.abs(pose.yaw) < 25) {
//       lookingDownFrames.current += 1;
//     } else {
//       lookingDownFrames.current = Math.max(0, lookingDownFrames.current - 1);
//     }

//     if (lookingAwayFrames.current > DISTRACTION_FRAMES) {
//       score -= 40;
//     } else if (lookingAwayFrames.current > DISTRACTION_FRAMES / 2) {
//       score -= 20;
//     } else if (lookingAwayFrames.current > 10) {
//       score -= 5;
//     }

//     if (lookingDownFrames.current > LOOKING_DOWN_FRAMES) {
//       score -= 30;
//     } else if (lookingDownFrames.current > LOOKING_DOWN_FRAMES / 2) {
//       score -= 15;
//     }

//     if (earValue < EAR_THRESHOLD) {
//       if (closedFrames.current > DROWSY_FRAMES / 2) {
//         score -= 35;
//       } else {
//         score -= 15;
//       }
//     }

//     if (Math.abs(pose.roll) > 25) {
//       score -= 15;
//     }

//     const nose = landmarks[1];
//     const centerOffset = Math.abs(nose.x - 0.5);
//     if (centerOffset > 0.3) score -= 15;
//     else if (centerOffset > 0.2) score -= 5;

//     return Math.max(0, Math.min(100, Math.round(score)));
//   };

//   const updateStatusAndAlerts = (score, earValue, pose) => {
//     const isDrowsy = checkDrowsiness(earValue, pose.pitch, pose.yaw, closedFrames.current);
    
//     if (isDrowsy) {
//       setAlert("DROWSINESS DETECTED! TAKE A BREAK!");
//       setStatus("DROWSY - NEEDS REST");
//       return;
//     }

//     setAlert("");
    
//     if (lookingAwayFrames.current > DISTRACTION_FRAMES) {
//       setStatus("Looking Away - Focus on Screen!");
//     } else if (lookingDownFrames.current > LOOKING_DOWN_FRAMES) {
//       setStatus("Extended Looking Down - Check Screen!");
//     } else if (score >= 80) {
//       setStatus("Highly Focused - Great Job!");
//     } else if (score >= 65) {
//       setStatus("Good Focus");
//     } else if (score >= 50) {
//       setStatus("Slightly Distracted");
//     } else if (score >= 30) {
//       setStatus("Distracted - Try to Focus");
//     } else {
//       setStatus("Not Focused");
//     }

//     if (Math.abs(pose.yaw) > 35 && lookingAwayFrames.current < 10) {
//       setStatus("Quick head turn - OK");
//     } else if (pose.pitch > 30 && lookingDownFrames.current < 30) {
//       setStatus("Reading/Writing - Good!");
//     }
//   };

//   const trackDistraction = (score) => {
//     if (score < 50) {
//       if (!isDistractedRef.current) {
//         isDistractedRef.current = true;
//         distractionStartTime.current = Date.now();
//       }
      
//       if (distractionStartTime.current && (Date.now() - distractionStartTime.current) > 3000) {
//         if (!distractionTimerRef.current) {
//           setDistractionCount(prev => prev + 1);
//           distractionTimerRef.current = setTimeout(() => {
//             distractionTimerRef.current = null;
//           }, 5000);
//         }
//       }
//     } else {
//       if (isDistractedRef.current) {
//         isDistractedRef.current = false;
//         distractionStartTime.current = null;
//         if (distractionTimerRef.current) {
//           clearTimeout(distractionTimerRef.current);
//           distractionTimerRef.current = null;
//         }
//       }
//     }
//   };

//   function onResults(results) {
//     const videoWidth = webcamRef.current.video.videoWidth;
//     const videoHeight = webcamRef.current.video.videoHeight;

//     canvasRef.current.width = videoWidth;
//     canvasRef.current.height = videoHeight;

//     const canvasElement = canvasRef.current;
//     const canvasCtx = canvasElement.getContext("2d");
//     canvasCtx.save();
//     canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
//     canvasCtx.drawImage(
//       results.image,
//       0,
//       0,
//       canvasElement.width,
//       canvasElement.height
//     );

//     if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
//       const landmarks = results.multiFaceLandmarks[0];
//       lastValidLandmarks.current = landmarks;

//       const leftEyePoints = LEFT_EYE.map(idx => landmarks[idx]);
//       const rightEyePoints = RIGHT_EYE.map(idx => landmarks[idx]);

//       const leftEAR = calculateEAR(leftEyePoints);
//       const rightEAR = calculateEAR(rightEyePoints);
//       const earValue = (leftEAR + rightEAR) / 2.0;
//       setEAR(earValue);

//       if (earValue < EAR_THRESHOLD) {
//         closedFrames.current += 1;
//       } else {
//         closedFrames.current = Math.max(0, closedFrames.current - 1);
//       }

//       const drowsiness = Math.max(0, Math.min(100, 
//         (EAR_THRESHOLD - earValue) * 400 + (closedFrames.current / DROWSY_FRAMES) * 50
//       ));
//       setDrowsinessLevel(Math.round(drowsiness));

//       const pose = calculateHeadPose(landmarks);
//       setHeadPose(pose);

//       const currentScore = calculateFocusScore(landmarks, earValue, pose);

//       focusHistory.current.push(currentScore);
//       if (focusHistory.current.length > 15) {
//         focusHistory.current.shift();
//       }
      
//       const weights = focusHistory.current.map((_, i) => (i + 1) / focusHistory.current.length);
//       const weightedSum = focusHistory.current.reduce((sum, score, i) => sum + score * weights[i], 0);
//       const weightSum = weights.reduce((a, b) => a + b, 0);
//       const smoothedScore = Math.round(weightedSum / weightSum);
      
//       setFocusScore(smoothedScore);

//       updateStatusAndAlerts(smoothedScore, earValue, pose);
//       trackDistraction(smoothedScore);

//       const meshColor = alert ? "#FF0000" : 
//         (smoothedScore >= 70 ? "#30FF30" : 
//          smoothedScore >= 50 ? "#FFA500" : "#FF6347");
      
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_TESSELATION, {
//         color: meshColor + "70",
//         lineWidth: 1,
//       });

//       const eyeColor = earValue < EAR_THRESHOLD ? "#FF0000" : "#00FF00";
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, { color: "#FF3030" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, { color: "#30FF30" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, { color: "#E0E0E0" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, { color: "#E0E0E0" });

//       [leftEyePoints, rightEyePoints].forEach(eyePoints => {
//         canvasCtx.beginPath();
//         eyePoints.forEach((point, i) => {
//           const x = point.x * canvasElement.width;
//           const y = point.y * canvasElement.height;
//           if (i === 0) canvasCtx.moveTo(x, y);
//           else canvasCtx.lineTo(x, y);
//         });
//         canvasCtx.closePath();
//         canvasCtx.strokeStyle = eyeColor;
//         canvasCtx.lineWidth = 2;
//         canvasCtx.stroke();
//       });

//       const nose = landmarks[1];
//       canvasCtx.beginPath();
//       canvasCtx.arc(
//         nose.x * canvasElement.width,
//         nose.y * canvasElement.height,
//         6,
//         0,
//         2 * Math.PI
//       );
//       canvasCtx.fillStyle = smoothedScore >= 70 ? "#30FF30" : 
//                            smoothedScore >= 50 ? "#FFA500" : "#FF3030";
//       canvasCtx.fill();

//       canvasCtx.font = '16px Arial';
//       canvasCtx.fillStyle = '#FFFFFF';
//       canvasCtx.fillText(status, 10, 30);

//     } else {
//       setFocusScore(0);
//       setStatus("No Face Detected");
//       setDrowsinessLevel(0);
//       setEAR(0);
//       setHeadPose({ yaw: 0, pitch: 0, roll: 0 });
//       closedFrames.current = 0;
//       lookingAwayFrames.current = 0;
//       lookingDownFrames.current = 0;
//     }

//     canvasCtx.restore();
//   }

//   const exportReport = () => {
//     const doc = new jsPDF();
//     const date = new Date().toLocaleString();
    
//     doc.setFillColor(41, 128, 185);
//     doc.rect(0, 0, 210, 40, 'F');
//     doc.setTextColor(255, 255, 255);
//     doc.setFontSize(24);
//     doc.setFont('helvetica', 'bold');
//     doc.text('FocusGuard Study Report', 105, 25, { align: 'center' });
    
//     doc.setTextColor(0, 0, 0);
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Generated: ${date}`, 105, 45, { align: 'center' });
    
//     doc.setFillColor(240, 240, 240);
//     doc.rect(10, 55, 190, 50, 'F');
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Session Summary', 15, 70);
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Total Study Time: ${formatTime(studyTime)}`, 20, 85);
//     doc.text(`Focused Time: ${formatTime(focusTime)}`, 100, 85);
//     doc.text(`Focus Rate: ${studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%`, 20, 95);
//     doc.text(`Total Distractions: ${distractionCount}`, 100, 95);
    
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Performance Metrics', 15, 120);
    
//     const avgScore = focusHistoryData.length > 0 ? 
//       Math.round(focusHistoryData.reduce((a, b) => a + b, 0) / focusHistoryData.length) : 0;
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Average Focus Score: ${avgScore}%`, 20, 135);
//     doc.text(`Peak Focus Score: ${focusHistoryData.length > 0 ? Math.max(...focusHistoryData) : 0}%`, 100, 135);
//     doc.text(`Longest Focus Streak: ${longestStreak} minutes`, 20, 145);
//     doc.text(`Daily Goal Progress: ${dailyProgress}/${dailyGoal} minutes`, 100, 145);
    
//     doc.save(`focusguard-report-${new Date().toISOString().split('T')[0]}.pdf`);
//   };

//   const resetSession = () => {
//     setStudyTime(0);
//     setFocusTime(0);
//     setDistractionCount(0);
//     setFocusHistoryData([0, 0, 0, 0, 0]);
//     setTimestamps(['0:00', '0:00', '0:00', '0:00', '0:00']);
//     focusHistory.current = [];
//     setPomodoroTime(25 * 60);
//     setPomodoroActive(false);
//     setPomodoroMode('focus');
//     setBreakSuggestion("");
//     isDistractedRef.current = false;
//     distractionStartTime.current = null;
//   };

//   const formatTime = (seconds) => {
//     const hours = Math.floor(seconds / 3600);
//     const mins = Math.floor((seconds % 3600) / 60);
//     const secs = seconds % 60;
//     if (hours > 0) {
//       return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//     }
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const formatPomodoroTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const chartData = {
//     labels: timestamps,
//     datasets: [
//       {
//         label: 'Focus Score',
//         data: focusHistoryData,
//         borderColor: darkMode ? '#4CAF50' : '#2196F3',
//         backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(33, 150, 243, 0.1)',
//         fill: true,
//         tension: 0.4,
//         pointRadius: 3,
//         pointHoverRadius: 6,
//         borderWidth: 2,
//       },
//       {
//         label: 'Threshold (50%)',
//         data: Array(timestamps.length).fill(50),
//         borderColor: '#FFA500',
//         borderDash: [5, 5],
//         borderWidth: 1,
//         fill: false,
//         pointRadius: 0,
//       }
//     ],
//   };

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: {
//       legend: {
//         labels: {
//           color: currentTheme.text,
//           font: { size: 10 }
//         },
//       },
//       title: {
//         display: true,
//         text: 'Focus Timeline',
//         color: currentTheme.text,
//         font: { size: 12, weight: 'bold' }
//       },
//     },
//     scales: {
//       y: {
//         min: 0,
//         max: 100,
//         grid: { color: currentTheme.border },
//         ticks: { color: currentTheme.text, font: { size: 9 } },
//         title: { display: true, text: 'Score (%)', color: currentTheme.text, font: { size: 10 } }
//       },
//       x: {
//         grid: { color: currentTheme.border },
//         ticks: { color: currentTheme.text, font: { size: 9 }, maxRotation: 45 },
//         title: { display: true, text: 'Time', color: currentTheme.text, font: { size: 10 } }
//       },
//     },
//   };

//   useEffect(() => {
//     studyTimerRef.current = setInterval(() => {
//       setStudyTime(prev => prev + 1);
//     }, 1000);

//     focusTimerRef.current = setInterval(() => {
//       if (focusScore >= 50) {
//         setFocusTime(prev => prev + 1);
//       }
//     }, 1000);

//     return () => {
//       clearInterval(studyTimerRef.current);
//       clearInterval(focusTimerRef.current);
//       if (distractionTimerRef.current) clearTimeout(distractionTimerRef.current);
//       if (graphUpdateInterval.current) clearInterval(graphUpdateInterval.current);
//     };
//   }, [focusScore]);

//   useEffect(() => {
//     const faceMesh = new FaceMesh({
//       locateFile: (file) => {
//         return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
//       },
//     });

//     faceMesh.setOptions({
//       maxNumFaces: 1,
//       minDetectionConfidence: 0.5,
//       minTrackingConfidence: 0.5,
//       refineLandmarks: true,
//     });

//     faceMesh.onResults(onResults);

//     if (
//       typeof webcamRef.current !== "undefined" &&
//       webcamRef.current !== null
//     ) {
//       camera = new cam.Camera(webcamRef.current.video, {
//         onFrame: async () => {
//           await faceMesh.send({ image: webcamRef.current.video });
//         },
//         width: 640,
//         height: 480,
//       });
//       camera.start();
//     }

//     return () => {
//       if (camera) {
//         camera.stop();
//       }
//     };
//   }, []);

//   return (
//     <div style={{ 
//       display: 'flex', 
//       backgroundColor: currentTheme.bg,
//       minHeight: '100vh',
//       color: currentTheme.text,
//       padding: '15px',
//       transition: 'all 0.3s ease',
//       gap: '15px'
//     }}>
//       {/* Left Panel - Controls and Stats */}
//       <div style={{
//         width: '280px',
//         display: 'flex',
//         flexDirection: 'column',
//         gap: '12px'
//       }}>
//         <h1 style={{ 
//           color: darkMode ? '#4CAF50' : '#2196F3',
//           fontSize: '22px',
//           margin: '0 0 5px 0'
//         }}>
//           FocusGuard
//         </h1>

//         {/* Theme and Audio Controls */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '10px',
//           border: `1px solid ${currentTheme.border}`
//         }}>
//           <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
//             <button
//               onClick={() => setDarkMode(!darkMode)}
//               style={{
//                 flex: 1,
//                 padding: '8px',
//                 backgroundColor: currentTheme.bg,
//                 color: currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '13px'
//               }}
//             >
//               {darkMode ? 'Light' : 'Dark'}
//             </button>
//             <button
//               onClick={toggleFocusReminder}
//               style={{
//                 flex: 1,
//                 padding: '8px',
//                 backgroundColor: focusReminderEnabled ? '#4CAF50' : currentTheme.bg,
//                 color: focusReminderEnabled ? 'white' : currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '13px'
//               }}
//             >
//               {focusReminderEnabled ? 'Reminder On' : 'Reminder Off'}
//             </button>
//           </div>
          
//           {focusReminderEnabled && (
//             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <span style={{ fontSize: '12px', color: currentTheme.secondary }}>Delay:</span>
//               <input
//                 type="range"
//                 min="5"
//                 max="60"
//                 value={reminderDelay}
//                 onChange={(e) => setReminderDelay(parseInt(e.target.value))}
//                 style={{ flex: 1 }}
//               />
//               <span style={{ fontSize: '12px', color: currentTheme.text, minWidth: '35px' }}>
//                 {reminderDelay}s
//               </span>
//             </div>
//           )}
//         </div>

//         {/* Focus Score and Status */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '15px',
//           borderRadius: '10px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary }}>Focus Score</div>
//           <div style={{ 
//             fontSize: '52px', 
//             fontWeight: 'bold',
//             color: focusScore >= 70 ? '#4CAF50' : focusScore >= 50 ? '#FFA500' : '#FF3030',
//           }}>
//             {focusScore}%
//           </div>
//           <div style={{ 
//             fontSize: '13px', 
//             fontWeight: 'bold',
//             color: status.includes('Highly') || status.includes('Good') ? '#4CAF50' : 
//                    status.includes('DROWSY') ? '#FF0000' : 
//                    status.includes('Reading') ? '#2196F3' : '#FFA500',
//             marginTop: '8px'
//           }}>
//             {status}
//           </div>
//         </div>

//         {/* Pomodoro Timer */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '15px',
//           borderRadius: '10px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary, marginBottom: '5px' }}>
//             {pomodoroMode === 'focus' ? 'Focus Timer' : 'Break Timer'}
//           </div>
//           <div style={{ 
//             fontSize: '36px', 
//             fontWeight: 'bold',
//             color: pomodoroMode === 'focus' ? '#4CAF50' : '#FF9800',
//           }}>
//             {formatPomodoroTime(pomodoroTime)}
//           </div>
//           <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
//             <button
//               onClick={() => setPomodoroActive(!pomodoroActive)}
//               style={{
//                 flex: 1,
//                 padding: '6px',
//                 backgroundColor: pomodoroActive ? '#f44336' : '#4CAF50',
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '12px'
//               }}
//             >
//               {pomodoroActive ? 'Pause' : 'Start'}
//             </button>
//             <button
//               onClick={() => {
//                 setPomodoroTime(25 * 60);
//                 setPomodoroMode('focus');
//                 setPomodoroActive(false);
//               }}
//               style={{
//                 flex: 1,
//                 padding: '6px',
//                 backgroundColor: currentTheme.secondary,
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '5px',
//                 cursor: 'pointer',
//                 fontSize: '12px'
//               }}
//             >
//               Reset
//             </button>
//           </div>
//         </div>

//         {/* Daily Goal */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '15px',
//           borderRadius: '10px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
//             <span style={{ fontSize: '13px', color: currentTheme.secondary }}>Daily Goal</span>
//             <button
//               onClick={() => setShowGoalSettings(!showGoalSettings)}
//               style={{
//                 padding: '3px 8px',
//                 backgroundColor: currentTheme.bg,
//                 color: currentTheme.text,
//                 border: `1px solid ${currentTheme.border}`,
//                 borderRadius: '4px',
//                 cursor: 'pointer',
//                 fontSize: '11px'
//               }}
//             >
//               Set
//             </button>
//           </div>
          
//           {showGoalSettings && (
//             <div style={{ marginBottom: '10px' }}>
//               <input
//                 type="number"
//                 value={dailyGoal}
//                 onChange={(e) => setDailyGoal(Math.max(1, parseInt(e.target.value) || 120))}
//                 style={{
//                   width: '100%',
//                   padding: '5px',
//                   borderRadius: '4px',
//                   border: `1px solid ${currentTheme.border}`,
//                   backgroundColor: currentTheme.bg,
//                   color: currentTheme.text,
//                   fontSize: '12px'
//                 }}
//                 min="1"
//               />
//             </div>
//           )}
          
//           <div style={{ 
//             width: '100%', 
//             height: '8px', 
//             backgroundColor: currentTheme.border, 
//             borderRadius: '4px',
//             marginBottom: '8px'
//           }}>
//             <div style={{ 
//               width: `${Math.min(100, (dailyProgress / dailyGoal) * 100)}%`, 
//               height: '100%', 
//               backgroundColor: dailyProgress >= dailyGoal ? '#4CAF50' : '#2196F3',
//               borderRadius: '4px'
//             }} />
//           </div>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary, textAlign: 'center' }}>
//             {dailyProgress}/{dailyGoal} min
//           </div>
//         </div>

//         {/* Streak */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '10px',
//           border: `1px solid ${currentTheme.border}`,
//           textAlign: 'center'
//         }}>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary }}>Current Streak</div>
//           <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FF9800' }}>
//             {streakCount}
//           </div>
//           <div style={{ fontSize: '11px', color: currentTheme.secondary }}>
//             Best: {longestStreak} min
//           </div>
//         </div>

//         {/* Actions */}
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '10px',
//           border: `1px solid ${currentTheme.border}`,
//           display: 'flex',
//           gap: '8px'
//         }}>
//           <button
//             onClick={() => setShowGraph(!showGraph)}
//             style={{
//               flex: 1,
//               padding: '8px',
//               backgroundColor: currentTheme.bg,
//               color: currentTheme.text,
//               border: `1px solid ${currentTheme.border}`,
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '12px'
//             }}
//           >
//             {showGraph ? 'Hide' : 'Graph'}
//           </button>
//           <button
//             onClick={exportReport}
//             style={{
//               flex: 1,
//               padding: '8px',
//               backgroundColor: '#4CAF50',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '12px'
//             }}
//           >
//             Export
//           </button>
//           <button
//             onClick={resetSession}
//             style={{
//               flex: 1,
//               padding: '8px',
//               backgroundColor: '#f44336',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '12px'
//             }}
//           >
//             Reset
//           </button>
//         </div>
//       </div>

//       {/* Center Panel - Camera and Graph */}
//       <div style={{
//         flex: 1,
//         display: 'flex',
//         flexDirection: 'column',
//         alignItems: 'center',
//         gap: '10px'
//       }}>
//         {alert && (
//           <div style={{
//             backgroundColor: '#ff0000',
//             color: 'white',
//             padding: '8px 15px',
//             borderRadius: '8px',
//             fontSize: '14px',
//             fontWeight: 'bold',
//             animation: 'pulse 1s infinite',
//             boxShadow: '0 0 15px rgba(255,0,0,0.5)',
//             width: '100%',
//             textAlign: 'center'
//           }}>
//             {alert}
//           </div>
//         )}

//         {breakSuggestion && !alert && (
//           <div style={{
//             backgroundColor: '#FF9800',
//             color: 'white',
//             padding: '8px 15px',
//             borderRadius: '8px',
//             fontSize: '13px',
//             width: '100%',
//             textAlign: 'center',
//             fontWeight: 'bold'
//           }}>
//             {breakSuggestion}
//           </div>
//         )}

//         <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
//           <Webcam
//             ref={webcamRef}
//             style={{
//               width: '100%',
//               height: 'auto',
//               aspectRatio: '4/3',
//               borderRadius: '12px',
//               border: alert ? '3px solid #ff0000' : `2px solid ${currentTheme.border}`,
//               boxShadow: alert ? '0 0 20px rgba(255,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)'
//             }}
//             mirrored={true}
//           />
//           <canvas
//             ref={canvasRef}
//             style={{
//               position: "absolute",
//               top: 0,
//               left: 0,
//               width: '100%',
//               height: '100%',
//               borderRadius: '12px',
//             }}
//           />
//         </div>

//         {showGraph && (
//           <div style={{
//             backgroundColor: currentTheme.card,
//             padding: '12px',
//             borderRadius: '10px',
//             width: '100%',
//             maxWidth: '500px',
//             height: '180px',
//             border: `1px solid ${currentTheme.border}`
//           }}>
//             <Line data={chartData} options={chartOptions} />
//           </div>
//         )}
//       </div>

//       {/* Right Panel - Stats */}
//       <div style={{
//         width: '200px',
//         display: 'flex',
//         flexDirection: 'column',
//         gap: '12px'
//       }}>
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '15px',
//           borderRadius: '10px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '13px', color: currentTheme.secondary, marginBottom: '15px', textAlign: 'center' }}>
//             Session Stats
//           </div>
          
//           <div style={{ marginBottom: '15px' }}>
//             <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Study Time</div>
//             <div style={{ fontSize: '22px', fontWeight: 'bold', color: darkMode ? '#4CAF50' : '#2196F3' }}>
//               {formatTime(studyTime)}
//             </div>
//           </div>
          
//           <div style={{ marginBottom: '15px' }}>
//             <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Focused Time</div>
//             <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4CAF50' }}>
//               {formatTime(focusTime)}
//             </div>
//           </div>
          
//           <div style={{ marginBottom: '15px' }}>
//             <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Focus Rate</div>
//             <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#FF9800' }}>
//               {studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%
//             </div>
//           </div>
          
//           <div>
//             <div style={{ fontSize: '11px', color: currentTheme.secondary }}>Distractions</div>
//             <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f44336' }}>
//               {distractionCount}
//             </div>
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '10px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary, marginBottom: '8px' }}>EAR Value</div>
//           <div style={{ 
//             fontSize: '20px', 
//             fontWeight: 'bold',
//             color: ear < EAR_THRESHOLD ? '#FF0000' : '#4CAF50',
//           }}>
//             {ear.toFixed(3)}
//           </div>
//           <div style={{ fontSize: '10px', color: currentTheme.secondary, marginTop: '4px' }}>
//             Threshold: {EAR_THRESHOLD}
//           </div>
//         </div>

//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '12px',
//           borderRadius: '10px',
//           border: `1px solid ${currentTheme.border}`,
//         }}>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary, marginBottom: '8px' }}>Drowsiness</div>
//           <div style={{ 
//             fontSize: '20px', 
//             fontWeight: 'bold',
//             color: drowsinessLevel > 30 ? '#FF0000' : '#4CAF50',
//           }}>
//             {drowsinessLevel}%
//           </div>
//         </div>
//       </div>

//       <style jsx>{`
//         @keyframes pulse {
//           0%, 100% { opacity: 1; transform: scale(1); }
//           50% { opacity: 0.8; transform: scale(1.01); }
//         }
//       `}</style>
//     </div>
//   );
// }

// export default App;


// import React, { useRef, useEffect, useState } from "react";
// import * as Facemesh from "@mediapipe/face_mesh";
// import * as cam from "@mediapipe/camera_utils";
// import Webcam from "react-webcam";
// import { Line } from 'react-chartjs-2';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// } from 'chart.js';
// import jsPDF from 'jspdf';

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// );

// function App() {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const connect = window.drawConnectors;
//   var camera = null;

//   const [focusScore, setFocusScore] = useState(0);
//   const [status, setStatus] = useState("Initializing...");
//   const [drowsinessLevel, setDrowsinessLevel] = useState(0);
//   const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
//   const [ear, setEAR] = useState(0);
//   const [alert, setAlert] = useState("");
//   const [studyTime, setStudyTime] = useState(0);
//   const [focusTime, setFocusTime] = useState(0);
//   const [distractionCount, setDistractionCount] = useState(0);
//   const [darkMode, setDarkMode] = useState(true);
//   const [showGraph, setShowGraph] = useState(false);
//   const [focusHistoryData, setFocusHistoryData] = useState([]);
//   const [timestamps, setTimestamps] = useState([]);
  
//   // New state variables
//   const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 minutes in seconds
//   const [pomodoroActive, setPomodoroActive] = useState(false);
//   const [pomodoroMode, setPomodoroMode] = useState('focus'); // 'focus' or 'break'
//   const [breakSuggestion, setBreakSuggestion] = useState("");
//   const [audioEnabled, setAudioEnabled] = useState(false);
//   const [dailyGoal, setDailyGoal] = useState(120); // 120 minutes default
//   const [dailyProgress, setDailyProgress] = useState(0);
//   const [showGoalSettings, setShowGoalSettings] = useState(false);
//   const [audioPermission, setAudioPermission] = useState(false);
//   const [streakCount, setStreakCount] = useState(0);
//   const [longestStreak, setLongestStreak] = useState(0);

//   const focusHistory = useRef([]);
//   const closedFrames = useRef(0);
//   const lookingAwayFrames = useRef(0);
//   const lookingDownFrames = useRef(0);
//   const headDownWithEyesClosed = useRef(0);
//   const lastValidLandmarks = useRef(null);
//   const studyTimerRef = useRef(null);
//   const focusTimerRef = useRef(null);
//   const distractionTimerRef = useRef(null);
//   const pomodoroTimerRef = useRef(null);
//   const streakTimerRef = useRef(null);
//   const isDistractedRef = useRef(false);
//   const currentStreakRef = useRef(0);
//   const audioContextRef = useRef(null);
//   const graphUpdateInterval = useRef(null);

//   // Audio feedback function
//   const playSound = (type) => {
//     if (!audioEnabled || !audioContextRef.current) return;
    
//     const ctx = audioContextRef.current;
//     const oscillator = ctx.createOscillator();
//     const gainNode = ctx.createGain();
    
//     oscillator.connect(gainNode);
//     gainNode.connect(ctx.destination);
    
//     if (type === 'distraction') {
//       oscillator.frequency.value = 440;
//       gainNode.gain.value = 0.1;
//       oscillator.type = 'sine';
//     } else if (type === 'drowsiness') {
//       oscillator.frequency.value = 880;
//       gainNode.gain.value = 0.15;
//       oscillator.type = 'square';
//     } else if (type === 'break') {
//       oscillator.frequency.value = 523;
//       gainNode.gain.value = 0.1;
//       oscillator.type = 'sine';
//     }
    
//     oscillator.start();
//     gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
//     oscillator.stop(ctx.currentTime + 0.3);
//   };

//   // Initialize audio context
//   const initAudio = () => {
//     if (!audioContextRef.current) {
//       audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
//     }
//     if (audioContextRef.current.state === 'suspended') {
//       audioContextRef.current.resume();
//     }
//     setAudioPermission(true);
//   };

//   // Toggle audio
//   const toggleAudio = () => {
//     if (!audioEnabled) {
//       initAudio();
//     }
//     setAudioEnabled(!audioEnabled);
//   };

//   // Load saved data from localStorage
//   useEffect(() => {
//     const savedGoal = localStorage.getItem('dailyFocusGoal');
//     const savedProgress = localStorage.getItem('dailyProgress');
//     const savedStreak = localStorage.getItem('longestStreak');
//     const today = new Date().toDateString();
//     const savedDate = localStorage.getItem('progressDate');
    
//     if (savedGoal) setDailyGoal(parseInt(savedGoal));
//     if (savedStreak) setLongestStreak(parseInt(savedStreak));
    
//     if (savedDate === today) {
//       if (savedProgress) setDailyProgress(parseInt(savedProgress));
//     } else {
//       localStorage.setItem('progressDate', today);
//       localStorage.setItem('dailyProgress', '0');
//       setDailyProgress(0);
//     }
//   }, []);

//   // Save daily progress
//   useEffect(() => {
//     localStorage.setItem('dailyProgress', dailyProgress.toString());
//     localStorage.setItem('dailyGoal', dailyGoal.toString());
//     localStorage.setItem('longestStreak', longestStreak.toString());
//   }, [dailyProgress, dailyGoal, longestStreak]);

//   // Streak tracking
//   useEffect(() => {
//     streakTimerRef.current = setInterval(() => {
//       if (focusScore >= 70) {
//         currentStreakRef.current += 1;
//         setStreakCount(currentStreakRef.current);
//         if (currentStreakRef.current > longestStreak) {
//           setLongestStreak(currentStreakRef.current);
//         }
//       } else {
//         currentStreakRef.current = 0;
//         setStreakCount(0);
//       }
//     }, 60000); // Check every minute
    
//     return () => clearInterval(streakTimerRef.current);
//   }, [focusScore, longestStreak]);

//   // Pomodoro Timer
//   useEffect(() => {
//     if (pomodoroActive) {
//       pomodoroTimerRef.current = setInterval(() => {
//         setPomodoroTime(prev => {
//           if (prev <= 1) {
//             // Timer complete
//             if (pomodoroMode === 'focus') {
//               setPomodoroMode('break');
//               setBreakSuggestion("Time for a 5-minute break!");
//               playSound('break');
//               return 5 * 60;
//             } else {
//               setPomodoroMode('focus');
//               setBreakSuggestion("");
//               setPomodoroActive(false);
//               return 25 * 60;
//             }
//           }
//           return prev - 1;
//         });
//       }, 1000);
//     } else if (pomodoroTimerRef.current) {
//       clearInterval(pomodoroTimerRef.current);
//     }
    
//     return () => {
//       if (pomodoroTimerRef.current) clearInterval(pomodoroTimerRef.current);
//     };
//   }, [pomodoroActive, pomodoroMode]);

//   // Auto break suggestion based on focus degradation
//   useEffect(() => {
//     if (focusHistory.current.length >= 30) {
//       const recentScores = focusHistory.current.slice(-30);
//       const avgRecent = recentScores.reduce((a, b) => a + b, 0) / 30;
      
//       if (avgRecent < 45 && studyTime > 1800) { // 30 minutes
//         setBreakSuggestion("Focus dropping. Consider taking a short break.");
//       }
//     }
//   }, [focusScore, studyTime]);

//   // Update daily progress
//   useEffect(() => {
//     const focusedMinutes = Math.floor(focusTime / 60);
//     setDailyProgress(focusedMinutes);
//   }, [focusTime]);

//   // Graph data update
//   useEffect(() => {
//     graphUpdateInterval.current = setInterval(() => {
//       if (focusHistory.current.length > 0) {
//         const now = new Date();
//         const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
//         const avgScore = Math.round(focusHistory.current.reduce((a, b) => a + b, 0) / focusHistory.current.length);
//         setFocusHistoryData(prev => {
//           const newData = [...prev, avgScore];
//           return newData.slice(-20);
//         });
//         setTimestamps(prev => {
//           const newTimes = [...prev, timeStr];
//           return newTimes.slice(-20);
//         });
//       }
//     }, 30000); // Update every 30 seconds
    
//     return () => clearInterval(graphUpdateInterval.current);
//   }, []);

//   // Eye landmark indices
//   const LEFT_EYE = [33, 160, 158, 133, 153, 144];
//   const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
//   const EAR_THRESHOLD = 0.23;
//   const DROWSY_FRAMES = 25;
//   const DISTRACTION_FRAMES = 45;
//   const LOOKING_DOWN_FRAMES = 60;

//   const theme = {
//     dark: {
//       bg: '#0a0a0a',
//       card: '#1a1a1a',
//       text: '#ffffff',
//       secondary: '#888',
//       border: '#333'
//     },
//     light: {
//       bg: '#f5f5f5',
//       card: '#ffffff',
//       text: '#333333',
//       secondary: '#666',
//       border: '#ddd'
//     }
//   };

//   const currentTheme = darkMode ? theme.dark : theme.light;

//   const euclideanDist = (p1, p2) => {
//     return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
//   };

//   const calculateEAR = (eye) => {
//     const A = euclideanDist(eye[1], eye[5]);
//     const B = euclideanDist(eye[2], eye[4]);
//     const C = euclideanDist(eye[0], eye[3]);
//     return (A + B) / (2.0 * C);
//   };

//   const calculateHeadPose = (landmarks) => {
//     const noseTip = landmarks[1];
//     const leftEye = landmarks[33];
//     const rightEye = landmarks[263];
//     const chin = landmarks[152];

//     const faceCenter = {
//       x: (leftEye.x + rightEye.x) / 2,
//       y: (leftEye.y + rightEye.y) / 2
//     };
//     const noseOffset = noseTip.x - faceCenter.x;
//     const eyeDistance = Math.abs(rightEye.x - leftEye.x);
//     const yaw = (noseOffset / eyeDistance) * 90;

//     const noseToChin = chin.y - noseTip.y;
//     const eyeToNose = noseTip.y - faceCenter.y;
//     const pitch = (eyeToNose / noseToChin) * 60 - 30;

//     const eyeYDiff = rightEye.y - leftEye.y;
//     const eyeXDiff = rightEye.x - leftEye.x;
//     const roll = Math.atan2(eyeYDiff, eyeXDiff) * (180 / Math.PI);

//     return { yaw, pitch, roll };
//   };

//   const checkDrowsiness = (earValue, pitch, yaw, closedFramesCount) => {
//     const headDown = pitch > 20;
//     const uprightEyesClosed = Math.abs(pitch) < 15 && earValue < EAR_THRESHOLD;
    
//     if (headDown && earValue < EAR_THRESHOLD) {
//       headDownWithEyesClosed.current += 1;
//     } else {
//       headDownWithEyesClosed.current = 0;
//     }

//     if (headDownWithEyesClosed.current >= 15 || 
//         (uprightEyesClosed && closedFramesCount >= DROWSY_FRAMES * 1.5)) {
//       return true;
//     }
//     return false;
//   };

//   const calculateFocusScore = (landmarks, earValue, pose) => {
//     if (!landmarks || landmarks.length === 0) return 0;

//     let score = 100;

//     if (Math.abs(pose.yaw) > 35) {
//       lookingAwayFrames.current += 1;
//     } else {
//       lookingAwayFrames.current = Math.max(0, lookingAwayFrames.current - 2);
//     }

//     if (pose.pitch > 30 && Math.abs(pose.yaw) < 25) {
//       lookingDownFrames.current += 1;
//     } else {
//       lookingDownFrames.current = Math.max(0, lookingDownFrames.current - 1);
//     }

//     if (lookingAwayFrames.current > DISTRACTION_FRAMES) {
//       score -= 40;
//     } else if (lookingAwayFrames.current > DISTRACTION_FRAMES / 2) {
//       score -= 20;
//     } else if (lookingAwayFrames.current > 10) {
//       score -= 5;
//     }

//     if (lookingDownFrames.current > LOOKING_DOWN_FRAMES) {
//       score -= 30;
//     } else if (lookingDownFrames.current > LOOKING_DOWN_FRAMES / 2) {
//       score -= 15;
//     }

//     if (earValue < EAR_THRESHOLD) {
//       if (closedFrames.current > DROWSY_FRAMES / 2) {
//         score -= 35;
//       } else {
//         score -= 15;
//       }
//     }

//     if (Math.abs(pose.roll) > 25) {
//       score -= 15;
//     }

//     const nose = landmarks[1];
//     const centerOffset = Math.abs(nose.x - 0.5);
//     if (centerOffset > 0.3) score -= 15;
//     else if (centerOffset > 0.2) score -= 5;

//     return Math.max(0, Math.min(100, Math.round(score)));
//   };

//   const updateStatusAndAlerts = (score, earValue, pose) => {
//     const isDrowsy = checkDrowsiness(earValue, pose.pitch, pose.yaw, closedFrames.current);
    
//     if (isDrowsy) {
//       setAlert("DROWSINESS DETECTED! TAKE A BREAK!");
//       setStatus("DROWSY - NEEDS REST");
//       if (audioEnabled) playSound('drowsiness');
//       return;
//     }

//     setAlert("");
    
//     if (lookingAwayFrames.current > DISTRACTION_FRAMES) {
//       setStatus("Looking Away - Focus on Screen!");
//       if (audioEnabled && lookingAwayFrames.current === DISTRACTION_FRAMES + 1) {
//         playSound('distraction');
//       }
//     } else if (lookingDownFrames.current > LOOKING_DOWN_FRAMES) {
//       setStatus("Extended Looking Down - Check Screen!");
//     } else if (score >= 80) {
//       setStatus("Highly Focused - Great Job!");
//     } else if (score >= 65) {
//       setStatus("Good Focus");
//     } else if (score >= 50) {
//       setStatus("Slightly Distracted");
//     } else if (score >= 30) {
//       setStatus("Distracted - Try to Focus");
//     } else {
//       setStatus("Not Focused");
//     }

//     if (Math.abs(pose.yaw) > 35 && lookingAwayFrames.current < 10) {
//       setStatus("Quick head turn - OK");
//     } else if (pose.pitch > 30 && lookingDownFrames.current < 30) {
//       setStatus("Reading/Writing - Good!");
//     }
//   };

//   const trackDistraction = (score) => {
//     if (score < 50 && !isDistractedRef.current) {
//       isDistractedRef.current = true;
//       distractionTimerRef.current = setTimeout(() => {
//         if (focusScore < 50) {
//           setDistractionCount(prev => prev + 1);
//         }
//         isDistractedRef.current = false;
//       }, 3000);
//     } else if (score >= 50) {
//       if (distractionTimerRef.current) {
//         clearTimeout(distractionTimerRef.current);
//       }
//       isDistractedRef.current = false;
//     }
//   };

//   function onResults(results) {
//     const videoWidth = webcamRef.current.video.videoWidth;
//     const videoHeight = webcamRef.current.video.videoHeight;

//     canvasRef.current.width = videoWidth;
//     canvasRef.current.height = videoHeight;

//     const canvasElement = canvasRef.current;
//     const canvasCtx = canvasElement.getContext("2d");
//     canvasCtx.save();
//     canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
//     canvasCtx.drawImage(
//       results.image,
//       0,
//       0,
//       canvasElement.width,
//       canvasElement.height
//     );

//     if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
//       const landmarks = results.multiFaceLandmarks[0];
//       lastValidLandmarks.current = landmarks;

//       const leftEyePoints = LEFT_EYE.map(idx => landmarks[idx]);
//       const rightEyePoints = RIGHT_EYE.map(idx => landmarks[idx]);

//       const leftEAR = calculateEAR(leftEyePoints);
//       const rightEAR = calculateEAR(rightEyePoints);
//       const earValue = (leftEAR + rightEAR) / 2.0;
//       setEAR(earValue);

//       if (earValue < EAR_THRESHOLD) {
//         closedFrames.current += 1;
//       } else {
//         closedFrames.current = Math.max(0, closedFrames.current - 1);
//       }

//       const drowsiness = Math.max(0, Math.min(100, 
//         (EAR_THRESHOLD - earValue) * 400 + (closedFrames.current / DROWSY_FRAMES) * 50
//       ));
//       setDrowsinessLevel(Math.round(drowsiness));

//       const pose = calculateHeadPose(landmarks);
//       setHeadPose(pose);

//       const currentScore = calculateFocusScore(landmarks, earValue, pose);

//       focusHistory.current.push(currentScore);
//       if (focusHistory.current.length > 15) {
//         focusHistory.current.shift();
//       }
      
//       const weights = focusHistory.current.map((_, i) => (i + 1) / focusHistory.current.length);
//       const weightedSum = focusHistory.current.reduce((sum, score, i) => sum + score * weights[i], 0);
//       const weightSum = weights.reduce((a, b) => a + b, 0);
//       const smoothedScore = Math.round(weightedSum / weightSum);
      
//       setFocusScore(smoothedScore);

//       updateStatusAndAlerts(smoothedScore, earValue, pose);
//       trackDistraction(smoothedScore);

//       const meshColor = alert ? "#FF0000" : 
//         (smoothedScore >= 70 ? "#30FF30" : 
//          smoothedScore >= 50 ? "#FFA500" : "#FF6347");
      
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_TESSELATION, {
//         color: meshColor + "70",
//         lineWidth: 1,
//       });

//       const eyeColor = earValue < EAR_THRESHOLD ? "#FF0000" : "#00FF00";
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, { color: "#FF3030" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, { color: "#30FF30" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, { color: "#E0E0E0" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, { color: "#E0E0E0" });

//       [leftEyePoints, rightEyePoints].forEach(eyePoints => {
//         canvasCtx.beginPath();
//         eyePoints.forEach((point, i) => {
//           const x = point.x * canvasElement.width;
//           const y = point.y * canvasElement.height;
//           if (i === 0) canvasCtx.moveTo(x, y);
//           else canvasCtx.lineTo(x, y);
//         });
//         canvasCtx.closePath();
//         canvasCtx.strokeStyle = eyeColor;
//         canvasCtx.lineWidth = 2;
//         canvasCtx.stroke();
//       });

//       const nose = landmarks[1];
//       canvasCtx.beginPath();
//       canvasCtx.arc(
//         nose.x * canvasElement.width,
//         nose.y * canvasElement.height,
//         6,
//         0,
//         2 * Math.PI
//       );
//       canvasCtx.fillStyle = smoothedScore >= 70 ? "#30FF30" : 
//                            smoothedScore >= 50 ? "#FFA500" : "#FF3030";
//       canvasCtx.fill();

//       canvasCtx.font = '16px Arial';
//       canvasCtx.fillStyle = '#FFFFFF';
//       canvasCtx.fillText(status, 10, 30);

//     } else {
//       setFocusScore(0);
//       setStatus("No Face Detected");
//       setDrowsinessLevel(0);
//       setEAR(0);
//       setHeadPose({ yaw: 0, pitch: 0, roll: 0 });
//       closedFrames.current = 0;
//       lookingAwayFrames.current = 0;
//       lookingDownFrames.current = 0;
//     }

//     canvasCtx.restore();
//   }

//   const exportReport = () => {
//     const doc = new jsPDF();
//     const date = new Date().toLocaleString();
    
//     // Header
//     doc.setFillColor(41, 128, 185);
//     doc.rect(0, 0, 210, 40, 'F');
//     doc.setTextColor(255, 255, 255);
//     doc.setFontSize(24);
//     doc.setFont('helvetica', 'bold');
//     doc.text('FocusGuard Study Report', 105, 25, { align: 'center' });
    
//     doc.setTextColor(0, 0, 0);
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Generated: ${date}`, 105, 45, { align: 'center' });
    
//     // Summary Section
//     doc.setFillColor(240, 240, 240);
//     doc.rect(10, 55, 190, 50, 'F');
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Session Summary', 15, 70);
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Total Study Time: ${formatTime(studyTime)}`, 20, 85);
//     doc.text(`Focused Time: ${formatTime(focusTime)}`, 100, 85);
//     doc.text(`Focus Rate: ${studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%`, 20, 95);
//     doc.text(`Total Distractions: ${distractionCount}`, 100, 95);
    
//     // Performance Metrics
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Performance Metrics', 15, 120);
    
//     const avgScore = focusHistoryData.length > 0 ? 
//       Math.round(focusHistoryData.reduce((a, b) => a + b, 0) / focusHistoryData.length) : 0;
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
//     doc.text(`Average Focus Score: ${avgScore}%`, 20, 135);
//     doc.text(`Peak Focus Score: ${focusHistoryData.length > 0 ? Math.max(...focusHistoryData) : 0}%`, 100, 135);
//     doc.text(`Longest Focus Streak: ${longestStreak} minutes`, 20, 145);
//     doc.text(`Daily Goal Progress: ${dailyProgress}/${dailyGoal} minutes`, 100, 145);
    
//     // Focus Timeline Graph (ASCII representation)
//     doc.setFontSize(14);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Focus Timeline', 15, 170);
    
//     if (focusHistoryData.length > 0) {
//       const graphWidth = 170;
//       const graphHeight = 40;
//       const startX = 20;
//       const startY = 190;
      
//       doc.setDrawColor(200, 200, 200);
//       doc.rect(startX, startY, graphWidth, graphHeight);
      
//       const barWidth = graphWidth / focusHistoryData.length;
//       focusHistoryData.forEach((score, i) => {
//         const barHeight = (score / 100) * graphHeight;
//         const x = startX + (i * barWidth);
//         const y = startY + graphHeight - barHeight;
        
//         if (score >= 70) doc.setFillColor(46, 204, 113);
//         else if (score >= 50) doc.setFillColor(241, 196, 15);
//         else doc.setFillColor(231, 76, 60);
        
//         doc.rect(x, y, barWidth - 1, barHeight, 'F');
//       });
//     }
    
//     // Recommendations
//     doc.addPage();
//     doc.setFontSize(16);
//     doc.setFont('helvetica', 'bold');
//     doc.text('Recommendations', 15, 20);
    
//     doc.setFontSize(11);
//     doc.setFont('helvetica', 'normal');
    
//     const recommendations = [];
//     if (avgScore < 60) recommendations.push('Consider taking more frequent breaks to maintain focus.');
//     if (distractionCount > 10) recommendations.push('Try to minimize environmental distractions during study sessions.');
//     if (dailyProgress < dailyGoal) recommendations.push(`You're ${dailyGoal - dailyProgress} minutes away from your daily goal. Keep going!`);
//     if (drowsinessLevel > 30) recommendations.push('Ensure you are well-rested before study sessions to prevent drowsiness.');
    
//     if (recommendations.length === 0) {
//       recommendations.push('Great work! Maintain your current study habits for continued success.');
//     }
    
//     recommendations.forEach((rec, i) => {
//       doc.text(`• ${rec}`, 20, 40 + (i * 10));
//     });
    
//     // Footer
//     doc.setFontSize(9);
//     doc.setTextColor(128, 128, 128);
//     doc.text('Generated by FocusGuard - Your Personal Study Assistant', 105, 280, { align: 'center' });
    
//     doc.save(`focusguard-report-${new Date().toISOString().split('T')[0]}.pdf`);
//   };

//   const resetSession = () => {
//     setStudyTime(0);
//     setFocusTime(0);
//     setDistractionCount(0);
//     setFocusHistoryData([]);
//     setTimestamps([]);
//     focusHistory.current = [];
//     setPomodoroTime(25 * 60);
//     setPomodoroActive(false);
//     setPomodoroMode('focus');
//     setBreakSuggestion("");
//   };

//   const formatTime = (seconds) => {
//     const hours = Math.floor(seconds / 3600);
//     const mins = Math.floor((seconds % 3600) / 60);
//     const secs = seconds % 60;
//     if (hours > 0) {
//       return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//     }
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const formatPomodoroTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const chartData = {
//     labels: timestamps.length > 0 ? timestamps : ['Start'],
//     datasets: [
//       {
//         label: 'Focus Score',
//         data: focusHistoryData.length > 0 ? focusHistoryData : [0],
//         borderColor: darkMode ? '#4CAF50' : '#2196F3',
//         backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(33, 150, 243, 0.1)',
//         fill: true,
//         tension: 0.4,
//         pointRadius: 3,
//         pointHoverRadius: 6,
//         borderWidth: 2,
//       },
//       {
//         label: 'Focus Threshold (50%)',
//         data: Array(timestamps.length || 1).fill(50),
//         borderColor: '#FFA500',
//         borderDash: [5, 5],
//         borderWidth: 1,
//         fill: false,
//         pointRadius: 0,
//       }
//     ],
//   };

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: {
//       legend: {
//         labels: {
//           color: currentTheme.text,
//           font: { size: 12 }
//         },
//       },
//       title: {
//         display: true,
//         text: 'Focus Score Timeline',
//         color: currentTheme.text,
//         font: { size: 16, weight: 'bold' }
//       },
//       tooltip: {
//         backgroundColor: darkMode ? '#333' : '#fff',
//         titleColor: currentTheme.text,
//         bodyColor: currentTheme.text,
//       }
//     },
//     scales: {
//       y: {
//         min: 0,
//         max: 100,
//         grid: {
//           color: currentTheme.border,
//         },
//         ticks: {
//           color: currentTheme.text,
//         },
//         title: {
//           display: true,
//           text: 'Focus Score (%)',
//           color: currentTheme.text,
//         }
//       },
//       x: {
//         grid: {
//           color: currentTheme.border,
//         },
//         ticks: {
//           color: currentTheme.text,
//           maxRotation: 45,
//         },
//         title: {
//           display: true,
//           text: 'Time',
//           color: currentTheme.text,
//         }
//       },
//     },
//   };

//   useEffect(() => {
//     studyTimerRef.current = setInterval(() => {
//       setStudyTime(prev => prev + 1);
//     }, 1000);

//     focusTimerRef.current = setInterval(() => {
//       if (focusScore >= 50) {
//         setFocusTime(prev => prev + 1);
//       }
//     }, 1000);

//     return () => {
//       clearInterval(studyTimerRef.current);
//       clearInterval(focusTimerRef.current);
//       if (distractionTimerRef.current) {
//         clearTimeout(distractionTimerRef.current);
//       }
//       if (graphUpdateInterval.current) {
//         clearInterval(graphUpdateInterval.current);
//       }
//     };
//   }, [focusScore]);

//   useEffect(() => {
//     const faceMesh = new FaceMesh({
//       locateFile: (file) => {
//         return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
//       },
//     });

//     faceMesh.setOptions({
//       maxNumFaces: 1,
//       minDetectionConfidence: 0.5,
//       minTrackingConfidence: 0.5,
//       refineLandmarks: true,
//     });

//     faceMesh.onResults(onResults);

//     if (
//       typeof webcamRef.current !== "undefined" &&
//       webcamRef.current !== null
//     ) {
//       camera = new cam.Camera(webcamRef.current.video, {
//         onFrame: async () => {
//           await faceMesh.send({ image: webcamRef.current.video });
//         },
//         width: 640,
//         height: 480,
//       });
//       camera.start();
//     }

//     return () => {
//       if (camera) {
//         camera.stop();
//       }
//     };
//   }, []);

//   return (
//     <div style={{ 
//       display: 'flex', 
//       flexDirection: 'column', 
//       alignItems: 'center',
//       backgroundColor: currentTheme.bg,
//       minHeight: '100vh',
//       color: currentTheme.text,
//       padding: '20px',
//       transition: 'all 0.3s ease'
//     }}>
//       <div style={{ 
//         display: 'flex', 
//         justifyContent: 'space-between', 
//         alignItems: 'center',
//         width: '900px',
//         marginBottom: '10px',
//         flexWrap: 'wrap',
//         gap: '10px'
//       }}>
//         <h1 style={{ 
//           color: darkMode ? '#4CAF50' : '#2196F3',
//           fontSize: '28px',
//           margin: 0
//         }}>
//           FocusGuard Study Tracker
//         </h1>
//         <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
//           <button
//             onClick={() => setDarkMode(!darkMode)}
//             style={{
//               padding: '8px 12px',
//               backgroundColor: currentTheme.card,
//               color: currentTheme.text,
//               border: `1px solid ${currentTheme.border}`,
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '14px'
//             }}
//           >
//             {darkMode ? 'Light' : 'Dark'}
//           </button>
//           <button
//             onClick={toggleAudio}
//             style={{
//               padding: '8px 12px',
//               backgroundColor: audioEnabled ? '#4CAF50' : currentTheme.card,
//               color: audioEnabled ? 'white' : currentTheme.text,
//               border: `1px solid ${currentTheme.border}`,
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '14px'
//             }}
//           >
//             {audioEnabled ? 'Audio On' : 'Audio Off'}
//           </button>
//           <button
//             onClick={() => setShowGraph(!showGraph)}
//             style={{
//               padding: '8px 12px',
//               backgroundColor: currentTheme.card,
//               color: currentTheme.text,
//               border: `1px solid ${currentTheme.border}`,
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '14px'
//             }}
//           >
//             {showGraph ? 'Hide Graph' : 'Show Graph'}
//           </button>
//           <button
//             onClick={() => setShowGoalSettings(!showGoalSettings)}
//             style={{
//               padding: '8px 12px',
//               backgroundColor: currentTheme.card,
//               color: currentTheme.text,
//               border: `1px solid ${currentTheme.border}`,
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '14px'
//             }}
//           >
//             Set Goal
//           </button>
//           <button
//             onClick={exportReport}
//             style={{
//               padding: '8px 12px',
//               backgroundColor: '#4CAF50',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '14px'
//             }}
//           >
//             Export
//           </button>
//           <button
//             onClick={resetSession}
//             style={{
//               padding: '8px 12px',
//               backgroundColor: '#f44336',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '14px'
//             }}
//           >
//             Reset
//           </button>
//         </div>
//       </div>

//       {showGoalSettings && (
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '15px 20px',
//           borderRadius: '10px',
//           width: '900px',
//           marginBottom: '15px',
//           border: `1px solid ${currentTheme.border}`,
//           display: 'flex',
//           alignItems: 'center',
//           gap: '15px'
//         }}>
//           <span style={{ color: currentTheme.text }}>Daily Focus Goal (minutes):</span>
//           <input
//             type="number"
//             value={dailyGoal}
//             onChange={(e) => setDailyGoal(Math.max(1, parseInt(e.target.value) || 120))}
//             style={{
//               padding: '5px 10px',
//               borderRadius: '5px',
//               border: `1px solid ${currentTheme.border}`,
//               backgroundColor: currentTheme.bg,
//               color: currentTheme.text,
//               width: '80px'
//             }}
//             min="1"
//           />
//           <span style={{ color: currentTheme.secondary, marginLeft: 'auto' }}>
//             Progress: {dailyProgress}/{dailyGoal} min
//           </span>
//         </div>
//       )}

//       {breakSuggestion && (
//         <div style={{
//           backgroundColor: '#FF9800',
//           color: 'white',
//           padding: '12px 20px',
//           borderRadius: '8px',
//           marginBottom: '15px',
//           width: '900px',
//           textAlign: 'center',
//           fontWeight: 'bold'
//         }}>
//           {breakSuggestion}
//         </div>
//       )}

//       {alert && (
//         <div style={{
//           backgroundColor: '#ff0000',
//           color: 'white',
//           padding: '15px 30px',
//           borderRadius: '10px',
//           fontSize: '20px',
//           fontWeight: 'bold',
//           marginBottom: '15px',
//           animation: 'pulse 1s infinite',
//           boxShadow: '0 0 20px rgba(255,0,0,0.5)',
//           width: '900px',
//           textAlign: 'center'
//         }}>
//           {alert}
//         </div>
//       )}

//       <div style={{ 
//         display: 'flex', 
//         gap: '15px', 
//         marginBottom: '20px',
//         backgroundColor: currentTheme.card,
//         padding: '20px',
//         borderRadius: '15px',
//         width: '900px',
//         justifyContent: 'space-around',
//         boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
//         border: `1px solid ${currentTheme.border}`
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '13px', color: currentTheme.secondary }}>Focus Score</div>
//           <div style={{ 
//             fontSize: '48px', 
//             fontWeight: 'bold',
//             color: focusScore >= 70 ? '#4CAF50' : focusScore >= 50 ? '#FFA500' : '#FF3030',
//           }}>
//             {focusScore}%
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '13px', color: currentTheme.secondary }}>Status</div>
//           <div style={{ 
//             fontSize: '18px', 
//             fontWeight: 'bold',
//             color: status.includes('Highly') || status.includes('Good') ? '#4CAF50' : 
//                    status.includes('DROWSY') ? '#FF0000' : 
//                    status.includes('Reading') ? '#2196F3' : '#FFA500',
//             marginTop: '12px',
//             maxWidth: '220px'
//           }}>
//             {status}
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '13px', color: currentTheme.secondary }}>Pomodoro</div>
//           <div style={{ 
//             fontSize: '24px', 
//             fontWeight: 'bold',
//             color: pomodoroMode === 'focus' ? '#4CAF50' : '#FF9800',
//             marginTop: '8px'
//           }}>
//             {formatPomodoroTime(pomodoroTime)}
//           </div>
//           <div style={{ marginTop: '5px' }}>
//             <button
//               onClick={() => setPomodoroActive(!pomodoroActive)}
//               style={{
//                 padding: '4px 12px',
//                 backgroundColor: pomodoroActive ? '#f44336' : '#4CAF50',
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '4px',
//                 cursor: 'pointer',
//                 fontSize: '12px',
//                 marginRight: '5px'
//               }}
//             >
//               {pomodoroActive ? 'Pause' : 'Start'}
//             </button>
//             <button
//               onClick={() => {
//                 setPomodoroTime(25 * 60);
//                 setPomodoroMode('focus');
//                 setPomodoroActive(false);
//               }}
//               style={{
//                 padding: '4px 8px',
//                 backgroundColor: currentTheme.secondary,
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '4px',
//                 cursor: 'pointer',
//                 fontSize: '12px'
//               }}
//             >
//               Reset
//             </button>
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '13px', color: currentTheme.secondary }}>Daily Goal</div>
//           <div style={{ 
//             fontSize: '20px', 
//             fontWeight: 'bold',
//             color: dailyProgress >= dailyGoal ? '#4CAF50' : '#2196F3',
//             marginTop: '8px'
//           }}>
//             {Math.round((dailyProgress / dailyGoal) * 100)}%
//           </div>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary, marginTop: '5px' }}>
//             {dailyProgress}/{dailyGoal} min
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '13px', color: currentTheme.secondary }}>Streak</div>
//           <div style={{ 
//             fontSize: '24px', 
//             fontWeight: 'bold',
//             color: '#FF9800',
//             marginTop: '8px'
//           }}>
//             {streakCount}
//           </div>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary, marginTop: '5px' }}>
//             Best: {longestStreak}
//           </div>
//         </div>
//       </div>

//       {showGraph && (
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '20px',
//           borderRadius: '15px',
//           width: '900px',
//           marginBottom: '20px',
//           height: '300px',
//           border: `1px solid ${currentTheme.border}`
//         }}>
//           {focusHistoryData.length > 0 ? (
//             <Line data={chartData} options={chartOptions} />
//           ) : (
//             <div style={{ 
//               display: 'flex', 
//               alignItems: 'center', 
//               justifyContent: 'center', 
//               height: '100%',
//               color: currentTheme.secondary 
//             }}>
//               Collecting data... Graph will appear after a few minutes of tracking.
//             </div>
//           )}
//         </div>
//       )}

//       <div style={{ position: 'relative', width: 640, height: 480 }}>
//         <Webcam
//           ref={webcamRef}
//           style={{
//             position: "absolute",
//             width: 640,
//             height: 480,
//             borderRadius: '15px',
//             border: alert ? '3px solid #ff0000' : `3px solid ${currentTheme.border}`,
//             boxShadow: alert ? '0 0 30px rgba(255,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.3)'
//           }}
//           mirrored={true}
//         />
//         <canvas
//           ref={canvasRef}
//           className="output_canvas"
//           style={{
//             position: "absolute",
//             width: 640,
//             height: 480,
//             borderRadius: '15px',
//           }}
//         />
//       </div>

//       <div style={{ 
//         marginTop: '20px',
//         backgroundColor: currentTheme.card,
//         padding: '15px 25px',
//         borderRadius: '15px',
//         width: '900px',
//         display: 'flex',
//         justifyContent: 'space-around',
//         boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
//         border: `1px solid ${currentTheme.border}`
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: currentTheme.secondary, fontSize: '12px' }}>Study Time</div>
//           <div style={{ fontSize: '22px', fontWeight: 'bold', color: darkMode ? '#4CAF50' : '#2196F3' }}>
//             {formatTime(studyTime)}
//           </div>
//         </div>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: currentTheme.secondary, fontSize: '12px' }}>Focused Time</div>
//           <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4CAF50' }}>
//             {formatTime(focusTime)}
//           </div>
//         </div>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: currentTheme.secondary, fontSize: '12px' }}>Focus Rate</div>
//           <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#FF9800' }}>
//             {studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%
//           </div>
//         </div>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: currentTheme.secondary, fontSize: '12px' }}>Distractions</div>
//           <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f44336' }}>
//             {distractionCount}
//           </div>
//         </div>
//       </div>

//       <style jsx>{`
//         @keyframes pulse {
//           0%, 100% { opacity: 1; transform: scale(1); }
//           50% { opacity: 0.8; transform: scale(1.02); }
//         }
//       `}</style>
//     </div>
//   );
// }

// export default App;

// import { FaceMesh } from "@mediapipe/face_mesh";
// import React, { useRef, useEffect, useState } from "react";
// import * as Facemesh from "@mediapipe/face_mesh";
// import * as cam from "@mediapipe/camera_utils";
// import Webcam from "react-webcam";
// import { Line } from 'react-chartjs-2';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// } from 'chart.js';
// import jsPDF from 'jspdf';

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// );

// function App() {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const connect = window.drawConnectors;
//   var camera = null;

//   const [focusScore, setFocusScore] = useState(0);
//   const [status, setStatus] = useState("Initializing...");
//   const [drowsinessLevel, setDrowsinessLevel] = useState(0);
//   const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
//   const [ear, setEAR] = useState(0);
//   const [alert, setAlert] = useState("");
//   const [studyTime, setStudyTime] = useState(0);
//   const [focusTime, setFocusTime] = useState(0);
//   const [distractionCount, setDistractionCount] = useState(0);
//   const [darkMode, setDarkMode] = useState(true);
//   const [showGraph, setShowGraph] = useState(false);
//   const [focusHistoryData, setFocusHistoryData] = useState([]);
//   const [timestamps, setTimestamps] = useState([]);

//   const focusHistory = useRef([]);
//   const closedFrames = useRef(0);
//   const lookingAwayFrames = useRef(0);
//   const lookingDownFrames = useRef(0);
//   const headDownWithEyesClosed = useRef(0);
//   const lastValidLandmarks = useRef(null);
//   const studyTimerRef = useRef(null);
//   const focusTimerRef = useRef(null);
//   const distractionTimerRef = useRef(null);
//   const isDistractedRef = useRef(false);

//   // Eye landmark indices
//   const LEFT_EYE = [33, 160, 158, 133, 153, 144];
//   const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
//   const EAR_THRESHOLD = 0.23;
//   const DROWSY_FRAMES = 25; // ~0.8 seconds at 30fps
//   const DISTRACTION_FRAMES = 45; // ~1.5 seconds before marking as distracted
//   const LOOKING_DOWN_FRAMES = 60; // ~2 seconds for looking down

//   // Theme colors
//   const theme = {
//     dark: {
//       bg: '#0a0a0a',
//       card: '#1a1a1a',
//       text: '#ffffff',
//       secondary: '#888',
//       border: '#333'
//     },
//     light: {
//       bg: '#f5f5f5',
//       card: '#ffffff',
//       text: '#333333',
//       secondary: '#666',
//       border: '#ddd'
//     }
//   };

//   const currentTheme = darkMode ? theme.dark : theme.light;

//   // Calculate Euclidean distance
//   const euclideanDist = (p1, p2) => {
//     return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
//   };

//   // Calculate Eye Aspect Ratio (EAR)
//   const calculateEAR = (eye) => {
//     const A = euclideanDist(eye[1], eye[5]);
//     const B = euclideanDist(eye[2], eye[4]);
//     const C = euclideanDist(eye[0], eye[3]);
//     return (A + B) / (2.0 * C);
//   };

//   // Calculate head pose angles
//   const calculateHeadPose = (landmarks) => {
//     const noseTip = landmarks[1];
//     const leftEye = landmarks[33];
//     const rightEye = landmarks[263];
//     const chin = landmarks[152];

//     const faceCenter = {
//       x: (leftEye.x + rightEye.x) / 2,
//       y: (leftEye.y + rightEye.y) / 2
//     };
//     const noseOffset = noseTip.x - faceCenter.x;
//     const eyeDistance = Math.abs(rightEye.x - leftEye.x);
//     const yaw = (noseOffset / eyeDistance) * 90;

//     const noseToChin = chin.y - noseTip.y;
//     const eyeToNose = noseTip.y - faceCenter.y;
//     const pitch = (eyeToNose / noseToChin) * 60 - 30;

//     const eyeYDiff = rightEye.y - leftEye.y;
//     const eyeXDiff = rightEye.x - leftEye.x;
//     const roll = Math.atan2(eyeYDiff, eyeXDiff) * (180 / Math.PI);

//     return { yaw, pitch, roll };
//   };

//   // Check if person is actually drowsy (head down + eyes closed)
//   const checkDrowsiness = (earValue, pitch, yaw, closedFramesCount) => {
//     // Head is tilted down significantly
//     const headDown = pitch > 20;
//     // Head is upright but eyes closed
//     const uprightEyesClosed = Math.abs(pitch) < 15 && earValue < EAR_THRESHOLD;
    
//     if (headDown && earValue < EAR_THRESHOLD) {
//       headDownWithEyesClosed.current += 1;
//     } else {
//       headDownWithEyesClosed.current = 0;
//     }

//     // True drowsiness: either head down with closed eyes for extended time
//     // OR upright with eyes closed for very long time
//     if (headDownWithEyesClosed.current >= 15 || 
//         (uprightEyesClosed && closedFramesCount >= DROWSY_FRAMES * 1.5)) {
//       return true;
//     }
//     return false;
//   };

//   // Calculate focus score with timing-based logic
//   const calculateFocusScore = (landmarks, earValue, pose) => {
//     if (!landmarks || landmarks.length === 0) return 0;

//     let score = 100;

//     // Track looking away (horizontal)
//     if (Math.abs(pose.yaw) > 35) {
//       lookingAwayFrames.current += 1;
//     } else {
//       lookingAwayFrames.current = Math.max(0, lookingAwayFrames.current - 2);
//     }

//     // Track looking down (but only penalize if not reading/note-taking position)
//     // Looking down for short periods is OK (reading notes)
//     if (pose.pitch > 30 && Math.abs(pose.yaw) < 25) {
//       lookingDownFrames.current += 1;
//     } else {
//       lookingDownFrames.current = Math.max(0, lookingDownFrames.current - 1);
//     }

//     // Apply penalties based on sustained behavior
//     if (lookingAwayFrames.current > DISTRACTION_FRAMES) {
//       score -= 40;
//     } else if (lookingAwayFrames.current > DISTRACTION_FRAMES / 2) {
//       score -= 20;
//     } else if (lookingAwayFrames.current > 10) {
//       score -= 5;
//     }

//     // Looking down penalty (only for extended periods)
//     if (lookingDownFrames.current > LOOKING_DOWN_FRAMES) {
//       score -= 30;
//     } else if (lookingDownFrames.current > LOOKING_DOWN_FRAMES / 2) {
//       score -= 15;
//     }

//     // Drowsiness penalty
//     if (earValue < EAR_THRESHOLD) {
//       if (closedFrames.current > DROWSY_FRAMES / 2) {
//         score -= 35;
//       } else {
//         score -= 15;
//       }
//     }

//     // Head tilt penalty (only for extreme tilts)
//     if (Math.abs(pose.roll) > 25) {
//       score -= 15;
//     }

//     // Face centering (relaxed threshold)
//     const nose = landmarks[1];
//     const centerOffset = Math.abs(nose.x - 0.5);
//     if (centerOffset > 0.3) score -= 15;
//     else if (centerOffset > 0.2) score -= 5;

//     return Math.max(0, Math.min(100, Math.round(score)));
//   };

//   // Update status with context-aware messages
//   const updateStatusAndAlerts = (score, earValue, pose) => {
//     const isDrowsy = checkDrowsiness(earValue, pose.pitch, pose.yaw, closedFrames.current);
    
//     if (isDrowsy) {
//       setAlert("⚠️ DROWSINESS DETECTED! TAKE A BREAK! ⚠️");
//       setStatus("😴 DROWSY - NEEDS REST");
//       return;
//     }

//     setAlert("");
    
//     if (lookingAwayFrames.current > DISTRACTION_FRAMES) {
//       setStatus("👀 Looking Away - Focus on Screen!");
//     } else if (lookingDownFrames.current > LOOKING_DOWN_FRAMES) {
//       setStatus("📖 Extended Looking Down - Check Screen!");
//     } else if (score >= 80) {
//       setStatus("🎯 Highly Focused - Great Job!");
//     } else if (score >= 65) {
//       setStatus("📚 Good Focus");
//     } else if (score >= 50) {
//       setStatus("🤔 Slightly Distracted");
//     } else if (score >= 30) {
//       setStatus("😕 Distracted - Try to Focus");
//     } else {
//       setStatus("❌ Not Focused");
//     }

//     // Additional context
//     if (Math.abs(pose.yaw) > 35 && lookingAwayFrames.current < 10) {
//       setStatus("↔️ Quick head turn - OK");
//     } else if (pose.pitch > 30 && lookingDownFrames.current < 30) {
//       setStatus("📝 Reading/Writing - Good!");
//     }
//   };

//   // Track distraction events
//   const trackDistraction = (score) => {
//     if (score < 50 && !isDistractedRef.current) {
//       isDistractedRef.current = true;
//       distractionTimerRef.current = setTimeout(() => {
//         if (focusScore < 50) {
//           setDistractionCount(prev => prev + 1);
//         }
//         isDistractedRef.current = false;
//       }, 3000); // Only count if distracted for 3+ seconds
//     } else if (score >= 50) {
//       if (distractionTimerRef.current) {
//         clearTimeout(distractionTimerRef.current);
//       }
//       isDistractedRef.current = false;
//     }
//   };

//   function onResults(results) {
//     const videoWidth = webcamRef.current.video.videoWidth;
//     const videoHeight = webcamRef.current.video.videoHeight;

//     canvasRef.current.width = videoWidth;
//     canvasRef.current.height = videoHeight;

//     const canvasElement = canvasRef.current;
//     const canvasCtx = canvasElement.getContext("2d");
//     canvasCtx.save();
//     canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
//     canvasCtx.drawImage(
//       results.image,
//       0,
//       0,
//       canvasElement.width,
//       canvasElement.height
//     );

//     if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
//       const landmarks = results.multiFaceLandmarks[0];
//       lastValidLandmarks.current = landmarks;

//       const leftEyePoints = LEFT_EYE.map(idx => landmarks[idx]);
//       const rightEyePoints = RIGHT_EYE.map(idx => landmarks[idx]);

//       const leftEAR = calculateEAR(leftEyePoints);
//       const rightEAR = calculateEAR(rightEyePoints);
//       const earValue = (leftEAR + rightEAR) / 2.0;
//       setEAR(earValue);

//       if (earValue < EAR_THRESHOLD) {
//         closedFrames.current += 1;
//       } else {
//         closedFrames.current = Math.max(0, closedFrames.current - 1);
//       }

//       const drowsiness = Math.max(0, Math.min(100, 
//         (EAR_THRESHOLD - earValue) * 400 + (closedFrames.current / DROWSY_FRAMES) * 50
//       ));
//       setDrowsinessLevel(Math.round(drowsiness));

//       const pose = calculateHeadPose(landmarks);
//       setHeadPose(pose);

//       const currentScore = calculateFocusScore(landmarks, earValue, pose);

//       focusHistory.current.push(currentScore);
//       if (focusHistory.current.length > 15) {
//         focusHistory.current.shift();
//       }
      
//       // Calculate weighted average (recent frames matter more)
//       const weights = focusHistory.current.map((_, i) => (i + 1) / focusHistory.current.length);
//       const weightedSum = focusHistory.current.reduce((sum, score, i) => sum + score * weights[i], 0);
//       const weightSum = weights.reduce((a, b) => a + b, 0);
//       const smoothedScore = Math.round(weightedSum / weightSum);
      
//       setFocusScore(smoothedScore);

//       // Store history for graph (every 2 seconds)
//       if (focusHistory.current.length % 30 === 0) {
//         const now = new Date();
//         const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
//         setFocusHistoryData(prev => [...prev.slice(-30), smoothedScore]);
//         setTimestamps(prev => [...prev.slice(-30), timeStr]);
//       }

//       updateStatusAndAlerts(smoothedScore, earValue, pose);
//       trackDistraction(smoothedScore);

//       // Draw face mesh
//       const meshColor = alert ? "#FF0000" : 
//         (smoothedScore >= 70 ? "#30FF30" : 
//          smoothedScore >= 50 ? "#FFA500" : "#FF6347");
      
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_TESSELATION, {
//         color: meshColor + "70",
//         lineWidth: 1,
//       });

//       const eyeColor = earValue < EAR_THRESHOLD ? "#FF0000" : "#00FF00";
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, { color: "#FF3030" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, { color: "#30FF30" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, { color: "#E0E0E0" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, { color: "#E0E0E0" });

//       // Draw eye contours
//       [leftEyePoints, rightEyePoints].forEach(eyePoints => {
//         canvasCtx.beginPath();
//         eyePoints.forEach((point, i) => {
//           const x = point.x * canvasElement.width;
//           const y = point.y * canvasElement.height;
//           if (i === 0) canvasCtx.moveTo(x, y);
//           else canvasCtx.lineTo(x, y);
//         });
//         canvasCtx.closePath();
//         canvasCtx.strokeStyle = eyeColor;
//         canvasCtx.lineWidth = 2;
//         canvasCtx.stroke();
//       });

//       // Draw indicators
//       const nose = landmarks[1];
//       canvasCtx.beginPath();
//       canvasCtx.arc(
//         nose.x * canvasElement.width,
//         nose.y * canvasElement.height,
//         6,
//         0,
//         2 * Math.PI
//       );
//       canvasCtx.fillStyle = smoothedScore >= 70 ? "#30FF30" : 
//                            smoothedScore >= 50 ? "#FFA500" : "#FF3030";
//       canvasCtx.fill();

//       // Draw status text on canvas
//       canvasCtx.font = '16px Arial';
//       canvasCtx.fillStyle = '#FFFFFF';
//       canvasCtx.fillText(status, 10, 30);

//     } else {
//       setFocusScore(0);
//       setStatus("No Face Detected");
//       setDrowsinessLevel(0);
//       setEAR(0);
//       setHeadPose({ yaw: 0, pitch: 0, roll: 0 });
//       closedFrames.current = 0;
//       lookingAwayFrames.current = 0;
//       lookingDownFrames.current = 0;
//     }

//     canvasCtx.restore();
//   }

//   // Export report function
//   const exportReport = () => {
//     const doc = new jsPDF();
//     const date = new Date().toLocaleString();
    
//     doc.setFontSize(20);
//     doc.text('Study Focus Report', 20, 20);
//     doc.setFontSize(12);
//     doc.text(`Generated: ${date}`, 20, 30);
//     doc.text(`Total Study Time: ${formatTime(studyTime)}`, 20, 45);
//     doc.text(`Focused Time: ${formatTime(focusTime)}`, 20, 55);
//     doc.text(`Focus Rate: ${studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%`, 20, 65);
//     doc.text(`Total Distractions: ${distractionCount}`, 20, 75);
//     doc.text(`Average Focus Score: ${focusHistoryData.length > 0 ? 
//       Math.round(focusHistoryData.reduce((a, b) => a + b, 0) / focusHistoryData.length) : 0}%`, 20, 85);
    
//     doc.text('Focus Timeline:', 20, 100);
//     focusHistoryData.forEach((score, i) => {
//       if (i < 30) {
//         doc.text(`${timestamps[i] || '--:--'}: ${score}%`, 25, 110 + (i * 5));
//       }
//     });
    
//     doc.save(`focus-report-${Date.now()}.pdf`);
//   };

//   // Reset session
//   const resetSession = () => {
//     setStudyTime(0);
//     setFocusTime(0);
//     setDistractionCount(0);
//     setFocusHistoryData([]);
//     setTimestamps([]);
//     focusHistory.current = [];
//   };

//   useEffect(() => {
//     studyTimerRef.current = setInterval(() => {
//       setStudyTime(prev => prev + 1);
//     }, 1000);

//     focusTimerRef.current = setInterval(() => {
//       if (focusScore >= 50) {
//         setFocusTime(prev => prev + 1);
//       }
//     }, 1000);

//     return () => {
//       clearInterval(studyTimerRef.current);
//       clearInterval(focusTimerRef.current);
//       if (distractionTimerRef.current) {
//         clearTimeout(distractionTimerRef.current);
//       }
//     };
//   }, [focusScore]);

//   useEffect(() => {
//     const faceMesh = new FaceMesh({
//       locateFile: (file) => {
//         return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
//       },
//     });

//     faceMesh.setOptions({
//       maxNumFaces: 1,
//       minDetectionConfidence: 0.5,
//       minTrackingConfidence: 0.5,
//       refineLandmarks: true,
//     });

//     faceMesh.onResults(onResults);

//     if (
//       typeof webcamRef.current !== "undefined" &&
//       webcamRef.current !== null
//     ) {
//       camera = new cam.Camera(webcamRef.current.video, {
//         onFrame: async () => {
//           await faceMesh.send({ image: webcamRef.current.video });
//         },
//         width: 640,
//         height: 480,
//       });
//       camera.start();
//     }

//     return () => {
//       if (camera) {
//         camera.stop();
//       }
//     };
//   }, []);

//   const formatTime = (seconds) => {
//     const hours = Math.floor(seconds / 3600);
//     const mins = Math.floor((seconds % 3600) / 60);
//     const secs = seconds % 60;
//     if (hours > 0) {
//       return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//     }
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const chartData = {
//     labels: timestamps,
//     datasets: [
//       {
//         label: 'Focus Score',
//         data: focusHistoryData,
//         borderColor: darkMode ? '#4CAF50' : '#2196F3',
//         backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(33, 150, 243, 0.1)',
//         fill: true,
//         tension: 0.4,
//         pointRadius: 2,
//         pointHoverRadius: 5,
//       },
//       {
//         label: 'Focus Threshold',
//         data: Array(timestamps.length).fill(50),
//         borderColor: '#FFA500',
//         borderDash: [5, 5],
//         borderWidth: 1,
//         fill: false,
//         pointRadius: 0,
//       }
//     ],
//   };

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: {
//       legend: {
//         labels: {
//           color: currentTheme.text,
//         },
//       },
//       title: {
//         display: true,
//         text: 'Focus Score Over Time',
//         color: currentTheme.text,
//       },
//     },
//     scales: {
//       y: {
//         min: 0,
//         max: 100,
//         grid: {
//           color: currentTheme.border,
//         },
//         ticks: {
//           color: currentTheme.text,
//         },
//       },
//       x: {
//         grid: {
//           color: currentTheme.border,
//         },
//         ticks: {
//           color: currentTheme.text,
//         },
//       },
//     },
//   };

//   return (
//     <div style={{ 
//       display: 'flex', 
//       flexDirection: 'column', 
//       alignItems: 'center',
//       backgroundColor: currentTheme.bg,
//       minHeight: '100vh',
//       color: currentTheme.text,
//       padding: '20px',
//       transition: 'all 0.3s ease'
//     }}>
//       <div style={{ 
//         display: 'flex', 
//         justifyContent: 'space-between', 
//         alignItems: 'center',
//         width: '900px',
//         marginBottom: '10px'
//       }}>
//         <h1 style={{ 
//           color: darkMode ? '#4CAF50' : '#2196F3',
//           fontSize: '32px',
//           margin: 0
//         }}>
//           🎓 Study Focus Detector
//         </h1>
//         <div style={{ display: 'flex', gap: '10px' }}>
//           <button
//             onClick={() => setDarkMode(!darkMode)}
//             style={{
//               padding: '8px 15px',
//               backgroundColor: currentTheme.card,
//               color: currentTheme.text,
//               border: `1px solid ${currentTheme.border}`,
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '16px'
//             }}
//           >
//             {darkMode ? '☀️ Light' : '🌙 Dark'}
//           </button>
//           <button
//             onClick={() => setShowGraph(!showGraph)}
//             style={{
//               padding: '8px 15px',
//               backgroundColor: currentTheme.card,
//               color: currentTheme.text,
//               border: `1px solid ${currentTheme.border}`,
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '16px'
//             }}
//           >
//             📊 Graph
//           </button>
//           <button
//             onClick={exportReport}
//             style={{
//               padding: '8px 15px',
//               backgroundColor: '#4CAF50',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '16px'
//             }}
//           >
//             📥 Export Report
//           </button>
//           <button
//             onClick={resetSession}
//             style={{
//               padding: '8px 15px',
//               backgroundColor: '#f44336',
//               color: 'white',
//               border: 'none',
//               borderRadius: '5px',
//               cursor: 'pointer',
//               fontSize: '16px'
//             }}
//           >
//             🔄 Reset
//           </button>
//         </div>
//       </div>

//       {alert && (
//         <div style={{
//           backgroundColor: '#ff0000',
//           color: 'white',
//           padding: '15px 30px',
//           borderRadius: '10px',
//           fontSize: '24px',
//           fontWeight: 'bold',
//           marginBottom: '15px',
//           animation: 'pulse 1s infinite',
//           boxShadow: '0 0 20px rgba(255,0,0,0.5)',
//           width: '900px',
//           textAlign: 'center'
//         }}>
//           {alert}
//         </div>
//       )}

//       <div style={{ 
//         display: 'flex', 
//         gap: '15px', 
//         marginBottom: '20px',
//         backgroundColor: currentTheme.card,
//         padding: '20px',
//         borderRadius: '15px',
//         width: '900px',
//         justifyContent: 'space-around',
//         boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
//         border: `1px solid ${currentTheme.border}`
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '14px', color: currentTheme.secondary }}>Focus Score</div>
//           <div style={{ 
//             fontSize: '52px', 
//             fontWeight: 'bold',
//             color: focusScore >= 70 ? '#4CAF50' : focusScore >= 50 ? '#FFA500' : '#FF3030',
//           }}>
//             {focusScore}%
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '14px', color: currentTheme.secondary }}>Status</div>
//           <div style={{ 
//             fontSize: '20px', 
//             fontWeight: 'bold',
//             color: status.includes('🎯') || status.includes('📚') ? '#4CAF50' : 
//                    status.includes('DROWSY') ? '#FF0000' : 
//                    status.includes('📝') ? '#2196F3' : '#FFA500',
//             marginTop: '15px',
//             maxWidth: '250px'
//           }}>
//             {status}
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '14px', color: currentTheme.secondary }}>EAR Value</div>
//           <div style={{ 
//             fontSize: '28px', 
//             fontWeight: 'bold',
//             color: ear < EAR_THRESHOLD ? '#FF0000' : '#4CAF50',
//             marginTop: '10px'
//           }}>
//             {ear.toFixed(3)}
//           </div>
//           <div style={{ fontSize: '12px', color: currentTheme.secondary }}>
//             Threshold: {EAR_THRESHOLD}
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '14px', color: currentTheme.secondary }}>Drowsiness</div>
//           <div style={{ 
//             fontSize: '28px', 
//             fontWeight: 'bold',
//             color: drowsinessLevel > 30 ? '#FF0000' : '#4CAF50',
//             marginTop: '10px'
//           }}>
//             {drowsinessLevel}%
//           </div>
//         </div>
//       </div>

//       {showGraph && focusHistoryData.length > 0 && (
//         <div style={{
//           backgroundColor: currentTheme.card,
//           padding: '20px',
//           borderRadius: '15px',
//           width: '900px',
//           marginBottom: '20px',
//           height: '300px',
//           border: `1px solid ${currentTheme.border}`
//         }}>
//           <Line data={chartData} options={chartOptions} />
//         </div>
//       )}

//       <div style={{ position: 'relative', width: 640, height: 480 }}>
//         <Webcam
//           ref={webcamRef}
//           style={{
//             position: "absolute",
//             width: 640,
//             height: 480,
//             borderRadius: '15px',
//             border: alert ? '3px solid #ff0000' : `3px solid ${currentTheme.border}`,
//             boxShadow: alert ? '0 0 30px rgba(255,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.3)'
//           }}
//           mirrored={true}
//         />
//         <canvas
//           ref={canvasRef}
//           className="output_canvas"
//           style={{
//             position: "absolute",
//             width: 640,
//             height: 480,
//             borderRadius: '15px',
//           }}
//         />
//       </div>

//       <div style={{ 
//         marginTop: '20px',
//         backgroundColor: currentTheme.card,
//         padding: '15px 25px',
//         borderRadius: '15px',
//         width: '900px',
//         display: 'flex',
//         justifyContent: 'space-around',
//         boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
//         border: `1px solid ${currentTheme.border}`
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: currentTheme.secondary, fontSize: '12px' }}>Study Time</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: darkMode ? '#4CAF50' : '#2196F3' }}>
//             {formatTime(studyTime)}
//           </div>
//         </div>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: currentTheme.secondary, fontSize: '12px' }}>Focused Time</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
//             {formatTime(focusTime)}
//           </div>
//         </div>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: currentTheme.secondary, fontSize: '12px' }}>Focus Rate</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
//             {studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%
//           </div>
//         </div>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: currentTheme.secondary, fontSize: '12px' }}>Distractions</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>
//             {distractionCount}
//           </div>
//         </div>
//       </div>

//       <div style={{ 
//         marginTop: '15px',
//         backgroundColor: currentTheme.card,
//         padding: '12px 25px',
//         borderRadius: '10px',
//         width: '900px',
//         display: 'flex',
//         justifyContent: 'space-around',
//         fontSize: '14px',
//         border: `1px solid ${currentTheme.border}`
//       }}>
//         <div>
//           <span style={{ color: currentTheme.secondary }}>Head Yaw: </span>
//           <span style={{ 
//             color: Math.abs(headPose.yaw) > 35 ? '#ff0000' : currentTheme.text,
//           }}>
//             {Math.round(headPose.yaw)}°
//           </span>
//         </div>
//         <div>
//           <span style={{ color: currentTheme.secondary }}>Head Pitch: </span>
//           <span style={{ 
//             color: headPose.pitch > 30 ? '#FFA500' : currentTheme.text,
//           }}>
//             {Math.round(headPose.pitch)}°
//           </span>
//         </div>
//         <div>
//           <span style={{ color: currentTheme.secondary }}>Head Roll: </span>
//           <span style={{ 
//             color: Math.abs(headPose.roll) > 25 ? '#ff0000' : currentTheme.text,
//           }}>
//             {Math.round(headPose.roll)}°
//           </span>
//         </div>
//         <div>
//           <span style={{ color: currentTheme.secondary }}>Looking Away: </span>
//           <span>{lookingAwayFrames.current}/{DISTRACTION_FRAMES}</span>
//         </div>
//         <div>
//           <span style={{ color: currentTheme.secondary }}>Looking Down: </span>
//           <span>{lookingDownFrames.current}/{LOOKING_DOWN_FRAMES}</span>
//         </div>
//       </div>

//       <style jsx>{`
//         @keyframes pulse {
//           0%, 100% { opacity: 1; transform: scale(1); }
//           50% { opacity: 0.8; transform: scale(1.02); }
//         }
//       `}</style>
//     </div>
//   );
// }

// export default App;

// import { FaceMesh } from "@mediapipe/face_mesh";
// import React, { useRef, useEffect, useState } from "react";
// import * as Facemesh from "@mediapipe/face_mesh";
// import * as cam from "@mediapipe/camera_utils";
// import Webcam from "react-webcam";

// function App() {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const connect = window.drawConnectors;
//   var camera = null;

//   const [focusScore, setFocusScore] = useState(0);
//   const [status, setStatus] = useState("Initializing...");
//   const [drowsinessLevel, setDrowsinessLevel] = useState(0);
//   const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
//   const [ear, setEAR] = useState(0);
//   const [alert, setAlert] = useState("");
//   const [studyTime, setStudyTime] = useState(0);
//   const [focusTime, setFocusTime] = useState(0);
//   const [distractionCount, setDistractionCount] = useState(0);

//   const focusHistory = useRef([]);
//   const closedFrames = useRef(0);
//   const lastValidLandmarks = useRef(null);
//   const studyTimerRef = useRef(null);
//   const focusTimerRef = useRef(null);

//   // Eye landmark indices (same as Python code)
//   const LEFT_EYE = [33, 160, 158, 133, 153, 144];
//   const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
//   const EAR_THRESHOLD = 0.25;
//   const DROWSY_FRAMES = 15; // ~0.5 seconds at 30fps

//   // Calculate Euclidean distance
//   const euclideanDist = (p1, p2) => {
//     return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
//   };

//   // Calculate Eye Aspect Ratio (EAR) - exactly like Python code
//   const calculateEAR = (eye) => {
//     const A = euclideanDist(eye[1], eye[5]);
//     const B = euclideanDist(eye[2], eye[4]);
//     const C = euclideanDist(eye[0], eye[3]);
//     return (A + B) / (2.0 * C);
//   };

//   // Calculate head pose angles
//   const calculateHeadPose = (landmarks) => {
//     const noseTip = landmarks[1];
//     const leftEye = landmarks[33];
//     const rightEye = landmarks[263];
//     const chin = landmarks[152];
//     const leftMouth = landmarks[61];
//     const rightMouth = landmarks[291];

//     // Yaw (left-right head turn)
//     const faceCenter = {
//       x: (leftEye.x + rightEye.x) / 2,
//       y: (leftEye.y + rightEye.y) / 2
//     };
//     const noseOffset = noseTip.x - faceCenter.x;
//     const eyeDistance = Math.abs(rightEye.x - leftEye.x);
//     const yaw = (noseOffset / eyeDistance) * 90;

//     // Pitch (up-down head tilt)
//     const noseToChin = chin.y - noseTip.y;
//     const eyeToNose = noseTip.y - faceCenter.y;
//     const pitch = (eyeToNose / noseToChin) * 60 - 30;

//     // Roll (side tilt)
//     const eyeYDiff = rightEye.y - leftEye.y;
//     const eyeXDiff = rightEye.x - leftEye.x;
//     const roll = Math.atan2(eyeYDiff, eyeXDiff) * (180 / Math.PI);

//     return { yaw, pitch, roll };
//   };

//   // Calculate comprehensive focus score
//   const calculateFocusScore = (landmarks, earValue, pose) => {
//     if (!landmarks || landmarks.length === 0) return 0;

//     let score = 100;

//     // 1. Drowsiness penalty (from Python logic)
//     if (earValue < EAR_THRESHOLD) {
//       score -= 40;
//     } else if (earValue < 0.28) {
//       score -= 20;
//     }

//     // 2. Head pose penalties
//     if (Math.abs(pose.yaw) > 30) score -= 30;
//     else if (Math.abs(pose.yaw) > 15) score -= 15;

//     if (Math.abs(pose.pitch) > 25) score -= 25;
//     else if (Math.abs(pose.pitch) > 12) score -= 10;

//     if (Math.abs(pose.roll) > 20) score -= 15;

//     // 3. Face centering
//     const nose = landmarks[1];
//     const centerOffset = Math.abs(nose.x - 0.5);
//     if (centerOffset > 0.25) score -= 20;
//     else if (centerOffset > 0.15) score -= 10;

//     // 4. Distance from camera
//     const leftEye = landmarks[33];
//     const rightEye = landmarks[263];
//     const eyeDistance = euclideanDist(leftEye, rightEye);
    
//     if (eyeDistance < 0.06) score -= 20; // Too close
//     else if (eyeDistance > 0.18) score -= 15; // Too far

//     return Math.max(0, Math.min(100, Math.round(score)));
//   };

//   // Update status and handle alerts
//   const updateStatusAndAlerts = (score, earValue, pose, closedFramesCount) => {
//     // Drowsiness alert (from Python logic)
//     if (closedFramesCount >= DROWSY_FRAMES) {
//       setAlert("⚠️ DROWSINESS ALERT! ⚠️");
//       setStatus("DROWSY - WAKE UP!");
//     } else {
//       setAlert("");
      
//       if (score >= 80) setStatus("🎯 Highly Focused");
//       else if (score >= 60) setStatus("📚 Focused");
//       else if (score >= 40) setStatus("🤔 Slightly Distracted");
//       else if (score >= 20) setStatus("😕 Distracted");
//       else setStatus("❌ Not Focused");

//       if (Math.abs(pose.yaw) > 30) setStatus("👀 Looking Away!");
//       if (Math.abs(pose.pitch) > 25) setStatus("⬇️ Looking Down!");
//     }
//   };

//   function onResults(results) {
//     const videoWidth = webcamRef.current.video.videoWidth;
//     const videoHeight = webcamRef.current.video.videoHeight;

//     canvasRef.current.width = videoWidth;
//     canvasRef.current.height = videoHeight;

//     const canvasElement = canvasRef.current;
//     const canvasCtx = canvasElement.getContext("2d");
//     canvasCtx.save();
//     canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
//     canvasCtx.drawImage(
//       results.image,
//       0,
//       0,
//       canvasElement.width,
//       canvasElement.height
//     );

//     if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
//       const landmarks = results.multiFaceLandmarks[0];
//       lastValidLandmarks.current = landmarks;

//       // Extract eye landmarks (exactly like Python code)
//       const leftEyePoints = LEFT_EYE.map(idx => landmarks[idx]);
//       const rightEyePoints = RIGHT_EYE.map(idx => landmarks[idx]);

//       // Calculate EAR (exactly like Python code)
//       const leftEAR = calculateEAR(leftEyePoints);
//       const rightEAR = calculateEAR(rightEyePoints);
//       const earValue = (leftEAR + rightEAR) / 2.0;
//       setEAR(earValue);

//       // Handle closed frames counter (from Python logic)
//       if (earValue < EAR_THRESHOLD) {
//         closedFrames.current += 1;
//       } else {
//         closedFrames.current = 0;
//       }

//       // Calculate drowsiness percentage
//       const drowsiness = Math.max(0, Math.min(100, 
//         (EAR_THRESHOLD - earValue) * 400 + (closedFrames.current / DROWSY_FRAMES) * 50
//       ));
//       setDrowsinessLevel(Math.round(drowsiness));

//       // Calculate head pose
//       const pose = calculateHeadPose(landmarks);
//       setHeadPose(pose);

//       // Calculate focus score
//       const currentScore = calculateFocusScore(landmarks, earValue, pose);

//       // Smooth focus score
//       focusHistory.current.push(currentScore);
//       if (focusHistory.current.length > 10) {
//         focusHistory.current.shift();
//       }
//       const smoothedScore = Math.round(
//         focusHistory.current.reduce((a, b) => a + b, 0) / focusHistory.current.length
//       );
//       setFocusScore(smoothedScore);

//       // Update status and alerts
//       updateStatusAndAlerts(smoothedScore, earValue, pose, closedFrames.current);

//       // Track distractions
//       if (smoothedScore < 50 && focusHistory.current.length > 5) {
//         const lastFive = focusHistory.current.slice(-5);
//         const avgLastFive = lastFive.reduce((a, b) => a + b, 0) / 5;
//         if (avgLastFive < 50) {
//           setDistractionCount(prev => prev + 1);
//         }
//       }

//       // Draw face mesh
//       const meshColor = alert ? "#FF0000" : (smoothedScore >= 70 ? "#30FF30" : "#FFA500");
      
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_TESSELATION, {
//         color: meshColor + "70",
//         lineWidth: 1,
//       });

//       // Draw eyes with EAR-based color (like Python code)
//       const eyeColor = earValue < EAR_THRESHOLD ? "#FF0000" : "#00FF00";
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, { color: eyeColor });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, { color: "#FF3030" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, { color: "#30FF30" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, { color: "#E0E0E0" });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, { color: "#E0E0E0" });

//       // Draw eye contours (like Python cv2.polylines)
//       canvasCtx.beginPath();
//       leftEyePoints.forEach((point, i) => {
//         const x = point.x * canvasElement.width;
//         const y = point.y * canvasElement.height;
//         if (i === 0) canvasCtx.moveTo(x, y);
//         else canvasCtx.lineTo(x, y);
//       });
//       canvasCtx.closePath();
//       canvasCtx.strokeStyle = eyeColor;
//       canvasCtx.lineWidth = 2;
//       canvasCtx.stroke();

//       canvasCtx.beginPath();
//       rightEyePoints.forEach((point, i) => {
//         const x = point.x * canvasElement.width;
//         const y = point.y * canvasElement.height;
//         if (i === 0) canvasCtx.moveTo(x, y);
//         else canvasCtx.lineTo(x, y);
//       });
//       canvasCtx.closePath();
//       canvasCtx.strokeStyle = eyeColor;
//       canvasCtx.lineWidth = 2;
//       canvasCtx.stroke();

//       // Draw nose direction indicator
//       const nose = landmarks[1];
//       canvasCtx.beginPath();
//       canvasCtx.arc(
//         nose.x * canvasElement.width,
//         nose.y * canvasElement.height,
//         6,
//         0,
//         2 * Math.PI
//       );
//       canvasCtx.fillStyle = smoothedScore >= 70 ? "#30FF30" : "#FF3030";
//       canvasCtx.fill();

//     } else {
//       setFocusScore(0);
//       setStatus("No Face Detected");
//       setDrowsinessLevel(0);
//       setEAR(0);
//       setHeadPose({ yaw: 0, pitch: 0, roll: 0 });
//       closedFrames.current = 0;
//       focusHistory.current = [];
//     }

//     canvasCtx.restore();
//   }

//   // Timers for study analytics
//   useEffect(() => {
//     studyTimerRef.current = setInterval(() => {
//       setStudyTime(prev => prev + 1);
//     }, 1000);

//     focusTimerRef.current = setInterval(() => {
//       if (focusScore >= 60) {
//         setFocusTime(prev => prev + 1);
//       }
//     }, 1000);

//     return () => {
//       clearInterval(studyTimerRef.current);
//       clearInterval(focusTimerRef.current);
//     };
//   }, [focusScore]);

//   useEffect(() => {
//     const faceMesh = new FaceMesh({
//       locateFile: (file) => {
//         return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
//       },
//     });

//     faceMesh.setOptions({
//       maxNumFaces: 1,
//       minDetectionConfidence: 0.5,
//       minTrackingConfidence: 0.5,
//       refineLandmarks: true, // Important for eye accuracy (like Python)
//     });

//     faceMesh.onResults(onResults);

//     if (
//       typeof webcamRef.current !== "undefined" &&
//       webcamRef.current !== null
//     ) {
//       camera = new cam.Camera(webcamRef.current.video, {
//         onFrame: async () => {
//           await faceMesh.send({ image: webcamRef.current.video });
//         },
//         width: 640,
//         height: 480,
//       });
//       camera.start();
//     }

//     return () => {
//       if (camera) {
//         camera.stop();
//       }
//     };
//   }, []);

//   const formatTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   return (
//     <div style={{ 
//       display: 'flex', 
//       flexDirection: 'column', 
//       alignItems: 'center',
//       backgroundColor: '#0a0a0a',
//       minHeight: '100vh',
//       color: 'white',
//       padding: '20px'
//     }}>
//       <h1 style={{ 
//         color: '#4CAF50', 
//         marginBottom: '5px',
//         fontSize: '32px',
//         textShadow: '0 0 10px rgba(76,175,80,0.5)'
//       }}>
//         🎓 Study Focus Detector
//       </h1>

//       {/* Alert Banner */}
//       {alert && (
//         <div style={{
//           backgroundColor: '#ff0000',
//           color: 'white',
//           padding: '15px 30px',
//           borderRadius: '10px',
//           fontSize: '24px',
//           fontWeight: 'bold',
//           marginBottom: '15px',
//           animation: 'pulse 1s infinite',
//           boxShadow: '0 0 20px rgba(255,0,0,0.5)'
//         }}>
//           {alert}
//         </div>
//       )}

//       {/* Main Stats */}
//       <div style={{ 
//         display: 'flex', 
//         gap: '15px', 
//         marginBottom: '20px',
//         backgroundColor: '#1a1a1a',
//         padding: '20px',
//         borderRadius: '15px',
//         width: '900px',
//         justifyContent: 'space-around',
//         boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '14px', color: '#888' }}>Focus Score</div>
//           <div style={{ 
//             fontSize: '52px', 
//             fontWeight: 'bold',
//             color: focusScore >= 70 ? '#4CAF50' : focusScore >= 40 ? '#FFA500' : '#FF3030',
//             textShadow: '0 0 20px currentColor'
//           }}>
//             {focusScore}%
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '14px', color: '#888' }}>Status</div>
//           <div style={{ 
//             fontSize: '22px', 
//             fontWeight: 'bold',
//             color: status.includes('🎯') ? '#4CAF50' : 
//                    status.includes('DROWSY') ? '#FF0000' : '#FFA500',
//             marginTop: '15px'
//           }}>
//             {status}
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '14px', color: '#888' }}>EAR Value</div>
//           <div style={{ 
//             fontSize: '28px', 
//             fontWeight: 'bold',
//             color: ear < EAR_THRESHOLD ? '#FF0000' : '#4CAF50',
//             marginTop: '10px'
//           }}>
//             {ear.toFixed(3)}
//           </div>
//           <div style={{ fontSize: '12px', color: '#666' }}>
//             Threshold: {EAR_THRESHOLD}
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '14px', color: '#888' }}>Drowsiness</div>
//           <div style={{ 
//             fontSize: '28px', 
//             fontWeight: 'bold',
//             color: drowsinessLevel > 30 ? '#FF0000' : '#4CAF50',
//             marginTop: '10px'
//           }}>
//             {drowsinessLevel}%
//           </div>
//         </div>
//       </div>

//       {/* Camera Feed */}
//       <div style={{ position: 'relative', width: 640, height: 480 }}>
//         <Webcam
//           ref={webcamRef}
//           style={{
//             position: "absolute",
//             width: 640,
//             height: 480,
//             borderRadius: '15px',
//             border: alert ? '3px solid #ff0000' : '3px solid #333',
//             boxShadow: alert ? '0 0 30px rgba(255,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.3)'
//           }}
//           mirrored={true}
//         />
//         <canvas
//           ref={canvasRef}
//           className="output_canvas"
//           style={{
//             position: "absolute",
//             width: 640,
//             height: 480,
//             borderRadius: '15px',
//           }}
//         />
//       </div>

//       {/* Analytics Panel */}
//       <div style={{ 
//         marginTop: '20px',
//         backgroundColor: '#1a1a1a',
//         padding: '15px 25px',
//         borderRadius: '15px',
//         width: '900px',
//         display: 'flex',
//         justifyContent: 'space-around',
//         boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: '#888', fontSize: '12px' }}>Study Time</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
//             {formatTime(studyTime)}
//           </div>
//         </div>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: '#888', fontSize: '12px' }}>Focused Time</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196F3' }}>
//             {formatTime(focusTime)}
//           </div>
//         </div>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: '#888', fontSize: '12px' }}>Focus Rate</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FF9800' }}>
//             {studyTime > 0 ? Math.round((focusTime / studyTime) * 100) : 0}%
//           </div>
//         </div>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ color: '#888', fontSize: '12px' }}>Distractions</div>
//           <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>
//             {distractionCount}
//           </div>
//         </div>
//       </div>

//       {/* Head Pose Info */}
//       <div style={{ 
//         marginTop: '15px',
//         backgroundColor: '#1a1a1a',
//         padding: '12px 25px',
//         borderRadius: '10px',
//         width: '900px',
//         display: 'flex',
//         justifyContent: 'space-around',
//         fontSize: '14px'
//       }}>
//         <div>
//           <span style={{ color: '#888' }}>Yaw: </span>
//           <span style={{ 
//             color: Math.abs(headPose.yaw) > 30 ? '#ff0000' : '#fff',
//             fontWeight: Math.abs(headPose.yaw) > 30 ? 'bold' : 'normal'
//           }}>
//             {Math.round(headPose.yaw)}°
//           </span>
//         </div>
//         <div>
//           <span style={{ color: '#888' }}>Pitch: </span>
//           <span style={{ 
//             color: Math.abs(headPose.pitch) > 25 ? '#ff0000' : '#fff',
//             fontWeight: Math.abs(headPose.pitch) > 25 ? 'bold' : 'normal'
//           }}>
//             {Math.round(headPose.pitch)}°
//           </span>
//         </div>
//         <div>
//           <span style={{ color: '#888' }}>Roll: </span>
//           <span style={{ 
//             color: Math.abs(headPose.roll) > 20 ? '#ff0000' : '#fff',
//             fontWeight: Math.abs(headPose.roll) > 20 ? 'bold' : 'normal'
//           }}>
//             {Math.round(headPose.roll)}°
//           </span>
//         </div>
//         <div>
//           <span style={{ color: '#888' }}>Closed Frames: </span>
//           <span style={{ 
//             color: closedFrames.current >= DROWSY_FRAMES ? '#ff0000' : '#fff'
//           }}>
//             {closedFrames.current}/{DROWSY_FRAMES}
//           </span>
//         </div>
//       </div>

//       <style jsx>{`
//         @keyframes pulse {
//           0%, 100% { opacity: 1; }
//           50% { opacity: 0.7; }
//         }
//       `}</style>
//     </div>
//   );
// }

// export default App;

// import { FaceMesh } from "@mediapipe/face_mesh";
// import React, { useRef, useEffect, useState } from "react";
// import * as Facemesh from "@mediapipe/face_mesh";
// import * as cam from "@mediapipe/camera_utils";
// import Webcam from "react-webcam";

// function App() {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);
//   const connect = window.drawConnectors;
//   var camera = null;

//   const [focusScore, setFocusScore] = useState(0);
//   const [status, setStatus] = useState("Initializing...");
//   const [drowsinessLevel, setDrowsinessLevel] = useState(0);
//   const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0, roll: 0 });

//   // Focus tracking history
//   const focusHistory = useRef([]);
//   const lastValidLandmarks = useRef(null);

//   // Calculate Eye Aspect Ratio (EAR)
//   const calculateEAR = (eyeLandmarks) => {
//     const vertical1 = Math.sqrt(
//       Math.pow(eyeLandmarks[1].x - eyeLandmarks[5].x, 2) +
//       Math.pow(eyeLandmarks[1].y - eyeLandmarks[5].y, 2)
//     );
//     const vertical2 = Math.sqrt(
//       Math.pow(eyeLandmarks[2].x - eyeLandmarks[4].x, 2) +
//       Math.pow(eyeLandmarks[2].y - eyeLandmarks[4].y, 2)
//     );
//     const horizontal = Math.sqrt(
//       Math.pow(eyeLandmarks[0].x - eyeLandmarks[3].x, 2) +
//       Math.pow(eyeLandmarks[0].y - eyeLandmarks[3].y, 2)
//     );
//     return (vertical1 + vertical2) / (2.0 * horizontal);
//   };

//   // Calculate head pose angles
//   const calculateHeadPose = (landmarks) => {
//     const noseTip = landmarks[1];
//     const leftEye = landmarks[33];
//     const rightEye = landmarks[263];
//     const leftEar = landmarks[234];
//     const rightEar = landmarks[454];
//     const chin = landmarks[152];

//     // Simplified yaw calculation (left-right)
//     const faceCenter = {
//       x: (leftEye.x + rightEye.x) / 2,
//       y: (leftEye.y + rightEye.y) / 2
//     };
//     const noseOffset = noseTip.x - faceCenter.x;
//     const eyeDistance = Math.abs(rightEye.x - leftEye.x);
//     const yaw = (noseOffset / eyeDistance) * 90;

//     // Simplified pitch calculation (up-down)
//     const noseToChin = chin.y - noseTip.y;
//     const eyeToNose = noseTip.y - faceCenter.y;
//     const pitch = (eyeToNose / noseToChin) * 60 - 30;

//     // Simplified roll calculation (tilt)
//     const eyeYDiff = rightEye.y - leftEye.y;
//     const eyeXDiff = rightEye.x - leftEye.x;
//     const roll = Math.atan2(eyeYDiff, eyeXDiff) * (180 / Math.PI);

//     return { yaw, pitch, roll };
//   };

//   // Calculate focus score based on all parameters
//   const calculateFocusScore = (landmarks) => {
//     if (!landmarks || landmarks.length === 0) return 0;

//     let score = 100;

//     // 1. Check if face is present
//     score -= 0;

//     // 2. Check head pose
//     const pose = calculateHeadPose(landmarks);
//     setHeadPose(pose);

//     // Penalize if looking away (yaw > 25 or < -25 degrees)
//     if (Math.abs(pose.yaw) > 25) score -= 30;
//     else if (Math.abs(pose.yaw) > 15) score -= 15;

//     // Penalize if looking down/up too much (pitch > 20 or < -20 degrees)
//     if (Math.abs(pose.pitch) > 20) score -= 25;
//     else if (Math.abs(pose.pitch) > 10) score -= 10;

//     // Penalize if head tilted too much (roll > 15 or < -15 degrees)
//     if (Math.abs(pose.roll) > 15) score -= 10;

//     // 3. Check eye openness (drowsiness detection)
//     const leftEyePoints = [33, 133, 157, 158, 159, 160];
//     const rightEyePoints = [362, 263, 387, 386, 385, 384];

//     const leftEyeLandmarks = leftEyePoints.map(idx => landmarks[idx]);
//     const rightEyeLandmarks = rightEyePoints.map(idx => landmarks[idx]);

//     const leftEAR = calculateEAR(leftEyeLandmarks);
//     const rightEAR = calculateEAR(rightEyeLandmarks);
//     const avgEAR = (leftEAR + rightEAR) / 2;

//     const drowsiness = Math.max(0, Math.min(100, (0.25 - avgEAR) * 400));
//     setDrowsinessLevel(drowsiness);

//     if (avgEAR < 0.18) score -= 40; // Eyes mostly closed
//     else if (avgEAR < 0.22) score -= 20; // Eyes partially closed

//     // 4. Face position stability (check if face is centered)
//     const nose = landmarks[1];
//     const faceCenterX = nose.x;
//     const centerOffset = Math.abs(faceCenterX - 0.5);

//     if (centerOffset > 0.2) score -= 15;
//     else if (centerOffset > 0.1) score -= 5;

//     // 5. Distance from camera (too close or too far)
//     const leftEye = landmarks[33];
//     const rightEye = landmarks[263];
//     const eyeDistance = Math.sqrt(
//       Math.pow(rightEye.x - leftEye.x, 2) +
//       Math.pow(rightEye.y - leftEye.y, 2)
//     );

//     if (eyeDistance < 0.08) score -= 15; // Too close
//     else if (eyeDistance > 0.15) score -= 15; // Too far

//     return Math.max(0, Math.min(100, Math.round(score)));
//   };

//   // Update status message based on parameters
//   const updateStatus = (score, pose, drowsiness) => {
//     if (score >= 80) setStatus("Focused ✓");
//     else if (score >= 60) setStatus("Slightly Distracted");
//     else if (score >= 40) setStatus("Distracted");
//     else if (score >= 20) setStatus("Highly Distracted");
//     else setStatus("Not Focused");

//     if (drowsiness > 50) setStatus("DROWSY! ⚠️");
//     if (Math.abs(pose.yaw) > 25) setStatus("Looking Away!");
//     if (Math.abs(pose.pitch) > 20) setStatus("Not Looking at Screen!");
//   };

//   function onResults(results) {
//     const videoWidth = webcamRef.current.video.videoWidth;
//     const videoHeight = webcamRef.current.video.videoHeight;

//     canvasRef.current.width = videoWidth;
//     canvasRef.current.height = videoHeight;

//     const canvasElement = canvasRef.current;
//     const canvasCtx = canvasElement.getContext("2d");
//     canvasCtx.save();
//     canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
//     canvasCtx.drawImage(
//       results.image,
//       0,
//       0,
//       canvasElement.width,
//       canvasElement.height
//     );

//     if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
//       const landmarks = results.multiFaceLandmarks[0];
//       lastValidLandmarks.current = landmarks;

//       // Calculate focus score
//       const currentScore = calculateFocusScore(landmarks);

//       // Update focus history (keep last 10 scores for smoothing)
//       focusHistory.current.push(currentScore);
//       if (focusHistory.current.length > 10) {
//         focusHistory.current.shift();
//       }

//       // Calculate smoothed score
//       const smoothedScore = Math.round(
//         focusHistory.current.reduce((a, b) => a + b, 0) / focusHistory.current.length
//       );
//       setFocusScore(smoothedScore);

//       // Update status
//       updateStatus(smoothedScore, headPose, drowsinessLevel);

//       // Draw face mesh
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_TESSELATION, {
//         color: smoothedScore >= 70 ? "#30FF30" : "#FF3030",
//         lineWidth: 1,
//       });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, {
//         color: drowsinessLevel > 30 ? "#FF3030" : "#30FF30",
//       });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, {
//         color: "#FF3030",
//       });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, {
//         color: drowsinessLevel > 30 ? "#FF3030" : "#30FF30",
//       });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, {
//         color: "#30FF30",
//       });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, {
//         color: "#E0E0E0",
//       });
//       connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, {
//         color: "#E0E0E0",
//       });

//       // Draw head pose direction indicator
//       const nose = landmarks[1];
//       canvasCtx.beginPath();
//       canvasCtx.arc(
//         nose.x * canvasElement.width,
//         nose.y * canvasElement.height,
//         5,
//         0,
//         2 * Math.PI
//       );
//       canvasCtx.fillStyle = smoothedScore >= 70 ? "#30FF30" : "#FF3030";
//       canvasCtx.fill();

//       // Draw gaze direction line
//       const leftEye = landmarks[33];
//       const rightEye = landmarks[263];
//       const eyeCenter = {
//         x: (leftEye.x + rightEye.x) / 2 * canvasElement.width,
//         y: (leftEye.y + rightEye.y) / 2 * canvasElement.height
//       };

//       canvasCtx.beginPath();
//       canvasCtx.moveTo(eyeCenter.x, eyeCenter.y);
//       canvasCtx.lineTo(
//         eyeCenter.x + headPose.yaw * 5,
//         eyeCenter.y + headPose.pitch * 3
//       );
//       canvasCtx.strokeStyle = "#FFD700";
//       canvasCtx.lineWidth = 2;
//       canvasCtx.stroke();

//     } else {
//       // No face detected
//       setFocusScore(0);
//       setStatus("No Face Detected");
//       setDrowsinessLevel(0);
//       setHeadPose({ yaw: 0, pitch: 0, roll: 0 });
//       focusHistory.current = [];
//     }

//     canvasCtx.restore();
//   }

//   useEffect(() => {
//     const faceMesh = new FaceMesh({
//       locateFile: (file) => {
//         return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
//       },
//     });

//     faceMesh.setOptions({
//       maxNumFaces: 1,
//       minDetectionConfidence: 0.5,
//       minTrackingConfidence: 0.5,
//       refineLandmarks: true,
//     });

//     faceMesh.onResults(onResults);

//     if (
//       typeof webcamRef.current !== "undefined" &&
//       webcamRef.current !== null
//     ) {
//       camera = new cam.Camera(webcamRef.current.video, {
//         onFrame: async () => {
//           await faceMesh.send({ image: webcamRef.current.video });
//         },
//         width: 640,
//         height: 480,
//       });
//       camera.start();
//     }

//     return () => {
//       if (camera) {
//         camera.stop();
//       }
//     };
//   }, []);

//   return (
//     <div style={{ 
//       display: 'flex', 
//       flexDirection: 'column', 
//       alignItems: 'center',
//       backgroundColor: '#1a1a1a',
//       minHeight: '100vh',
//       color: 'white',
//       padding: '20px'
//     }}>
//       <h1 style={{ color: '#4CAF50', marginBottom: '10px' }}>Study Focus Detector</h1>

//       <div style={{ 
//         display: 'flex', 
//         gap: '20px', 
//         marginBottom: '20px',
//         backgroundColor: '#2a2a2a',
//         padding: '20px',
//         borderRadius: '10px',
//         width: '640px',
//         justifyContent: 'space-around'
//       }}>
//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '14px', color: '#888' }}>Focus Score</div>
//           <div style={{ 
//             fontSize: '48px', 
//             fontWeight: 'bold',
//             color: focusScore >= 70 ? '#4CAF50' : focusScore >= 40 ? '#FFA500' : '#FF3030'
//           }}>
//             {focusScore}%
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '14px', color: '#888' }}>Status</div>
//           <div style={{ 
//             fontSize: '20px', 
//             fontWeight: 'bold',
//             color: status.includes('✓') ? '#4CAF50' : 
//                    status.includes('⚠️') ? '#FF3030' : '#FFA500',
//             marginTop: '15px'
//           }}>
//             {status}
//           </div>
//         </div>

//         <div style={{ textAlign: 'center' }}>
//           <div style={{ fontSize: '14px', color: '#888' }}>Drowsiness</div>
//           <div style={{ 
//             fontSize: '24px', 
//             fontWeight: 'bold',
//             color: drowsinessLevel > 30 ? '#FF3030' : '#4CAF50',
//             marginTop: '10px'
//           }}>
//             {Math.round(drowsinessLevel)}%
//           </div>
//         </div>
//       </div>

//       <div style={{ position: 'relative', width: 640, height: 480 }}>
//         <Webcam
//           ref={webcamRef}
//           style={{
//             position: "absolute",
//             width: 640,
//             height: 480,
//             borderRadius: '10px',
//           }}
//           mirrored={true}
//         />
//         <canvas
//           ref={canvasRef}
//           className="output_canvas"
//           style={{
//             position: "absolute",
//             width: 640,
//             height: 480,
//             borderRadius: '10px',
//           }}
//         />
//       </div>

//       <div style={{ 
//         marginTop: '20px',
//         backgroundColor: '#2a2a2a',
//         padding: '15px',
//         borderRadius: '10px',
//         width: '640px',
//         display: 'flex',
//         justifyContent: 'space-around'
//       }}>
//         <div>
//           <span style={{ color: '#888' }}>Head Pose: </span>
//           <span>Yaw: {Math.round(headPose.yaw)}° | </span>
//           <span>Pitch: {Math.round(headPose.pitch)}° | </span>
//           <span>Roll: {Math.round(headPose.roll)}°</span>
//         </div>
//       </div>

//       <div style={{ 
//         marginTop: '10px',
//         color: '#888',
//         fontSize: '12px'
//       }}>
//         Stay centered and keep eyes open for best focus score
//       </div>
//     </div>
//   );
// }

// export default App;