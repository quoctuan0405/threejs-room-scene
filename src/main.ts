import "./style.css";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  Clock,
  Mesh,
  TextureLoader,
  DoubleSide,
  MeshBasicMaterial,
  BufferAttribute,
  ShaderMaterial,
  AdditiveBlending,
  BufferGeometry,
  Points,
  Color,
} from "three";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import fragmentShader from "./shaders/fragmentShader.glsl";
import vertexShader from "./shaders/vertexShader.glsl";

// Scene & camera
const scene = new Scene();
const camera = new PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.x = 2;
camera.position.z = 4;
camera.position.y = 1.5;

// Renderer
const renderer = new WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputColorSpace = SRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbit control
const controls = new OrbitControls(camera, renderer.domElement);

const container = document.getElementById("app");
if (container) {
  container.appendChild(renderer.domElement);
}

// Debug object
const debugObject = {
  bgColor: "#100a10",
  count: 100000,
  size: 0.3,
  radius: 5,
  branches: 4,
  spin: 3,
  randomness: 1,
  randomnessPower: 3.2,
  insideColor: "#ff6030",
  outsideColor: "#9ba5c0",
};

// Load model
const textureLoader = new TextureLoader();
const bakedTexture = textureLoader.load("./room1-uv-large-srgb(4).jpg");
bakedTexture.colorSpace = SRGBColorSpace;
bakedTexture.flipY = false;

const basicMaterial = new MeshBasicMaterial({
  map: bakedTexture,
  side: DoubleSide,
});

const certificateTexture = textureLoader.load("./certificate.jpg");
certificateTexture.colorSpace = SRGBColorSpace;
certificateTexture.flipY = false;

const certificateMaterial = new MeshBasicMaterial({
  map: certificateTexture,
  side: DoubleSide,
});

const gltfLoader = new GLTFLoader();
gltfLoader.load("./room1-optimize(4).glb", (gltf) => {
  gltf.scene.traverse((children) => {
    if (children instanceof Mesh) {
      if (children.name.indexOf("certificate") !== -1) {
        children.material = certificateMaterial;
      } else {
        children.material = basicMaterial;
      }
    }
  });

  scene.add(gltf.scene);
});

let geometry: BufferGeometry;
let material: ShaderMaterial;
let points: Points;

const generateGalaxy = () => {
  // Destroy old galaxy
  if (points !== null) {
    geometry && geometry.dispose();
    material && material.dispose();
    scene.remove(points);
  }

  // Create new galaxy
  geometry = new BufferGeometry();

  const positions = new Float32Array(debugObject.count * 3 * 3);
  const colors = new Float32Array(debugObject.count * 3 * 3);
  const starScale = new Float32Array(debugObject.count * 1 * 3);
  const randomness = new Float32Array(debugObject.count * 3 * 3);

  const colorInside = new Color(debugObject.insideColor);
  const colorOutside = new Color(debugObject.outsideColor);

  for (let i = 0; i < debugObject.count; i++) {
    const i3 = i * 3;

    // Position
    const radius = Math.random() * debugObject.radius;
    const spinAngle = radius * debugObject.spin;
    const branchAngle =
      ((i % debugObject.branches) / debugObject.branches) * 2 * Math.PI;

    const randomX =
      Math.pow(Math.random(), debugObject.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      debugObject.randomness *
      radius;
    const randomY =
      Math.pow(Math.random(), debugObject.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      debugObject.randomness *
      radius;
    const randomZ =
      Math.pow(Math.random(), debugObject.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      debugObject.randomness *
      radius;

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius;
    positions[i3 + 1] = 0;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius;

    // Randomness
    randomness[i3] = randomX;
    randomness[i3 + 1] = randomY;
    randomness[i3 + 2] = randomZ;

    // Color
    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, (radius * radius) / debugObject.radius);

    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;

    // Star size scale
    starScale[i] = Math.random();
  }

  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setAttribute("aStarScale", new BufferAttribute(colors, 4));
  geometry.setAttribute("aRandomness", new BufferAttribute(randomness, 3));

  material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uSize: { value: 30 * renderer.getPixelRatio() },
      uTime: { value: 0 },
    },
  });

  points = new Points(geometry, material);
  points.position.x = -10;
  points.position.y = 0.5;
  points.scale.set(10, 10, 10);
  scene.add(points);
};

generateGalaxy();

// GUI
const gui = new GUI({ width: 400 });

renderer.setClearColor(debugObject.bgColor);
gui.addColor(debugObject, "bgColor").onChange((bgColor) => {
  renderer.setClearColor(bgColor);
});

gui
  .add(debugObject, "count")
  .min(100)
  .max(1000000)
  .step(100)
  .onFinishChange(generateGalaxy);
gui
  .add(debugObject, "size")
  .min(0.001)
  .max(1)
  .step(0.001)
  .onFinishChange(generateGalaxy);
gui
  .add(debugObject, "radius")
  .min(0.01)
  .max(20)
  .step(0.01)
  .onFinishChange(generateGalaxy);
gui
  .add(debugObject, "branches")
  .min(2)
  .max(10)
  .step(1)
  .onFinishChange(generateGalaxy);
gui
  .add(debugObject, "spin")
  .min(-5)
  .max(5)
  .step(0.001)
  .onFinishChange(generateGalaxy);
gui
  .add(debugObject, "randomness")
  .min(0)
  .max(2)
  .step(0.001)
  .onFinishChange(generateGalaxy);
gui
  .add(debugObject, "randomnessPower")
  .min(1)
  .max(10)
  .step(0.001)
  .onFinishChange(generateGalaxy);
gui.addColor(debugObject, "insideColor").onFinishChange(generateGalaxy);
gui.addColor(debugObject, "outsideColor").onFinishChange(generateGalaxy);

gui.close();

// On resize
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
};

window.addEventListener("resize", onWindowResize, false);

// Animate
const clock = new Clock();

const animate = () => {
  // Elapse time
  const elapsedTime = clock.getElapsedTime();

  material.uniforms.uTime.value = elapsedTime;

  // Render and control update
  requestAnimationFrame(animate);
  renderer.render(scene, camera);

  controls.update();
};

animate();
