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
function FocusCard() {
  
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


export default FocusCard;