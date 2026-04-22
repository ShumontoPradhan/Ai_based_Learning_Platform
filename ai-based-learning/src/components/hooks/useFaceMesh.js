import { useRef, useEffect, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import { drawConnectors } from "@mediapipe/drawing_utils";
import * as Facemesh from "@mediapipe/face_mesh";

export default function useFaceMesh() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [focusScore, setFocusScore] = useState(0);
  const [status, setStatus] = useState("Initializing...");
  const [ear, setEAR] = useState(0);
  const [drowsinessLevel, setDrowsinessLevel] = useState(0);
  const [headPose, setHeadPose] = useState({ yaw: 0, pitch: 0 });
  const [lookingDirection, setLookingDirection] = useState("center");
  const [showGraph, setShowGraph] = useState(false);

  const EAR_THRESHOLD = 0.23;

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (!results.multiFaceLandmarks) return;

      const landmarks = results.multiFaceLandmarks[0];

      const nose = landmarks[1];
      const yaw = (nose.x - 0.5) * 100;
      const pitch = (nose.y - 0.5) * 100;

      setHeadPose({ yaw, pitch });

      if (yaw > 20) setLookingDirection("right");
      else if (yaw < -20) setLookingDirection("left");
      else setLookingDirection("center");

      const score = Math.max(0, 100 - Math.abs(yaw) - Math.abs(pitch));
      setFocusScore(Math.round(score));

      setStatus(score > 70 ? "Focused" : "Distracted");

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawConnectors(ctx, landmarks, Facemesh.FACEMESH_TESSELATION);
    });

    if (webcamRef.current) {
      const camera = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          await faceMesh.send({ image: webcamRef.current.video });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, []);

  return {
    webcamRef,
    canvasRef,
    focusScore,
    status,
    ear,
    drowsinessLevel,
    headPose,
    lookingDirection,
    showGraph,
    setShowGraph,
    EAR_THRESHOLD,
  };
}