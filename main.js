import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

/* =========================
  CONFIG
========================= */
const AI_ENDPOINT =
"https://ai-avatar-backend-238220494455.asia-east1.run.app/chat";

/* =========================
  AUDIO UNLOCK
========================= */
let audioUnlocked = false;

function unlockAudio() {
  try {
    const audio = new Audio();
    audio.muted = true;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          audio.pause();
          audioUnlocked = true;
          console.log("🔓 Audio unlocked in iframe");
        })
        .catch((err) => {
          console.log("⚠️ Audio unlock attempt:", err.message);
        });
    }
  } catch (e) {
    console.log("⚠️ Audio unlock exception:", e.message);
  }
}

// Unlock on any user interaction - remove guards to allow multiple attempts
window.addEventListener("click", () => unlockAudio());
window.addEventListener("keydown", () => unlockAudio());
window.addEventListener("touchstart", () => unlockAudio());

// Try to unlock immediately and periodically
unlockAudio();
setInterval(() => {
  if (!audioUnlocked) {
    unlockAudio();
  }
}, 500);

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
    if (headBone) {
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
// Reset head and spine to idle pose
if (headBone) {
headBone.rotation.y = 0;
headBone.rotation.x = 0;
headBone.updateMatrixWorld(true);
}
if (spineBone && originalSpinePosition) {
spineBone.position.y = originalSpinePosition;
spineBone.updateMatrixWorld(true);
}
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
      // Attempt to unlock audio
      unlockAudio();
      
      audioPlayer.src = "data:audio/mp3;base64," + data.audio;
      
      // Attempt immediate playback
      const playPromise = audioPlayer.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("▶️ Audio playback started");
          })
          .catch(err => {
            console.warn("⚠️ Initial playback failed:", err.message);
            
            // Retry strategy: wait for unlock to complete
            const maxRetries = 3;
            let retryCount = 0;
            
            const retryPlay = () => {
              retryCount++;
              const retryPromise = audioPlayer.play();
              
              if (retryPromise !== undefined) {
                retryPromise
                  .then(() => {
                    console.log("▶️ Audio playback started (retry " + retryCount + ")");
                  })
                  .catch(retryErr => {
                    if (retryCount < maxRetries) {
                      console.warn("⚠️ Retry " + retryCount + " failed, retrying...");
                      setTimeout(retryPlay, 200);
                    } else {
                      console.error("🚫 Audio playback failed after retries:", retryErr.message);
                      stopLipSync();
                      notifyStorylineSpeechEnded();
                    }
                  });
              }
            };
            
            setTimeout(retryPlay, 300);
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

// Handle audio unlock from Storyline
if (event.data.type === "UNLOCK_AUDIO") {
console.log("🔓 Audio unlocked by Storyline");
audioUnlocked = true;
return;
}

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
