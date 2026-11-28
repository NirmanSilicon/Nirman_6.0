import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const originalParse = loader.parse;
loader.parse = function(data, path, onLoad, onError) {
  console.log("Interceptor called");
  originalParse.call(this, data, path, onLoad, onError);
};

console.log(typeof loader.parse);
