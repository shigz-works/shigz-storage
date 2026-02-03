import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

/* =========================
  CONFIG
========================= */
const AI_ENDPOINT =
  "https://ai-avatar-backend-238220494455.asia-east1.run.app/chat";

/* =========================
  CONVERSATION MEMORY
========================= */
let conversationHistory = [];
const MAX_TURNS = 8;

/* =========================
  SCENE
========================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2);

/* =========================
  CAMERA
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
document.body.appendChild(renderer.domElement);

/* =========================
  LIGHTING
========================= */
scene.add(new THREE.AmbientLight(0xffffff, 4));
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
let isAvatarTalking = false;

const loader = new GLTFLoader();
loader.load("./avatar1.glb", (gltf) => {
  avatarRoot = gltf.scene;
  scene.add(avatarRoot);

  avatarRoot.traverse(obj => {
    if (!obj.isMesh) return;

    if (obj.material?.map) {
      obj.material.map.colorSpace = THREE.SRGBColorSpace;
      obj.material.needsUpdate = true;
    }

    if (obj.morphTargetDictionary?.Fcl_MTH_A !== undefined)
      mouthMeshes.push(obj);

    if (obj.morphTargetDictionary?.Fcl_EYE_Close !== undefined)
      blinkMeshes.push(obj);
  });

  setupBlinking();
  console.log("✅ Avatar ready");
});

/* =========================
  BLINKING
========================= */
function setupBlinking() {
  function blink() {
    blinkMeshes.forEach(m => {
      const i = m.morphTargetDictionary.Fcl_EYE_Close;
      if (i !== undefined) m.morphTargetInfluences[i] = 1;
    });

    setTimeout(() => {
      blinkMeshes.forEach(m => {
        const i = m.morphTargetDictionary.Fcl_EYE_Close;
        if (i !== undefined) m.morphTargetInfluences[i] = 0;
      });
    }, 120);

    setTimeout(blink, 3000 + Math.random() * 3000);
  }
  blink();
}

/* =========================
  LIP SYNC
========================= */
const mouthShapes = ["Fcl_MTH_A","Fcl_MTH_I","Fcl_MTH_U","Fcl_MTH_E","Fcl_MTH_O"];
let talkingInterval = null;

function resetMouth() {
  mouthMeshes.forEach(m =>
    mouthShapes.forEach(s => {
      const i = m.morphTargetDictionary[s];
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
  EMOTION
========================= */
const emotionMap = {
  neutral: "Fcl_ALL_Neutral",
  happy: "Fcl_ALL_Joy",
  angry: "Fcl_ALL_Angry",
  sad: "Fcl_ALL_Sorrow",
  surprised: "Fcl_ALL_Surprised"
};

function setEmotion(emotion) {
  const morph = emotionMap[emotion];
  if (!morph) return;

  mouthMeshes.forEach(m => {
    Object.values(emotionMap).forEach(e => {
      const i = m.morphTargetDictionary[e];
      if (i !== undefined) m.morphTargetInfluences[i] = 0;
    });
    const idx = m.morphTargetDictionary[morph];
    if (idx !== undefined) m.morphTargetInfluences[idx] = 1;
  });
}

/* =========================
  AUDIO
========================= */
const audioPlayer = new Audio();
audioPlayer.playsInline = true;

audioPlayer.onplay = () => {
  isAvatarTalking = true;
  startLipSync();
};

audioPlayer.onended = () => {
  isAvatarTalking = false;
  stopLipSync();
  notifyStorylineSpeechEnded();
};

function notifyStorylineSpeechEnded() {
  window.parent.postMessage({ type: "AVATAR_SPEECH_ENDED" }, "*");
}

/* =========================
  AI CONNECTOR
========================= */
async function sendToAI(text) {
  conversationHistory.push({ role: "user", content: text });
  conversationHistory = conversationHistory.slice(-MAX_TURNS * 2);

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, history: conversationHistory })
    });

    const data = await res.json();

    if (data.reply)
      conversationHistory.push({ role: "assistant", content: data.reply });

    if (data.emotion) setEmotion(data.emotion);

    if (data.audio) {
      audioPlayer.src = "data:audio/mp3;base64," + data.audio;
      await audioPlayer.play();
    } else {
      notifyStorylineSpeechEnded();
    }

  } catch (err) {
    console.error(err);
    notifyStorylineSpeechEnded();
  }
}

/* =========================
  STORYLINE BRIDGE
========================= */
window.addEventListener("message", e => {
  if (e.data?.type === "AI_MESSAGE") {
    sendToAI(e.data.text);
  }
});

/* =========================
  LOOP
========================= */
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
