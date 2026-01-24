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
let mouthMeshes = []; // 🔥 IMPORTANT

const loader = new GLTFLoader();
loader.load("./avatar1.glb", (gltf) => {
  avatarRoot = gltf.scene;
  scene.add(avatarRoot);

  avatarRoot.traverse((obj) => {
    if (!obj.isMesh) return;

    if (obj.material?.map) {
      obj.material.map.colorSpace = THREE.SRGBColorSpace;
      obj.material.needsUpdate = true;
    }

    // 🔑 COLLECT ALL MOUTH MESHES
    if (
      obj.morphTargetDictionary &&
      obj.morphTargetDictionary["Fcl_MTH_A"] !== undefined
    ) {
      mouthMeshes.push(obj);
      console.log("👄 Mouth mesh found:", obj.name);
    }
  });

  console.log(`✅ Total mouth meshes: ${mouthMeshes.length}`);
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
   WEB SPEECH API
========================= */
function speak(text) {
  if (!window.speechSynthesis) {
    alert("Web Speech API not supported");
    return;
  }

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;

  utterance.onstart = startLipSync;
  utterance.onend = stopLipSync;

  speechSynthesis.speak(utterance);
}

/* =========================
   CONSOLE TEST
========================= */
function testMouth() {
  if (mouthMeshes.length === 0) {
    console.warn("❌ No mouth meshes found yet");
    return;
  }

  resetMouth();
  mouthMeshes.forEach((mesh) => {
    const i = mesh.morphTargetDictionary["Fcl_MTH_A"];
    if (i !== undefined) mesh.morphTargetInfluences[i] = 1;
  });

  console.log("👄 Mouth forced open");
}

window.speak = speak;
window.testMouth = testMouth;

/* =========================
   RENDER LOOP
========================= */
function animate() {
  requestAnimationFrame(animate);
  if (avatarRoot) avatarRoot.rotation.y += 0.0004;
  renderer.render(scene, camera);
}
animate();
