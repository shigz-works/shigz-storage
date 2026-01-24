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
   CAMERA
========================= */
const camera = new THREE.PerspectiveCamera(
  30,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.45, 2.6);

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

    // VRoid-standard arm bones
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

const loader = new GLTFLoader();
loader.load("./avatar1.glb", (gltf) => {
  avatarRoot = gltf.scene;
  scene.add(avatarRoot);

  // ✅ Apply relaxed idle pose
  applyIdlePose(avatarRoot);

  avatarRoot.traverse((obj) => {
    if (!obj.isMesh) return;

    if (obj.material?.map) {
      obj.material.map.colorSpace = THREE.SRGBColorSpace;
      obj.material.needsUpdate = true;
    }

    // Collect mouth-capable meshes
    if (
      obj.morphTargetDictionary &&
      obj.morphTargetDictionary["Fcl_MTH_A"] !== undefined
    ) {
      mouthMeshes.push(obj);
    }
  });

  console.log(`✅ Mouth meshes found: ${mouthMeshes.length}`);
});

/* =========================
   RESIZE
========================= */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* =========================
   LIP SYNC (MOUTH ONLY)
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
  if (mouthMeshes.length === 0) return;

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
   EMOTION SYSTEM (PERSISTENT)
========================= */
const emotionMap = {
  neutral: "Fcl_ALL_Neutral",
  happy: "Fcl_ALL_Joy",
  angry: "Fcl_ALL_Angry",
  sad: "Fcl_ALL_Sorrow",
  surprised: "Fcl_ALL_Surprised"
};

function setEmotion(emotion) {
  const morphName = emotionMap[emotion];
  if (!morphName) return;

  mouthMeshes.forEach((mesh) => {
    Object.values(emotionMap).forEach((emoMorph) => {
      const i = mesh.morphTargetDictionary[emoMorph];
      if (i !== undefined) mesh.morphTargetInfluences[i] = 0;
    });

    const index = mesh.morphTargetDictionary[morphName];
    if (index !== undefined) mesh.morphTargetInfluences[index] = 1;
  });
}

/* =========================
   SPEECH
========================= */
function speak(text) {
  if (!window.speechSynthesis) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.onstart = startLipSync;
  utterance.onend = stopLipSync;

  speechSynthesis.speak(utterance);
}

/* =========================
   AI CONNECTOR
========================= */
async function sendToAI(text) {
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  const data = await res.json();
  if (data.emotion) setEmotion(data.emotion);
  if (data.reply) speak(data.reply);
}

/* =========================
   CONSOLE ACCESS
========================= */
window.speak = speak;
window.setEmotion = setEmotion;
window.sendToAI = sendToAI;
window.testMouth = () => {
  resetMouth();
  mouthMeshes.forEach((mesh) => {
    const i = mesh.morphTargetDictionary["Fcl_MTH_A"];
    if (i !== undefined) mesh.morphTargetInfluences[i] = 1;
  });
};

/* =========================
   RENDER LOOP (NO ROTATION)
========================= */
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
