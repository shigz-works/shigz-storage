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
   RENDERER (CRITICAL)
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
loader.load("./avatar.glb", (gltf) => {
  avatarRoot = gltf.scene;
  scene.add(avatarRoot);

  avatarRoot.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;

      if (obj.material?.map) {
        obj.material.map.colorSpace = THREE.SRGBColorSpace;
        obj.material.needsUpdate = true;
      }

      if (obj.morphTargetDictionary && !faceMesh) {
        faceMesh = obj;
        console.log("✅ Morph targets:", obj.morphTargetDictionary);
      }
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
   WEB SPEECH API (TTS)
========================= */
function speak(text) {
  if (!window.speechSynthesis) {
    alert("Web Speech API not supported");
    return;
  }

  speechSynthesis.cancel();

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

/* =========================
   TEST BUTTON (REMOVE LATER)
========================= */
const btn = document.createElement("button");
btn.textContent = "Speak";
btn.style.position = "fixed";
btn.style.bottom = "20px";
btn.style.left = "20px";
btn.style.zIndex = "10";
document.body.appendChild(btn);

btn.addEventListener("click", () => {
  speak("Hello! I am your real time virtual assistant.");
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
