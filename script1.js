// Copyright 2023 The MediaPipe Authors.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//      http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
    GestureRecognizer,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const demosSection = document.getElementById("demos");
let gestureRecognizer;
let runningMode = "IMAGE";
let num_hand = 2
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";
let lastResult = "";
let lastResults = [];
let gestures = ["wan1"];
// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: './gesture_recognizer-3.task',
            delegate: "GPU",
            num_hands: num_hand
        },
        runningMode: runningMode,
        numHands: num_hand,
        min_hand_presence_confidence: 0.9,
        minHandPresenceConfidence: 0.9,
        min_hand_detection_confidence: 0.9,
        minHandDetectionConfidence: 0.9
    });
    demosSection.classList.remove("invisible");
};
createGestureRecognizer();
let index = Math.random() * (gestures.length - 1);
let currentGesture = gestures[index];
const gestureImg = document.getElementById("gestureImg");
gestureImg.src = "/img/" + currentGesture + ".png";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput1 = document.getElementById("gesture_output1");
const gestureOutput2 = document.getElementById("gesture_output2");
const finalOutput = document.getElementById("final_output");
const video1 = document.getElementById("video");

// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam(event) {
    if (!gestureRecognizer) {
        alert("Please wait for gestureRecognizer to load");
        return;
    }
    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.style.display = "none";
        // gestureImg.style.display = "block";
        gestureImg.style.opacity = "1";
    } else {
        webcamRunning = true;
        // enableWebcamButton.innerText = "DISABLE PREDICTIONS";
        enableWebcamButton.style.display = "none";
        // gestureImg.style.display = "block";
        gestureImg.style.opacity = "1";
    }
    // get Usermedia parameters.
    const constraints = {
        video: true
    };
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
}

let lastVideoTime = -1;
let results = undefined;

async function predictWebcam() {
    const webcamElement = document.getElementById("webcam");
    // Now let's start detecting the stream.
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await gestureRecognizer.setOptions({
            runningMode: "VIDEO", numHands: 2, minHandPresenceConfidence: 0.9, min_hand_detection_confidence: 0.9,
            minHandDetectionConfidence: 0.9
        });
    }
    // await gestureRecognizer.setOptions({ numHands: 2 })
    let nowInMs = Date.now();
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        results = gestureRecognizer.recognizeForVideo(video, nowInMs);
    }
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);
    canvasElement.style.height = videoHeight;
    webcamElement.style.height = videoHeight;
    canvasElement.style.width = videoWidth;
    webcamElement.style.width = videoWidth;
    if (results.landmarks) {
        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 5
            });
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 2
            });
        }
    }
    canvasCtx.restore();
    // console.log(results)
    if (results.gestures.length > 1) {
        gestureOutput1.style.display = "block";
        gestureOutput1.style.width = videoWidth;
        gestureOutput2.style.display = "block";
        gestureOutput2.style.width = videoWidth;
        const categoryName = results.gestures[0][0].categoryName;
        const categoryScore = parseFloat(results.gestures[0][0].score * 100).toFixed(2);
        const handedness = results.handednesses[0][0].displayName;

        const categoryName1 = results.gestures[1][0].categoryName;
        const categoryScore1 = parseFloat(results.gestures[1][0].score * 100).toFixed(2);

        gestureOutput1.innerText = `GestureRecognizer1: ${categoryName}\n Confidence1: ${categoryScore} %\n Handedness1: ${handedness}`;
        gestureOutput2.innerText = `GestureRecognizer2: ${categoryName1}\n Confidence2: ${categoryScore1} %\n Handedness2: ${results.handednesses[1][0].displayName}`;

        const dx = results.landmarks[0][0].x - results.landmarks[1][0].x;
        const dy = results.landmarks[0][0].y - results.landmarks[1][0].y;
        const dz = results.landmarks[0][0].z - results.landmarks[1][0].z;

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        // console.log(dist)

        // const point = [results.landmarks[0][0].x, results.landmarks[0][0].y, results.landmarks[0][0].z];
        // const point1 = [results.landmarks[1][0].x, results.landmarks[1][0].y, results.landmarks[1][0].z];
        console.log(video1.src)
        if (categoryName === categoryName1 && categoryScore1 > 75 && categoryScore > 75) {
            finalOutput.innerText = categoryName
            if (video1.style.display === "none" && lastResults.filter((item) => item === categoryName).length === 60) {
                video1.style.display = "block";
                video1.src = "/video/wan.mp4";
                enableWebcamButton.style.display = "none";
                // gestureImg.style.display = "none";
                gestureImg.style.opacity = "1";
                video1.addEventListener("ended", function () {
                    video1.style.display = "none";
                    // gestureImg.style.display = "block";
                    gestureImg.style.opacity = "1";
                    video1.src = "";
                    // enableWebcamButton.style.display = "block";
                    lastResult = "";
                    lastResults = [];
                })
                // lastResults = []
            } else if (lastResults[lastResults.length - 1] === categoryName || lastResults.length === 0) {
                lastResults.push(categoryName);
                // gestureImg.style.display = "none";
                gestureImg.style.opacity = "0";
            } else if (lastResults[lastResults.length - 1] !== categoryName) {
                lastResults = [];
                // gestureImg.style.display = "block";
                gestureImg.style.opacity = "1";
            }
            // lastResult = categoryName
            // lastResults.append(categoryName)
            // if (lastResults.length > 10) lastResults.slice(0, 9);
            // console.log(video1.src)
        } else {
            finalOutput.innerText = "none";
        }
    } else {
        gestureOutput1.style.display = "none";
        gestureOutput2.style.display = "none";
    }
    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}