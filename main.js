import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

/* --------------------
   SCENE
-------------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f2f2);

/* --------------------
   CAMERA
-------------------- */
const camera = new THREE.PerspectiveCamera(
  30,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.45, 2.6);

/* --------------------
   RENDERER (CRITICAL FIX)
-------------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// ✅ REQUIRED for VRoid / GLB
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

document.body.appendChild(renderer.domElement);

/* --------------------
   LIGHTING (FIXES BLACK AVATAR)
-------------------- */
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.6);
hemiLight.position.set(0, 1, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
dirLight.position.set(2, 4, 3);
scene.add(dirLight);

/* --------------------
   AVATAR LOADING
-------------------- */
let avatarRoot = null;
let faceMesh = null;

const loader = new GLTFLoader();
loader.load(
  "./avatar.glb",
  (gltf) => {
    avatarRoot = gltf.scene;
    scene.add(avatarRoot);

    avatarRoot.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;

        // ✅ FIX VRoid MATERIALS
        if (obj.material) {
          obj.material.needsUpdate = true;
          obj.material.side = THREE.FrontSide;

          if (obj.material.map) {
            obj.material.map.colorSpace = THREE.SRGBColorSpace;
          }
        }

        // Capture face mesh for morph targets
        if (obj.morphTargetDictionary && !faceMesh) {
          faceMesh = obj;
          console.log("✅ Morph targets found:", obj.morphTargetDictionary);
        }
      }
    });
  },
  undefined,
  (error) => {
    console.error("❌ Avatar load error:", error);
  }
);

/* --------------------
   RESPONSIVE RESIZE
-------------------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* --------------------
   RENDER LOOP
-------------------- */
function animate() {
  requestAnimationFrame(animate);

  // Slight idle movement (optional)
  if (avatarRoot) {
    avatarRoot.rotation.y += 0.0005;
  }

  renderer.render(scene, camera);
}
animate();
