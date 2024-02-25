import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";

const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const dist = 5;
const camera = new THREE.OrthographicCamera(
  -dist * aspect,
  dist * aspect,
  dist,
  -dist,
  1,
  1000
);
camera.position.set(10, 10, 10); // all components equal
camera.lookAt(scene.position); // or the origin

scene.add(camera);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const size = 10;
const divisions = 10;
const gridHelper = new THREE.GridHelper(size, divisions);
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

const pointLight = new THREE.PointLight(0xffffff, 10);
pointLight.position.set(0, 5, 0);
pointLight.decay = 0.05;
scene.add(pointLight);
const ambientLight = new THREE.AmbientLight(0xc0c0c0); // soft white light
scene.add(ambientLight);

let player = {
  color: getRandomColor(),
  position: new THREE.Vector3(0, 0, 0),
  rotation: new THREE.Vector3(0, 0, 0),
  mouseX: 0,
  mouseY: 0,
  projectiles: [],
  health: 100,
};
let players = [];

// Instantiate a loader
let snowmanMesh = new THREE.Object3D();
const gltfLoader = new GLTFLoader();
gltfLoader.load("/assets/models/snowman/source/model.gltf", function (gltf) {
  snowmanMesh = gltf.scene;
  snowmanMesh.scale.set(0.5, 0.5, 0.5);
  animate();
});

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

const keys = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
};
document.addEventListener("keydown", (event) => {
  keys[event.code] = true;
});
document.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

// Font loader
let textMesh = new THREE.Object3D();
const fontLoader = new FontLoader();
fontLoader.load("/assets/fonts/Roboto_Regular.json", function (font) {
  const textGeometry = new TextGeometry(player.color, {
    font: font,
    size: 80,
    height: 5,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 5,
    bevelSize: 3,
    bevelOffset: 0,
    bevelSegments: 5,
  });
  const material = new THREE.MeshBasicMaterial({
    color: player.color,
  });
  textMesh = new THREE.Mesh(textGeometry, material);
  // Center the text
  textGeometry.computeBoundingBox();
  textGeometry.translate(
    -0.5 * (textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x),
    -0.5 * (textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y),
    -0.5 * (textGeometry.boundingBox.max.z - textGeometry.boundingBox.min.z)
  );
  textMesh.position.set(0, 0, 0);
  textMesh.scale.set(0.002, 0.002, 0.002);
  textMesh.rotateY(Math.PI / 4);
  scene.add(textMesh);
});

// Define player movement parameters
let moveSpeed = 0; // Initial move speed
const maxSpeed = 0.1; // Maximum move speed
const acceleration = 0.01; // Acceleration rate
const rotationSpeed = Math.PI / 30;
function updatePlayer() {
  // Update player's position and rotation based on key inputs
  if (keys.KeyW) {
    // Accelerate forward
    moveSpeed = Math.min(moveSpeed + acceleration, maxSpeed);
  } else {
    moveSpeed -= acceleration;
    if (moveSpeed < 0) moveSpeed = 0;
  }
  if (keys.KeyA) {
    // Rotate the player to the left
    player.rotation.y -= rotationSpeed;
  }
  if (keys.KeyD) {
    // Rotate the player to the right
    player.rotation.y += rotationSpeed;
  }

  // Update player's position based on velocity
  player.position.x += Math.sin(player.rotation.y) * moveSpeed;
  player.position.z -= Math.cos(player.rotation.y) * moveSpeed;
}

function updateCamera(target) {
  // Calculate target camera position based on player's position
  const targetPosition = new THREE.Vector3(
    target.position.x + 10,
    target.position.y + 10,
    target.position.z + 10
  );

  // Smoothly interpolate camera position towards the target position
  camera.position.lerp(targetPosition, 0.075);
}

function animate() {
  updatePlayer();
  socket.send(JSON.stringify({ type: "update", data: player }));

  updateCamera(player);

  let toRemove = [];
  for (let p in players) {
    if (players.hasOwnProperty(p)) {
      let material = new THREE.MeshPhongMaterial({
        color: players[p].color,
      });
      let mesh = snowmanMesh.clone();
      mesh.position.set(
        players[p].position.x,
        players[p].position.y,
        players[p].position.z
      );
      mesh.rotation.set(
        players[p].rotation.x,
        -players[p].rotation.y,
        players[p].rotation.z
      );
      scene.add(mesh);
      toRemove.push(mesh);
    }
  }

  textMesh.position.set(
    player.position.x,
    player.position.y + 1.5,
    player.position.z
  );

  renderer.render(scene, camera);

  for (let i = 0; i < toRemove.length; i++) {
    scene.remove(toRemove[i]);
  }
}

function getRandomColor() {
  // Generate a random number between 0 and 16777215
  const randomColor = Math.floor(Math.random() * 16777215);
  // Convert the number to hexadecimal and pad with zeros if necessary
  const hexColor = randomColor.toString(16).padStart(6, "0");
  // Return the hexadecimal color code prefixed with #
  return "#" + hexColor;
}

// Establish WebSocket connection
const socket = new WebSocket("ws://localhost:3000");

socket.onopen = function (event) {
  console.log("WebSocket connection established");

  //   socket.send(JSON.stringify({ type: "connect", data: player }));
};

window.addEventListener("beforeunload", function (event) {
  if (socket.readyState === WebSocket.OPEN) {
    console.log("Disconnecting from the server");
    // Send a disconnect message to the server
    socket.send(JSON.stringify({ type: "disconnect", data: player }));
    // Close the WebSocket connection
    socket.close();
  } else {
    console.log("WebSocket connection is not open");
  }
  //   // Cancel the event to prevent the default browser behavior
  //   // This will prompt the user with a confirmation dialog in some browsers
  //   // The message shown to the user is controlled by the browser and cannot be customized
  //   // To customize the message, you can return a custom string instead
  //   event.preventDefault();
  //   // Chrome requires returnValue to be set
  //   event.returnValue = "";
});

socket.onmessage = function (event) {
  players = JSON.parse(event.data);
  animate();
};
