import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

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
   AVATAR
========================= */
let avatarRoot = null;
let faceMesh = null;

const loader = new GLTFLoader();
loader.load("./avatar1.glb", (gltf) => {
  avatarRoot = gltf.scene;
  scene.add(avatarRoot);

  avatarRoot.traverse((obj) => {
    if (
      obj.isMesh &&
      obj.morphTargetDictionary &&
      obj.morphTargetDictionary["Fcl_MTH_A"] !== undefined
    ) {
      faceMesh = obj;
      console.log("✅ Mouth mesh found:", obj.morphTargetDictionary);
    }

    if (obj.isMesh && obj.material?.map) {
      obj.material.map.colorSpace = THREE.SRGBColorSpace;
      obj.material.needsUpdate = true;
    }
  });
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
   LIP SYNC SYSTEM
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
  if (!faceMesh) return;
  mouthShapes.forEach((name) => {
    const i = faceMesh.morphTargetDictionary[name];
    if (i !== undefined) faceMesh.morphTargetInfluences[i] = 0;
  });
}

function startLipSync() {
  if (!faceMesh) return;

  talkingInterval = setInterval(() => {
    resetMouth();
    const shape = mouthShapes[Math.floor(Math.random() * mouthShapes.length)];
    const i = faceMesh.morphTargetDictionary[shape];
    if (i !== undefined) faceMesh.morphTargetInfluences[i] = 0.7;
  }, 120);
}

function stopLipSync() {
  clearInterval(talkingInterval);
  resetMouth();
}

/* =========================
   WEB SPEECH API
========================= */
function speak(text) {
  if (!window.speechSynthesis || !text) return;

  speechSynthesis.cancel();
  speechSynthesis.resume();

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(v => v.lang.startsWith("en")) || voices[0];

  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onstart = startLipSync;
  utterance.onend = stopLipSync;

  speechSynthesis.speak(utterance);
}

/* 🔑 expose for console testing */
window.speak = speak;

/* =========================
   EMOTION SYSTEM
========================= */
function setEmotion(emotion) {
  if (!faceMesh) return;

  Object.keys(faceMesh.morphTargetDictionary).forEach((key) => {
    faceMesh.morphTargetInfluences[
      faceMesh.morphTargetDictionary[key]
    ] = 0;
  });

  const map = {
    happy: "Fcl_ALL_Joy",
    angry: "Fcl_ALL_Angry",
    sad: "Fcl_ALL_Sorrow",
    neutral: "Fcl_ALL_Neutral",
    surprised: "Fcl_ALL_Surprised"
  };

  const morph = map[emotion] || map.neutral;
  const i = faceMesh.morphTargetDictionary[morph];
  if (i !== undefined) faceMesh.morphTargetInfluences[i] = 1;

  console.log("😊 setEmotion:", emotion);
}

/* =========================
   STORYLINE → AI HANDLER
========================= */
window.addEventListener("message", (event) => {
  const data = event.data;

  if (data?.type === "aiResponse") {
    console.log("🤖 AI payload:", data);

    // ✅ emotion
    setEmotion(data.emotion);

    // ✅ TALK AFTER AI REPLY (FIX)
    speak(data.reply);
  }
});

/* =========================
   RENDER LOOP
========================= */
function animate() {
  requestAnimationFrame(animate);
  if (avatarRoot) avatarRoot.rotation.y += 0.0004;
  renderer.render(scene, camera);
}
animate();
