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
let num_hand = 2;
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "1080px";
const videoWidth = "1920px";
let lastResult = "";
let lastResults = [];
let steps = [["wan0", "wan1", "wan2"], ["turtle0", "turtle1"]];
let currentCount = 0;
const gestureImg = document.getElementById("gestureImg");
let newGes;
let recorded = []

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: './gesture_recognizer-2.task',
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

function newGesture() {
    lastResult = "";
    lastResults = [];
    recorded = []
    currentCount = 0;
    let index = Math.floor(Math.random() * steps.length);
    newGes = steps[index];
    gestureImg.src = "img/" + newGes[0] + ".png";
}

newGesture();

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
    video1.style.display = "block";
    document.getElementById("output_canvas").style.zIndex="99"
    document.getElementById("output_canvas").style.display="block"
    if (!gestureRecognizer) {
        alert("Please wait for gestureRecognizer to load");
        return;
    }
    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.style.display = "none";
        gestureImg.style.display = "block";
        gestureImg.style.opacity = "1";
    } else {
        webcamRunning = true;
        // enableWebcamButton.innerText = "DISABLE PREDICTIONS";
        enableWebcamButton.style.display = "none";
        gestureImg.style.display = "block";
        gestureImg.style.opacity = "1";
        // document.getElementById("canvas").style.zIndex="100"
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
let categoryName1;
// let categoryName;

async function predictWebcam() {
    if (enableWebcamButton.style.display === 'none') {
        video1.style.display = "block";
    }

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
                color: "#FFFFFF",
                lineWidth: 5
            });
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FFFFFF",
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
        let categoryName = results.gestures[0][0].categoryName;
        const categoryScore = parseFloat(results.gestures[0][0].score * 100).toFixed(2);
        const handedness = results.handednesses[0][0].displayName;

        categoryName1 = results.gestures[1][0].categoryName;
        const categoryScore1 = parseFloat(results.gestures[1][0].score * 100).toFixed(2);

        gestureOutput1.innerText = `GestureRecognizer1: ${categoryName}\n Confidence1: ${categoryScore} %\n Handedness1: ${handedness}`;
        gestureOutput2.innerText = `GestureRecognizer2: ${categoryName1}\n Confidence2: ${categoryScore1} %\n Handedness2: ${results.handednesses[1][0].displayName}`;

        // const dx = results.landmarks[0][0].x - results.landmarks[1][0].x;
        // const dy = results.landmarks[0][0].y - results.landmarks[1][0].y;
        // const dz = results.landmarks[0][0].z - results.landmarks[1][0].z;
        // const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        // console.log(dist)
        // const point = [results.landmarks[0][0].x, results.landmarks[0][0].y, results.landmarks[0][0].z];
        // const point1 = [results.landmarks[1][0].x, results.landmarks[1][0].y, results.landmarks[1][0].z];
        // console.log(video1.src)
        if (categoryName === "turtle" && categoryName1 === "turtle") {
            categoryName = "turtle0";
            categoryName1 = "turtle0";
        }
        if (categoryName === categoryName1 && categoryName === newGes[currentCount] && categoryScore1 > 80 && categoryScore > 80) {

            finalOutput.innerText = categoryName
            // 第一次比出这个手势
            if (lastResults.filter((item) => item === categoryName).length === 100 && currentCount < newGes.length) {
                // if (categoryName === '万字纹2-samples' || categoryName === '万字纹1-samples') {
                // console.log(categoryName);
                lastResults = [];
                video1.src = "/video/" + newGes[currentCount] + ".mp4";
                video1.style.display = "block";
                gestureImg.style.display = "block";
                // gestureImg.style.opacity = "1";
                // gestureImg.src = "img/" + newGes[currentCount] + ".png";
                gestureImg.style.opacity = "0"
                console.log("currentCount1:", currentCount);
                // }
                // currentCount++;
                enableWebcamButton.style.display = "none";
                // gestureImg.style.display = "block";
                // gestureImg.style.opacity = "0";
                // video1.pause();
                // video1.currentTime = 1
                /*
                                video1.addEventListener("ended", function () {
                                    // currentCount++;
                                    // video1.src = "/video/" + newGes[currentCount] + ".mp4";
                                    console.log("currentCount2", currentCount);
                                    if (!(currentCount < newGes.length)) {
                                        recorded = []
                                    }
                                    // currentCount++;
                                    if (currentCount < newGes.length && (recorded.length === 0 || recorded[recorded.length - 1] !== categoryName)) {
                                        recorded.push(categoryName)
                                        currentCount++;
                                        // gestureImg.style.opacity = "0"
                                    }
                                    if (currentCount < newGes.length && newGes.length > 1) {
                                        if (currentCount !== 0) {
                                            video1.poster = "/video/" + newGes[currentCount] + ".png";
                                        }
                                        gestureImg.style.display = "block";
                                        gestureImg.style.opacity = "1";
                                        gestureImg.src = "img/" + newGes[currentCount] + ".png";
                                    } else {
                                        console.log("这个手势结束了，即将换新手势……");
                                        gestureImg.style.display = "none";
                                        gestureImg.style.opacity = "0";
                                        // video1.style.display = "none";
                                        video1.src = "";
                                        video1.poster = "";
                                        video1.style.display = "none";
                                        // recorded = []
                                        // enableWebcamButton.style.display = "block";
                                        newGesture();
                                        // video1.removeEventListener("ended",newGesture);
                                        // currentCount = 0
                                    }
                                    // video1.style.display = "none";
                                    // gestureImg.style.display = "block";
                                    // gestureImg.style.opacity = "0";
                                    // gestureImg.src = "img/" + newGes[currentCount] + ".png";

                                    // console.log(gestureImg.src);
                                    // video1.src = "";
                                    // enableWebcamButton.style.display = "block";
                                    // lastResult = "";
                                    // lastResults = [];
                                }, {once: true})
                */
                video1.addEventListener("ended", event=>{judgeEnd(categoryName)}, {once: true})
                // lastResults = []
            } else if (lastResults[lastResults.length - 1] === categoryName || lastResults.length === 0) { // 检测维持在一个手势
                lastResults.push(categoryName);
                // gestureImg.style.display = "none";
                // gestureImg.style.opacity = "0";
            } else if (lastResults[lastResults.length - 1] !== categoryName) { // 检测手势在变化
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

function judgeEnd(categoryName) {
    lastResults = [];
    if (currentCount < newGes.length && (recorded.length === 0 || recorded[recorded.length - 1] !== newGes[currentCount])) {
        console.log("完成一步了", recorded);
        recorded.push(categoryName);
        currentCount++;
        console.log("currentCount++:", currentCount,";recorded:",recorded);
        // gestureImg.style.opacity = "0"
    }
    // console.log("currentCount2", currentCount);
    if (currentCount !== 0) {
        console.log("换封面");
        video1.poster = "/video/" + newGes[currentCount] + ".png";
    }
    if (currentCount < newGes.length -1  && newGes.length > 1) {
        // if (currentCount !== 0) {
        //     console.log("换封面");
        //     video1.poster = "/video/" + newGes[currentCount] + ".png";
        // }
        gestureImg.style.display = "block";
        gestureImg.style.opacity = "1";
        gestureImg.src = "/img/" + newGes[currentCount] + ".png";
        // console.log(results)
        console.log("currentCount:", currentCount,";recorded:",recorded);
    } else {
        if (currentCount === newGes.length - 1) {
            // video1.poster = "";
            video1.src = "/video/" + newGes[currentCount] + ".mp4";
            video1.style.width = "70vw";
            video1.style.height = "70vh";
            video1.addEventListener("ended", endGes, {once: true})
        }
        // console.log(results)
    }

}

function endGes() {
    lastResults = [];
    currentCount = 0;
    console.log("这个手势结束了，即将换新手势……");
    gestureImg.style.display = "block";
    gestureImg.style.opacity = "1";
    video1.style.width = "70vw";
    video1.style.height = "70vh";
    // video1.style.display = "none";
    video1.src = "";
    video1.poster = "";
    video1.style.display = "none";
    // recorded = []
    // enableWebcamButton.style.display = "block";
    newGesture();
    // video1.removeEventListener("ended",newGesture);
    // currentCount = 0
}