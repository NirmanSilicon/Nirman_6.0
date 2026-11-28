import * as THREE from 'three';
const manager = new THREE.LoadingManager();
manager.addHandler( /^blob:/i, new THREE.TextureLoader() );
console.log(manager.getHandler('blob:https://example.com/1234') instanceof THREE.TextureLoader);
