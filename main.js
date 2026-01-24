import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

/* =========================
   AUDIO UNLOCK (REQUIRED)
========================= */
window.addEventListener(
  "click",
  () => {
    if (window.speechSynthesis) {
      speechSynthesis.resume();
      console.log("🔊 Speech unlocked");
    }
  },
  { once: true }
);

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
  model.traverse((obj) => {
    if (!obj.isBone) return;

    if (obj.name.includes("UpperArm")) {
      obj.rotation.z = obj.name.includes("Left") ? 0.6 : -0.6;
    }
    if (obj.name.includes("LowerArm")) {
      obj.rotation.z = 0.1;
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

  avatarRoot.traverse((obj) => {
    if (!obj.isMesh) return;

    if (obj.material?.map) {
      obj.material.map.colorSpace = THREE.SRGBColorSpace;
      obj.material.needsUpdate = true;
    }

    if (obj.morphTargetDictionary?.Fcl_MTH_A !== undefined) {
      mouthMeshes.push(obj);
    }

    if (
      obj.morphTargetDictionary?.Fcl_EYE_Close !== undefined ||
      obj.morphTargetDictionary?.Fcl_EYE_Close_L !== undefined
    ) {
      blinkMeshes.push(obj);
    }
  });

  setupBlinking();
  console.log("✅ Avatar loaded & ready");
});

/* =========================
   BLINKING
========================= */
function setupBlinking() {
  function blink() {
    blinkMeshes.forEach((mesh) => {
      const d = mesh.morphTargetDictionary;
      if (d.Fcl_EYE_Close !== undefined) {
        mesh.morphTargetInfluences[d.Fcl_EYE_Close] = 1;
      } else {
        if (d.Fcl_EYE_Close_L !== undefined)
          mesh.morphTargetInfluences[d.Fcl_EYE_Close_L] = 1;
        if (d.Fcl_EYE_Close_R !== undefined)
          mesh.morphTargetInfluences[d.Fcl_EYE_Close_R] = 1;
      }
    });

    setTimeout(() => {
      blinkMeshes.forEach((mesh) => {
        Object.keys(mesh.morphTargetDictionary).forEach((k) => {
          if (k.includes("EYE_Close")) {
            mesh.morphTargetInfluences[
              mesh.morphTargetDictionary[k]
            ] = 0;
          }
        });
      });
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
  mouthMeshes.forEach((mesh) => {
    mouthShapes.forEach((name) => {
      const i = mesh.morphTargetDictionary[name];
      if (i !== undefined) mesh.morphTargetInfluences[i] = 0;
    });
  });
}

function startLipSync() {
  talkingInterval = setInterval(() => {
    resetMouth();
    const shape = mouthShapes[Math.floor(Math.random() * mouthShapes.length)];
    mouthMeshes.forEach((mesh) => {
      const i = mesh.morphTargetDictionary[shape];
      if (i !== undefined) mesh.morphTargetInfluences[i] = 0.8;
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

  mouthMeshes.forEach((mesh) => {
    Object.values(emotionMap).forEach((e) => {
      const i = mesh.morphTargetDictionary[e];
      if (i !== undefined) mesh.morphTargetInfluences[i] = 0;
    });

    const idx = mesh.morphTargetDictionary[morph];
    if (idx !== undefined) mesh.morphTargetInfluences[idx] = 1;
  });
}

/* =========================
   SPEECH (RESET TO NEUTRAL)
========================= */
function speak(text) {
  console.log("🗣️ speak():", text);

  if (!window.speechSynthesis) return;

  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);

  u.onstart = () => {
    console.log("🔊 Speech started");
    startLipSync();
  };

  u.onend = () => {
    console.log("🔇 Speech ended");
    stopLipSync();

    // ✅ RESET EMOTION AFTER TALKING
    setEmotion("neutral");
  };

  u.onerror = (e) => console.error("❌ Speech error:", e);

  speechSynthesis.speak(u);
}

/* =========================
   AI CONNECTOR
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
    if (data.reply) speak(data.reply);
  } catch (err) {
    console.error("❌ AI error:", err);
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
