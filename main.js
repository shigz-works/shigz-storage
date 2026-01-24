import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeeee);

const camera = new THREE.PerspectiveCamera(
  30,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.4, 2.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Light
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));

const loader = new GLTFLoader();
loader.load("./avatar.glb", (gltf) => {
  scene.add(gltf.scene);

  gltf.scene.traverse((obj) => {
    if (obj.isMesh && obj.morphTargetDictionary) {
      console.log("Morph targets:", obj.morphTargetDictionary);
    }
  });
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
