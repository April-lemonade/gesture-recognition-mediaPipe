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

let loaded = false;
const demosSection = document.getElementById("demos");
let gestureRecognizer;
let runningMode = "IMAGE";
let num_hand = 2;
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "720px";
let lastResult = "";
let lastResults = [];
let steps = [["wan0", "wan1", "wan2"], ["turtle0", "turtle1"], ["phoenix0", "phoenix1"]];
let currentCount = 0;
const gestureImg = document.getElementById("gestureImg");
let newGes;
let recorded = [];
const ingSounds = [
    ["ing_syn_0_0.wav", "ing_syn_1_0.wav", "ing_ope_0_0.wav", "ing_ope_1_0.wav"],
    ["ing_syn_0_1.wav", "ing_syn_1_1.wav", "ing_ope_0_1.wav", "ing_ope_1_1.wav"]
];
const edSounds = ["ed_syn_0.wav", "ed_syn_1.wav", "ed_ope_0.wav", "ed_ope_1.wav"];
let soundIndex;
let edSoundIndex;
const gestureInfo = [
    {name: "万字纹", detail: "<p>万字纹是一种由两条直线交叉形成的图形，</p><p>象征着无穷、永恒、万事如意。</p>"},
    {
        name: "龟背纹",
        detail: "<p>龟背纹是以六边形为基本单元</p><p>连缀而成的四方连续纹样，</p></p><p>表现人间高寿、吉祥的美好愿景。</p>"
    }, {
        name: "凤纹",
        detail: "<p>凤凰的形象是各种兽禽类自然形象的优美组合，</p><p>它既象征国运昌盛，又象征皇后，</p><p>既寓意夫妻恩爱和美，又表示个人才华的出类拔萃。<p></p>"
    }
];


const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
console.log(isMobile)
if (isMobile) {
    alert("请使用PC端");
    window.opener = null;
    window.top.open('', '_self', '');
    window.close(this);
}

const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: './gesture_recognizer (1).task',
            delegate: "GPU",
            num_hands: num_hand
        },
        runningMode: runningMode,
        numHands: num_hand,
        // min_hand_presence_confidence: 0.9,
        // minHandPresenceConfidence: 0.9,
        // min_hand_detection_confidence: 0.9,
        // minHandDetectionConfidence: 0.9
    });
    demosSection.classList.remove("invisible");
};
createGestureRecognizer().then(r => {
    if (hasGetUserMedia()) {
        enableWebcamButton = document.getElementById("webcamButton");
        // enableWebcamButton.addEventListener("click", enableCam);
        enableCam();

    } else {
        console.warn("getUserMedia() is not supported by your browser");
    }
});

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput1 = document.getElementById("gesture_output1");
const gestureOutput2 = document.getElementById("gesture_output2");
const finalOutput = document.getElementById("final_output");
const video1 = document.getElementById("video");
const sound = document.getElementById("sound");
const gestureName = document.getElementById("gestureName");
const gestureDetail = document.getElementById("gestureDetail");
const info = document.getElementsByClassName("gestureInfo");
const reminder = document.getElementById("reminder");
const progress = document.getElementById("progress");
const progressValue = document.getElementById("progressValue");


function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function enableCam(event) {
    video1.style.display = "block";
    document.getElementById("output_canvas").style.zIndex = "99";
    document.getElementById("output_canvas").style.display = "block";
    if (!gestureRecognizer) {
        alert("Please wait for gestureRecognizer to load");
        return;
    }
    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.style.display = "none";
        gestureImg.style.display = "block";
        gestureImg.style.opacity = "1";
        reminder.style.opacity = "1";
    } else {
        webcamRunning = true;
        // enableWebcamButton.innerText = "DISABLE PREDICTIONS";
        enableWebcamButton.style.display = "none";
        gestureImg.style.display = "block";
        gestureImg.style.opacity = "1";
        reminder.style.opacity = "1";
    }
    // get Usermedia parameters.
    const constraints = {
        video: true
    };
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
        // loaded = true;
        document.getElementById("webcamButton").style.display = "none";
        document.getElementById("content").style.display = "flex";
    });
}

let lastVideoTime = -1;
let results = undefined;
let categoryName1;

async function predictWebcam() {


    const webcamElement = document.getElementById("webcam");
    // Now let's start detecting the stream.
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await gestureRecognizer.setOptions({
            runningMode: "VIDEO",
            numHands: 2,
            // minHandPresenceConfidence: 0.9,
            // min_hand_detection_confidence: 0.9,
            // minHandDetectionConfidence: 0.9
        });
    }
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
    canvasElement.style.marginTop = "60vh";
    webcamElement.style.marginTop = "60vh";
    canvasElement.style.marginLeft = "50vh";
    webcamElement.style.marginLeft = "50vh";
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
    if (results.gestures.length > 1) {
        gestureOutput1.style.display = "block";
        gestureOutput1.style.width = videoWidth;
        gestureOutput2.style.display = "block";
        gestureOutput2.style.width = videoWidth;
        let categoryName = results.gestures[0][0].categoryName;
        const categoryScore = parseFloat(results.gestures[0][0].score * 100).toFixed(2);

        categoryName1 = results.gestures[1][0].categoryName;
        const categoryScore1 = parseFloat(results.gestures[1][0].score * 100).toFixed(2);

        if (categoryName === categoryName1 && categoryScore1 > 80 && categoryScore > 80 && categoryName === "start") {
            console.log(categoryName)
            document.body.classList.add('fade-in');
            window.location.href = "content.html"
        } else {

        }
    } else {

    }
    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}


