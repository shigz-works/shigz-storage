import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

/* =========================
  CONFIG
========================= */
const AI_ENDPOINT =
"https://ai-avatar-backend-238220494455.asia-east1.run.app/chat";

/* =========================
  SCENE
========================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2);

/* =========================
  CAMERA (HEAD & SHOULDERS)
========================= */
const camera = new THREE.PerspectiveCamera(
28,
window.innerWidth / window.innerHeight,
0.1,
100
);
camera.position.set(0, 1.6, 1.8);
camera.lookAt(0, 1.6, 0);

/* =========================
  RENDERER
========================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

/* =========================
  LIGHTING
========================= */
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
dirLight.position.set(2, 4, 3);
scene.add(dirLight);

/* =========================
  IDLE POSE (NO T-POSE)
========================= */
function applyIdlePose(model) {
  const shoulderTilt = Math.PI * 0.12; // ~21.6° clavicle drop
  const upperArmDrop = Math.PI * 0.55; // ~99° bring arms to sides
  const elbowBend   = Math.PI * 0.25; // ~45° slight elbow bend

  model.traverse(obj => {
    if (!obj.isBone) return;

    // Clavicle tilt to bring shoulders down a bit
    if (obj.name.includes("Shoulder")) {
      obj.rotation.z = obj.name.includes("L") ? -shoulderTilt : shoulderTilt;
      obj.updateMatrixWorld(true);
    }

    // Swing arms down from T-pose to side pose
    if (obj.name.includes("UpperArm")) {
      obj.rotation.z = obj.name.includes("L") ? -upperArmDrop : upperArmDrop;
      obj.updateMatrixWorld(true);
    }

    // Light elbow bend so they are not locked straight
    if (obj.name.includes("LowerArm")) {
      obj.rotation.z = obj.name.includes("L") ? -elbowBend : elbowBend;
      obj.updateMatrixWorld(true);
    }
  });
}

/* =========================
  AVATAR
========================= */
let avatarRoot = null;
let mouthMeshes = [];
let blinkMeshes = [];

const loader = new GLTFLoader();
loader.load("./avatar1.glb", (gltf) => {
avatarRoot = gltf.scene;
scene.add(avatarRoot);

applyIdlePose(avatarRoot);

avatarRoot.traverse(obj => {
if (!obj.isMesh) return;

if (obj.material?.map) {
obj.material.map.colorSpace = THREE.SRGBColorSpace;
obj.material.needsUpdate = true;
}

if (obj.morphTargetDictionary?.Fcl_MTH_A !== undefined)
mouthMeshes.push(obj);

if (
obj.morphTargetDictionary?.Fcl_EYE_Close !== undefined ||
obj.morphTargetDictionary?.Fcl_EYE_Close_L !== undefined
)
blinkMeshes.push(obj);
});

setupBlinking();
console.log("✅ Avatar loaded & ready");
});

/* =========================
  BLINKING
========================= */
function setupBlinking() {
function blink() {
blinkMeshes.forEach(mesh => {
const d = mesh.morphTargetDictionary;
if (d.Fcl_EYE_Close !== undefined)
mesh.morphTargetInfluences[d.Fcl_EYE_Close] = 1;
else {
if (d.Fcl_EYE_Close_L !== undefined)
mesh.morphTargetInfluences[d.Fcl_EYE_Close_L] = 1;
if (d.Fcl_EYE_Close_R !== undefined)
mesh.morphTargetInfluences[d.Fcl_EYE_Close_R] = 1;
}
});

setTimeout(() => {
blinkMeshes.forEach(mesh =>
Object.keys(mesh.morphTargetDictionary).forEach(k => {
if (k.includes("EYE_Close"))
mesh.morphTargetInfluences[
mesh.morphTargetDictionary[k]
] = 0;
})
);
}, 120);

setTimeout(blink, 3000 + Math.random() * 3000);
}
blink();
}

/* =========================
  LIP SYNC
========================= */
const mouthShapes = [
"Fcl_MTH_A",
"Fcl_MTH_I",
"Fcl_MTH_U",
"Fcl_MTH_E",
"Fcl_MTH_O"
];

let talkingInterval = null;

function resetMouth() {
mouthMeshes.forEach(m =>
mouthShapes.forEach(n => {
const i = m.morphTargetDictionary[n];
if (i !== undefined) m.morphTargetInfluences[i] = 0;
})
);
}

function startLipSync() {
talkingInterval = setInterval(() => {
resetMouth();
const s = mouthShapes[Math.floor(Math.random() * mouthShapes.length)];
mouthMeshes.forEach(m => {
const i = m.morphTargetDictionary[s];
if (i !== undefined) m.morphTargetInfluences[i] = 0.8;
});
}, 120);
}

function stopLipSync() {
clearInterval(talkingInterval);
resetMouth();
}

/* =========================
  EMOTION SYSTEM
========================= */
const emotionMap = {
neutral: "Fcl_ALL_Neutral",
happy: "Fcl_ALL_Joy",
angry: "Fcl_ALL_Angry",
sad: "Fcl_ALL_Sorrow",
surprised: "Fcl_ALL_Surprised"
};

function setEmotion(emotion) {
console.log("😊 setEmotion:", emotion);
const morph = emotionMap[emotion];
if (!morph) return;

mouthMeshes.forEach(mesh => {
Object.values(emotionMap).forEach(e => {
const i = mesh.morphTargetDictionary[e];
if (i !== undefined) mesh.morphTargetInfluences[i] = 0;
});
const idx = mesh.morphTargetDictionary[morph];
if (idx !== undefined) mesh.morphTargetInfluences[idx] = 1;
});
}

function resetAvatar() {
console.log("🔄 Resetting avatar to idle state");
// Reset all emotions
mouthMeshes.forEach(mesh => {
Object.values(emotionMap).forEach(e => {
const i = mesh.morphTargetDictionary[e];
if (i !== undefined) mesh.morphTargetInfluences[i] = 0;
});
});
// Reset mouth
resetMouth();
// Reapply idle pose
if (avatarRoot) applyIdlePose(avatarRoot);
}

/* =========================
   CLOUD TTS AUDIO PLAYER
   CLOUD TTS AUDIO PLAYER (FIXED)
========================= */
const audioPlayer = new Audio();
audioPlayer.crossOrigin = "anonymous";
audioPlayer.preload = "auto";
audioPlayer.playsInline = true;
audioPlayer.muted = false;

audioPlayer.onplay = () => {
console.log("🔊 Audio playing");
startLipSync();
};

audioPlayer.onended = () => {
console.log("🔇 Audio ended");
stopLipSync();

  // ⏳ Delay before reset + notify Storyline
setTimeout(() => {
resetAvatar();
notifyStorylineSpeechEnded();
}, 600);
};

audioPlayer.onerror = (e) => {
  console.error("❌ Audio element error:", e);
  stopLipSync();
  notifyStorylineSpeechEnded();
};

/* =========================
  STORYLINE CALLBACK
========================= */
function notifyStorylineSpeechEnded() {
window.parent.postMessage(
{ type: "AVATAR_SPEECH_ENDED" },
"*"
);
}

/* =========================
  AI CONNECTOR (CLOUD TTS)
========================= */
async function sendToAI(text) {
console.log("➡️ sendToAI:", text);

try {
const res = await fetch(AI_ENDPOINT, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ text })
});

const data = await res.json();
console.log("🤖 AI payload:", data);

if (data.emotion) setEmotion(data.emotion);

if (data.audio) {
      audioPlayer.src = "data:audio/mp3;base64," + data.audio;
      
      const playPromise = audioPlayer.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("▶️ Audio playback started");
          })
          .catch(err => {
            console.error("🚫 Audio playback blocked:", err);
            console.error("Full error:", err);
            stopLipSync();
            notifyStorylineSpeechEnded();
          });
      }
 } else if (data.reply) {
       // Fallback: browser TTS if backend did not return audio
       console.warn("⚠️ No audio payload; using browser TTS fallback");
       const utterance = new SpeechSynthesisUtterance(data.reply);
       utterance.rate = 1.0;
       utterance.pitch = 1.0;

       utterance.onstart = () => {
         startLipSync();
       };

       utterance.onend = () => {
         stopLipSync();
         setTimeout(() => {
           resetAvatar();
           notifyStorylineSpeechEnded();
         }, 600);
       };

       utterance.onerror = (e) => {
         console.error("❌ Browser TTS error:", e);
         stopLipSync();
         notifyStorylineSpeechEnded();
       };

       speechSynthesis.speak(utterance);
 } else {
       console.warn("⚠️ No audio or reply in payload; ending conversation");
       notifyStorylineSpeechEnded();
}
} catch (err) {
console.error("❌ AI error:", err);
notifyStorylineSpeechEnded();
}
}

/* =========================
  STORYLINE MESSAGE BRIDGE
========================= */
window.addEventListener("message", (event) => {
if (!event.data || !event.data.type) return;

if (event.data.type === "AI_MESSAGE") {
console.log("📩 From Storyline:", event.data.text);
sendToAI(event.data.text);
}
});

/* =========================
  RENDER LOOP
========================= */
function animate() {
requestAnimationFrame(animate);
renderer.render(scene, camera);
}
animate();
