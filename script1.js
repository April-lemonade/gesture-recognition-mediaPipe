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
let steps = [["wan0", "wan1", "wan2"], ["turtle0", "turtle1"], ["phoenix0"]];
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

// 检测如果是非PC设备，弹窗提示后关闭页面
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
console.log(isMobile)
if (isMobile) {
    alert("请使用PC端");
    window.opener = null;
    window.top.open('', '_self', '');
    window.close(this);
}

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: './gesture_recognizer.task',
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

let index = -1;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function newGesture() {

    soundIndex = Math.round(Math.random() * ingSounds.length);
    edSoundIndex = Math.round(Math.random());
    lastResult = "";
    lastResults = [];
    recorded = []
    currentCount = 0;
    // let index = Math.floor(Math.random() * steps.length);
    if (index < steps.length - 1) {
        index = index + 1;
    } else {
        // index = 0;
        location.reload();
    }
    console.log("index", index);
    newGes = steps[index];
    gestureImg.src = "/img/" + newGes[0] + ".png";
}

newGesture();

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

// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it.
/*if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
    enableCam();

} else {
    console.warn("getUserMedia() is not supported by your browser");
}*/

// Enable the live webcam view and start detection.
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
    if (lastResults.filter((item) => item === "none").length === 3000) { // 中途间隔一段时间没有手势就从头开始
        location.reload();
    }
    if (enableWebcamButton.style.display === 'none') {
        video1.style.display = "block";
    }
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


        // if (categoryName === "turtle" && categoryName1 === "turtle") {
        //     categoryName = "turtle0";
        //     categoryName1 = "turtle0";
        // }
        if (categoryName === categoryName1 && categoryName === newGes[currentCount] && categoryScore1 > 55 && categoryScore > 55) {
            console.log(categoryName)
            finalOutput.innerText = categoryName;
            // 第一次比出这个手势
            if (lastResults.filter((item) => item === categoryName).length === 100 && currentCount < newGes.length && categoryName !== lastResult) {
                progress.value = "0";
                gestureName.style.border = "double 3px white";
                gestureName.innerText = gestureInfo[index].name;
                gestureDetail.innerHTML = gestureInfo[index].detail;
                info[0].style.opacity = 1;
                info[1].style.opacity = 1;
                lastResult = categoryName
                lastResults = [];
                video1.src = "/video/" + newGes[currentCount] + ".mp4";
                video1.style.display = "block";
                gestureImg.style.display = "block";
                sound.src = "/sound/" + ingSounds[currentCount][soundIndex];
                console.log("更新声音");
                gestureImg.style.opacity = "0"
                reminder.style.opacity = "0";
                progress.style.opacity = "0";
                console.log("currentCount1:", currentCount);
                enableWebcamButton.style.display = "none";
                video1.addEventListener("ended", event => {
                    judgeEnd(categoryName)
                }, {once: true})
            } else if (lastResults[lastResults.length - 1] === categoryName || lastResults.length === 0) { // 检测维持在一个手势
                lastResults.push(categoryName);
                progress.value = lastResults.filter((item) => item === newGes[currentCount]).length;
            } else if (lastResults[lastResults.length - 1] !== categoryName) { // 检测手势在变化
                lastResults = [];
                gestureImg.style.opacity = "1";
                reminder.style.opacity = "1";
            }
        } else {
            finalOutput.innerText = "none";
        }
    } else {
        gestureOutput1.style.display = "none";
        gestureOutput2.style.display = "none";
        console.log("none");
        lastResults.push("none");
    }
    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}

function judgeEnd(categoryName) {
    lastResults = [];
    if (currentCount < newGes.length && (recorded.length === 0 || recorded[recorded.length - 1] !== categoryName)) {
        console.log("完成一步了", recorded);
        recorded.push(categoryName);
        currentCount++;
        console.log("currentCount++:", currentCount, ";recorded:", recorded);
    }
    if (currentCount !== 0) {
        console.log("换封面");
        video1.poster = "/video/" + newGes[currentCount] + ".png";
    }
    if (currentCount < newGes.length - 1 && newGes.length > 1) {
        gestureImg.style.display = "block";
        gestureImg.style.opacity = "1";
        reminder.style.opacity = "1";
        progress.value = "0";
        progress.style.opacity = "1";
        gestureImg.src = "/img/" + newGes[currentCount] + ".png";
        console.log("currentCount:", currentCount, ";recorded:", recorded);
    } else {
        if (currentCount === newGes.length - 1) {
            gestureName.style.opacity = "0";
            gestureDetail.style.opacity = "0";
            video1.src = "/video/" + newGes[currentCount] + ".mp4";
            // video1.style.width = "100vw";
            // video1.style.height = "70vh";
            video1.addEventListener("canplaythrough", () => {
                sound.src = "/sound/" + edSounds[soundIndex];
                console.log("更新最终展示音效");
            }, {once: true});
            sound.addEventListener("ended", () => {
                sound.src = "";
                if (video1.ended) {
                    if (index === steps.length - 1) {
                        location.reload();
                    }
                    endGes();
                }
            })
            // video1.addEventListener("ended", endGes, {once: true})
        }
    }

}

function endGes() {
    lastResults = [];
    currentCount = 0;
    console.log("这个手势结束了，即将换新手势……");
    info[0].style.opacity = "0";
    info[1].style.opacity = "0";
    gestureImg.style.display = "block";
    gestureImg.style.opacity = "1";
    reminder.style.opacity = "1";
    progress.style.opacity = "1";
    // video1.style.width = "100vw";
    // video1.style.height = "70vh";
    video1.src = "";
    video1.poster = "";
    video1.style.display = "none";
    gestureName.innerText = "";
    gestureDetail.innerText = "";
    gestureName.style.border = "";
    progress.value = "0";
    newGesture();
}