import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

/* =========================
  CONFIG
========================= */
const AI_ENDPOINT =
"https://ai-avatar-backend-238220494455.asia-east1.run.app/chat";

/* =========================
  AI CONVERSATION MEMORY
========================= */
let conversationHistory = [];
const MAX_TURNS = 8; // user + assistant pairs

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
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

/* =========================
  SUBTITLES
========================= */
const subtitleBox = document.createElement("div");
subtitleBox.id = "avatar-subtitles";
subtitleBox.style.cssText = `
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 80%;
  background: rgba(0,0,0,0.7);
  color: #fff;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 18px;
  line-height: 1.4;
  font-family: Arial, sans-serif;
  text-align: center;
  z-index: 9999;
  display: none;
`;
document.body.appendChild(subtitleBox);

function showSubtitles(text) {
  subtitleBox.textContent = text;
  subtitleBox.style.display = "block";
}

function hideSubtitles() {
  subtitleBox.style.display = "none";
}

/* =========================
  VOICE INPUT BUTTON
========================= */
const micBtn = document.createElement("button");
micBtn.textContent = "🎤";
micBtn.title = "Speak";
micBtn.style.cssText = `
  position: fixed;
  bottom: 110px;
  right: 30px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: #007bff;
  color: white;
  font-size: 24px;
  cursor: pointer;
  z-index: 9999;
`;
document.body.appendChild(micBtn);

/* =========================
  SPEECH TO TEXT
========================= */
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log("🎤 Voice input:", transcript);

    showSubtitles("You: " + transcript);
    sendToAI(transcript);
  };

  recognition.onerror = (e) => {
    console.error("❌ Speech recognition error:", e);
  };
} else {
  micBtn.disabled = true;
  micBtn.textContent = "🚫";
}

micBtn.addEventListener("click", () => {
  if (!conversationStarted) {
    startConversation();
  }

  if (recognition) {
    recognition.start();
    console.log("🎙️ Listening...");
  }
});

/* =========================
  LIGHTING
========================= */
scene.add(new THREE.AmbientLight(0xffffff, 4.0));
const dirLight = new THREE.DirectionalLight(0xffffff, 11);
dirLight.position.set(0, 3, 5);
scene.add(dirLight);

/* =========================
  IDLE POSE (NO T-POSE)
========================= */
function applyIdlePose(model) {
  model.traverse(obj => {
    if (!obj.isBone) return;

    // Bring upper arms down to sides (rotation around X-axis, negative to go down)
    if (obj.name.includes("UpperArm")) {
      obj.rotation.x = -Math.PI * 0.4; // ~-72° down
      obj.updateMatrixWorld(true);
    }

    // Bend elbows slightly
    if (obj.name.includes("LowerArm")) {
      obj.rotation.x = -Math.PI * 0.35; // ~-63° bend
      obj.updateMatrixWorld(true);
    }

    // Rotate shoulders inward slightly
    if (obj.name.includes("Shoulder")) {
      obj.rotation.y = obj.name.includes("L") ? Math.PI * 0.1 : -Math.PI * 0.1;
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
setupIdleGestures();
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
  IDLE GESTURES (Head, Breathing, Shoulders)
========================= */
let headBone = null;
let spineBone = null;
let originalHeadRotation = null;
let originalSpinePosition = null;
let gestureIntervals = [];
let isAvatarTalking = false;

function setupIdleGestures() {
  if (!avatarRoot) return;
  
  // Find head and spine bones
  avatarRoot.traverse(obj => {
    if (obj.isBone) {
      if (obj.name.includes("Head") && !obj.name.includes("Eye")) {
        headBone = obj;
      }
      if (obj.name.includes("Chest")) {
        spineBone = obj;
      }
    }
  });

  if (!headBone || !spineBone) return;

  if (headBone) {
    originalHeadRotation = { y: 0, x: 0 };
  }
  if (spineBone) {
    originalSpinePosition = spineBone.position.y;
  }

  // Head look around
  const headInterval = setInterval(() => {
    if (headBone && !isAvatarTalking) {
      const time = Date.now() * 0.0008;
      headBone.rotation.y = Math.sin(time) * 0.15;
      headBone.rotation.x = Math.cos(time * 0.5) * 0.08;
      headBone.updateMatrixWorld(true);
    }
  }, 50);
  gestureIntervals.push(headInterval);
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
  BROWSER TTS HELPER
========================= */
function speakWithBrowserTTS(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    isAvatarTalking = true;
    startLipSync();
  };

  utterance.onend = () => {
    isAvatarTalking = false;
    stopLipSync();
    setTimeout(() => {
      resetAvatar();
      notifyStorylineSpeechEnded();
    }, 600);
  };

  utterance.onerror = (e) => {
    console.error("❌ Browser TTS error:", e);
    isAvatarTalking = false;
    stopLipSync();
    resetAvatar();
    notifyStorylineSpeechEnded();
  };

  speechSynthesis.speak(utterance);
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
// 🔑 Check if audio was already unlocked this session
let audioUnlocked = sessionStorage.getItem('audioUnlocked') === 'true';

const audioPlayer = new Audio();
audioPlayer.crossOrigin = "anonymous";
audioPlayer.preload = "auto";
audioPlayer.playsInline = true;
audioPlayer.muted = false;

// Silent audio data URI (0.1s of silence)
const SILENT_AUDIO = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7////////////////////////////////////////////////////////////////////////////AAAAAExhdmM1OC4xMzAAAAAAAAAAAAAAAAkAAAAAAAAAAAAA";

console.log('🔍 Audio status:', audioUnlocked ? 'Unlocked' : 'Needs unlock');

// 🔊 Audio unlock overlay
function createOverlay() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'audio-unlock-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
  overlay.innerHTML = `<div style="background:#fff;padding:40px 60px;border-radius:15px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.4);max-width:90%;animation:fadeIn .3s ease"><div style="font-size:64px;margin-bottom:20px;animation:pulse 1.5s infinite">🔊</div><div style="font-size:24px;font-weight:bold;margin-bottom:15px;color:#333">Enable Audio</div><div style="font-size:16px;color:#666;margin-bottom:20px">Click or tap anywhere to enable sound</div><div style="background:#007bff;color:#fff;padding:12px 30px;border-radius:25px;font-size:16px;font-weight:bold;display:inline-block;user-select:none">Start</div></div>`;
  
  document.body.appendChild(overlay);
  if (audioUnlocked) overlay.style.display = 'none';
  return overlay;
}

const overlay = createOverlay();

let conversationStarted = false;

function startConversation() {
  if (conversationStarted) return;
  conversationStarted = true;

  unlockAudio();

  if (overlay?.parentElement) {
    overlay.style.display = "none";
    setTimeout(() => overlay.remove(), 100);
  }

  console.log("🟢 Conversation started");
}

// 🔓 Audio unlock function
async function unlockAudio() {
  if (audioUnlocked) return;
  
  audioUnlocked = true;
  sessionStorage.setItem('audioUnlocked', 'true');
  
  if (overlay?.parentElement) {
    overlay.style.display = 'none';
    setTimeout(() => overlay.remove(), 100);
  }
  
  try {
    audioPlayer.src = SILENT_AUDIO;
    audioPlayer.volume = 0.01;
    await audioPlayer.play();
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioPlayer.volume = 1.0;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      ctx.close();
    }
    
    console.log('🔓 Audio unlocked');
  } catch (e) {
    console.warn('⚠️ Audio unlock failed, using TTS fallback');
  }
}

// Event listeners
overlay.addEventListener("click", startConversation);
overlay.addEventListener("touchend", (e) => {
  e.preventDefault();
  startConversation();
});

audioPlayer.onplay = () => {
console.log("🔊 Audio playing");
isAvatarTalking = true;
startLipSync();
};

audioPlayer.onended = () => {
console.log("🔇 Audio ended");
isAvatarTalking = false;
stopLipSync();
hideSubtitles();

  // ⏳ Delay before reset + notify Storyline
setTimeout(() => {
resetAvatar();
notifyStorylineSpeechEnded();
}, 600);
};

audioPlayer.onerror = (e) => {
  console.error("❌ Audio element error:", e);
  isAvatarTalking = false;
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

  // 🧠 1️⃣ Store user message
  conversationHistory.push({
    role: "user",
    content: text
  });

  // Keep memory small
  if (conversationHistory.length > MAX_TURNS * 2) {
    conversationHistory = conversationHistory.slice(-MAX_TURNS * 2);
  }

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        history: conversationHistory // ✅ SEND MEMORY
      })
    });

    const data = await res.json();
    console.log("🤖 AI payload:", data);

    // 🧠 2️⃣ Store AI reply
    if (data.reply) {
      showSubtitles(data.reply);
      conversationHistory.push({
        role: "assistant",
        content: data.reply
      });
    }

    if (data.emotion) setEmotion(data.emotion);

    // Play audio or fallback to browser TTS
    if (data.audio && audioUnlocked) {
      audioPlayer.src = "data:audio/mpeg;base64," + data.audio;
      audioPlayer.play().catch(err => {
        console.warn("⚠️ Audio blocked, using TTS:", err);
        if (data.reply) speakWithBrowserTTS(data.reply);
        else notifyStorylineSpeechEnded();
      });
    } else if (data.reply) {
      console.warn("⚠️ Using browser TTS");
      speakWithBrowserTTS(data.reply);
    } else {
      notifyStorylineSpeechEnded();
    }

  } catch (err) {
    console.error("❌ AI error:", err);
    isAvatarTalking = false;
    stopLipSync();
    resetAvatar();
    notifyStorylineSpeechEnded();
  }
}

/* =========================
  STORYLINE MESSAGE BRIDGE
========================= */
window.addEventListener("message", (event) => {
  if (event.data?.type === "AI_MESSAGE") {
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
