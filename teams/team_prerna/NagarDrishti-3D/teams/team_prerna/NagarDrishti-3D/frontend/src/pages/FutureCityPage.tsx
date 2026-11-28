import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AlertCircle, Calculator, Expand, Home, Minus, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { FutureScenario, ImpactReport, ScenarioModelItem, ScenarioModelType } from '../types/domain';

const MODEL_CATALOG: Array<{
  type: ScenarioModelType;
  label: string;
  color: string;
  w: number;
  l: number;
  h: number;
}> = [
  { type: 'road_widening', label: 'Road Widening Strip', color: '#344C59', w: 6, l: 40, h: 0.4 },
  { type: 'new_road', label: 'New Link Road', color: '#252A25', w: 10, l: 50, h: 0.4 },
  { type: 'park', label: 'Urban Park & Trees', color: '#299764', w: 24, l: 24, h: 1.5 },
  { type: 'residential_building', label: 'Residential Block', color: '#C5A46D', w: 14, l: 18, h: 12 },
  { type: 'commercial_building', label: 'Commercial Complex', color: '#527C91', w: 18, l: 22, h: 18 },
  { type: 'hospital', label: 'Hospital Facility', color: '#FFFFFF', w: 22, l: 26, h: 15 },
  { type: 'school', label: 'Public School', color: '#E0C088', w: 20, l: 24, h: 9 },
  { type: 'drainage', label: 'Stormwater Culvert', color: '#45758C', w: 3, l: 45, h: 1.2 },
  { type: 'public_transport', label: 'Transit Bus Hub', color: '#285B45', w: 12, l: 16, h: 5 },
];

interface CityView {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
}

interface LocalScenario {
  id: string;
  title: string;
  ward: string;
  center_lat: number;
  center_lng: number;
  existing_road_area_sqm: number;
  existing_green_area_sqm: number;
  models: ScenarioModelItem[];
  savedAt: string;
}

const LOCAL_SCENARIOS_KEY = 'nagardrishti.future-city.simulations';

function box(
  parent: THREE.Group,
  width: number,
  height: number,
  length: number,
  color: string,
  x: number,
  y: number,
  z: number,
  castShadow = true
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, length),
    new THREE.MeshStandardMaterial({ color, roughness: 0.82 })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addTree(parent: THREE.Group, x: number, z: number, scale = 1) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: '#79583A', roughness: 1 })
  );
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  tree.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 10, 8),
    new THREE.MeshStandardMaterial({ color: '#39724B', roughness: 0.95 })
  );
  crown.position.y = 2.55;
  crown.scale.set(1, 1.15, 1);
  crown.castShadow = true;
  tree.add(crown);
  parent.add(tree);
}

function addCityBuilding(
  parent: THREE.Group,
  x: number,
  z: number,
  width: number,
  length: number,
  height: number,
  color: string,
  kind: 'residential' | 'commercial' | 'hospital' | 'school' = 'residential'
) {
  const building = new THREE.Group();
  building.position.set(x, 0, z);
  box(building, width + 1.5, 0.6, length + 1.5, '#C7C0B1', 0, 0.3, 0);
  box(building, width, height, length, color, 0, 0.6 + height / 2, 0);
  box(building, width + 0.35, 0.5, length + 0.35, '#D7D1C4', 0, height + 0.85, 0);

  const floors = Math.max(2, Math.floor(height / 3.2));
  const panesPerSide = Math.max(2, Math.floor(width / 2.6));
  for (let floor = 0; floor < floors; floor += 1) {
    const y = 1.7 + floor * (height / floors);
    for (let pane = 0; pane < panesPerSide; pane += 1) {
      const paneX = -width / 2 + ((pane + 1) * width) / (panesPerSide + 1);
      box(building, 0.85, 1.1, 0.12, '#9EC2C5', paneX, y, length / 2 + 0.07, false);
      box(building, 0.85, 1.1, 0.12, '#9EC2C5', paneX, y, -length / 2 - 0.07, false);
    }
  }

  if (kind === 'hospital') {
    box(building, 0.8, 4.2, 0.45, '#FFFFFF', 0, height + 3, length / 2 + 0.28, false);
    box(building, 2.8, 0.8, 0.45, '#FFFFFF', 0, height + 3, length / 2 + 0.28, false);
  }
  if (kind === 'school') {
    box(building, width + 4, 0.3, length + 4, '#D9B76D', 0, 0.75, 0);
  }
  parent.add(building);
}

function createCityEnvironment(scene: THREE.Scene) {
  scene.background = new THREE.Color('#DCE7E3');
  scene.fog = new THREE.Fog('#DCE7E3', 145, 270);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: '#C8D0BA', roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roads = new THREE.Group();
  const asphalt = new THREE.MeshStandardMaterial({ color: '#485254', roughness: 0.95 });
  const road = (width: number, length: number, x: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, length), asphalt);
    mesh.position.set(x, 0.09, z);
    mesh.receiveShadow = true;
    roads.add(mesh);
  };
  road(12, 120, 0, 0);
  road(120, 11, 0, 0);
  road(7, 120, -30, 0);
  road(7, 120, 30, 0);
  road(120, 7, 0, -30);
  road(120, 7, 0, 30);

  const marking = new THREE.MeshStandardMaterial({ color: '#E8D18C', roughness: 1 });
  for (let z = -54; z <= 54; z += 8) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 3.2), marking);
    dash.position.set(0, 0.2, z);
    roads.add(dash);
  }
  for (let x = -54; x <= 54; x += 8) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.025, 0.22), marking);
    dash.position.set(x, 0.2, 0);
    roads.add(dash);
  }
  scene.add(roads);

  const sidewalks = new THREE.Group();
  const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: '#D5D0C2', roughness: 1 });
  for (const x of [-7.3, 7.3, -34.2, -25.8, 25.8, 34.2]) {
    const path = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.28, 120), sidewalkMaterial);
    path.position.set(x, 0.14, 0);
    path.receiveShadow = true;
    sidewalks.add(path);
  }
  for (const z of [-6.8, 6.8, -34.2, -25.8, 25.8, 34.2]) {
    const path = new THREE.Mesh(new THREE.BoxGeometry(120, 0.28, 1.4), sidewalkMaterial);
    path.position.set(0, 0.14, z);
    path.receiveShadow = true;
    sidewalks.add(path);
  }
  scene.add(sidewalks);

  const city = new THREE.Group();
  const lots: Array<[number, number, number, number, number, string]> = [
    [-43, -44, 13, 11, 15, '#D5BFA2'], [-20, -44, 14, 12, 10, '#C7B79E'],
    [20, -44, 13, 12, 22, '#9CB4B4'], [43, -44, 15, 12, 13, '#D0C1AB'],
    [-43, -19, 13, 12, 12, '#C9B89F'], [43, -19, 15, 13, 31, '#91AAAB'],
    [-43, 19, 14, 13, 19, '#D3C3AA'], [43, 19, 15, 12, 14, '#C7B79E'],
    [-43, 44, 15, 12, 24, '#AAB8B2'], [-20, 44, 12, 12, 9, '#D1BEA4'],
    [20, 44, 14, 12, 12, '#D8C6A7'], [43, 44, 13, 12, 18, '#B1B8AA'],
    [-20, -19, 12, 11, 8, '#D6C6AC'], [20, -19, 12, 11, 11, '#C7B79E'],
    [-20, 19, 12, 11, 13, '#C8B99F'], [20, 19, 12, 11, 10, '#D2C1A7'],
  ];
  lots.forEach(([x, z, width, length, height, color], index) => {
    const kind = index === 5 ? 'hospital' : index === 6 ? 'school' : index % 4 === 2 ? 'commercial' : 'residential';
    addCityBuilding(city, x, z, width, length, height, color, kind);
  });

  const park = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.25, 16),
    new THREE.MeshStandardMaterial({ color: '#8EAD78', roughness: 1 })
  );
  park.position.set(-20, 0.14, -19);
  park.receiveShadow = true;
  city.add(park);
  for (const [x, z] of [[-27, -24], [-22, -24], [-17, -24], [-27, -15], [-17, -15], [-22, -19]] as const) {
    addTree(city, x, z, 0.9);
  }
  for (const [x, z] of [[-12, -54], [12, -54], [-12, 54], [12, 54], [-54, -12], [-54, 12], [54, -12], [54, 12]] as const) {
    addTree(city, x, z, 0.8);
  }
  scene.add(city);

  const streetlights = new THREE.Group();
  const poleMaterial = new THREE.MeshStandardMaterial({ color: '#46514A', metalness: 0.3, roughness: 0.5 });
  for (const z of [-48, -32, -16, 16, 32, 48]) {
    for (const x of [-8.7, 8.7]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5, 8), poleMaterial);
      pole.position.set(x, 2.5, z);
      pole.castShadow = true;
      streetlights.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), poleMaterial);
      arm.position.set(x + (x < 0 ? 0.5 : -0.5), 4.85, z);
      streetlights.add(arm);
      const lamp = new THREE.MeshStandardMaterial({ color: '#F3D28C', emissive: '#6A542E', emissiveIntensity: 0.35 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lamp);
      bulb.position.set(x + (x < 0 ? 1 : -1), 4.75, z);
      streetlights.add(bulb);
    }
  }
  scene.add(streetlights);

  scene.add(new THREE.HemisphereLight('#F5F5EA', '#788B73', 1.35));
  const sun = new THREE.DirectionalLight('#FFF3D9', 2.2);
  sun.position.set(-35, 75, 38);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  scene.add(sun);
}

function createProposedModel(model: ScenarioModelItem, selected: boolean) {
  const catalog = MODEL_CATALOG.find((item) => item.type === model.model_type);
  const width = Math.max(0.2, model.width_m * model.scale_x);
  const height = Math.max(0.2, model.height_m * model.scale_y);
  const length = Math.max(0.2, model.length_m * model.scale_z);
  const group = new THREE.Group();
  group.userData.localId = model.localId;
  group.position.set(model.position_x, model.position_y, model.position_z);
  group.rotation.y = model.rotation_y;

  if (model.model_type === 'park') {
    const lawn = new THREE.Mesh(
      new THREE.BoxGeometry(width, Math.max(height, 0.25), length),
      new THREE.MeshStandardMaterial({ color: '#6E9A60', roughness: 1 })
    );
    lawn.position.y = Math.max(height, 0.25) / 2;
    lawn.receiveShadow = true;
    group.add(lawn);
    const treeCount = Math.max(3, Math.floor(width / 4));
    for (let i = 0; i < treeCount; i += 1) {
      addTree(group, -width * 0.38 + (i % 4) * width * 0.24, -length * 0.32 + Math.floor(i / 4) * length * 0.42, 0.6);
    }
  } else if (model.model_type === 'road_widening' || model.model_type === 'new_road') {
    box(group, width, Math.max(height, 0.3), length, catalog?.color ?? '#485254', 0, Math.max(height, 0.3) / 2, 0, false);
    const dashCount = Math.max(2, Math.floor(length / 6));
    for (let i = 0; i < dashCount; i += 1) {
      box(group, 0.16, 0.035, 2.2, '#E8D18C', 0, Math.max(height, 0.3) + 0.02, -length / 2 + 3 + i * 6, false);
    }
  } else if (model.model_type === 'drainage') {
    box(group, width, height, length, '#527C91', 0, height / 2, 0);
    box(group, width * 0.55, height * 0.5, length * 0.92, '#263F48', 0, height * 0.52, 0, false);
  } else {
    const wall = catalog?.color ?? '#C9B89F';
    box(group, width, height, length, wall, 0, height / 2, 0);
    box(group, width + 0.5, Math.max(0.35, height * 0.035), length + 0.5, '#D9D3C5', 0, height + 0.1, 0);
    const columns = Math.max(2, Math.floor(width / 3));
    const rows = Math.max(1, Math.floor(height / 4));
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        box(group, Math.min(1.15, width / columns / 2), 1.2, 0.12, '#9EC2C5',
          -width / 2 + ((col + 1) * width) / (columns + 1),
          2 + row * (height / rows),
          length / 2 + 0.08,
          false);
      }
    }
    if (model.model_type === 'hospital') {
      box(group, 0.9, Math.min(4, height * 0.35), 0.22, '#FFFFFF', 0, height + 1.2, length / 2 + 0.18, false);
      box(group, 2.6, 0.9, 0.22, '#FFFFFF', 0, height + 1.2, length / 2 + 0.18, false);
    }
    if (model.model_type === 'school') {
      box(group, width + 2, 0.25, length + 2, '#D9B76D', 0, 0.12, 0);
    }
    if (model.model_type === 'public_transport') {
      box(group, width * 0.46, 1.8, length * 0.42, '#E9B84F', 0, 1, 0, true);
      box(group, width * 0.18, 1, length * 0.08, '#A5C8CE', 0, 1.1, length * 0.22, false);
    }
  }

  if (selected) {
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.8, height + 0.8, length + 0.8)),
      new THREE.LineBasicMaterial({ color: '#B54832', depthTest: false })
    );
    outline.position.y = height / 2;
    outline.renderOrder = 2;
    group.add(outline);
  }
  return group;
}

function disposeGroup(group: THREE.Group) {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function isLocalScenario(value: unknown): value is LocalScenario {
  if (!value || typeof value !== 'object') return false;
  const scenario = value as Record<string, unknown>;
  return typeof scenario.id === 'string'
    && typeof scenario.title === 'string'
    && typeof scenario.ward === 'string'
    && typeof scenario.center_lat === 'number'
    && typeof scenario.center_lng === 'number'
    && typeof scenario.existing_road_area_sqm === 'number'
    && typeof scenario.existing_green_area_sqm === 'number'
    && typeof scenario.savedAt === 'string'
    && Array.isArray(scenario.models);
}

export function FutureCityPage() {
  const { profile } = useAuth();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const existingMountRef = useRef<HTMLDivElement | null>(null);
  const proposedViewRef = useRef<CityView | null>(null);
  const existingViewRef = useRef<CityView | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const cameraSyncingRef = useRef(false);

  const [title, setTitle] = useState('Janpath Ward-30 Sustainable Transit Concept');
  const [ward, setWard] = useState('Ward 30');
  const [centerLat, setCenterLat] = useState(20.2896);
  const [centerLng, setCenterLng] = useState(85.8435);
  const [existingRoadArea, setExistingRoadArea] = useState(6400);
  const [existingGreenArea, setExistingGreenArea] = useState(1800);
  const [viewMode, setViewMode] = useState<'proposed' | 'compare'>('compare');
  const [models, setModels] = useState<ScenarioModelItem[]>([
    {
      localId: 'init-1',
      model_type: 'park',
      label: 'Pocket Park',
      position_x: -18,
      position_y: 0,
      position_z: -8,
      rotation_y: 0,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      width_m: 20,
      length_m: 20,
      height_m: 1.5,
    },
    {
      localId: 'init-2',
      model_type: 'road_widening',
      label: 'Cycle & Bus Lane',
      position_x: 8,
      position_y: 0,
      position_z: 0,
      rotation_y: 0,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      width_m: 6,
      length_m: 44,
      height_m: 0.4,
    },
  ]);
  const [selectedLocalId, setSelectedLocalId] = useState<string>('init-1');
  const [savedScenarios, setSavedScenarios] = useState<FutureScenario[]>([]);
  const [localScenarios, setLocalScenarios] = useState<LocalScenario[]>([]);
  const [impact, setImpact] = useState<ImpactReport | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = models.find((m) => m.localId === selectedLocalId) || null;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_SCENARIOS_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every(isLocalScenario)) {
          throw new Error('Stored simulations have an invalid format.');
        }
        setLocalScenarios(parsed);
      }
    } catch (loadError) {
      console.error('Unable to load local future-city simulations.', loadError);
      setError('Saved local simulations could not be read from this browser.');
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    apiFetch<{ scenarios: FutureScenario[] }>('/scenarios')
      .then((res) => setSavedScenarios(res.scenarios))
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load saved simulations.');
      });
  }, [profile]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const scene = new THREE.Scene();
    createCityEnvironment(scene);
    const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.5, 500);
    camera.position.set(72, 58, 76);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.replaceChildren(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 18;
    controls.maxDistance = 210;
    controls.maxPolarAngle = Math.PI * 0.49;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    proposedViewRef.current = { camera, controls, renderer };

    controls.addEventListener('change', () => {
      const peer = existingViewRef.current;
      if (!peer || cameraSyncingRef.current) return;
      cameraSyncingRef.current = true;
      peer.controls.target.copy(controls.target);
      peer.camera.position.copy(camera.position);
      peer.camera.lookAt(peer.controls.target);
      cameraSyncingRef.current = false;
    });

    const proposedGroup = new THREE.Group();
    modelGroupRef.current = proposedGroup;
    scene.add(proposedGroup);
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    const observer = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      container.replaceChildren();
      proposedViewRef.current = null;
      modelGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = existingMountRef.current;
    if (!container || viewMode !== 'compare') return;

    const scene = new THREE.Scene();
    createCityEnvironment(scene);
    const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.5, 500);
    camera.position.set(72, 58, 76);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.replaceChildren(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.5, 0);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.minDistance = 18;
    controls.maxDistance = 210;
    existingViewRef.current = { camera, controls, renderer };
    controls.addEventListener('change', () => {
      const peer = proposedViewRef.current;
      if (!peer || cameraSyncingRef.current) return;
      cameraSyncingRef.current = true;
      peer.controls.target.copy(controls.target);
      peer.camera.position.copy(camera.position);
      peer.camera.lookAt(peer.controls.target);
      cameraSyncingRef.current = false;
    });

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    const observer = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      container.replaceChildren();
      existingViewRef.current = null;
    };
  }, [viewMode]);

  useEffect(() => {
    const group = modelGroupRef.current;
    if (!group) return;
    for (const child of [...group.children]) {
      group.remove(child);
      if (child instanceof THREE.Group) disposeGroup(child);
    }
    models.forEach((model) => group.add(createProposedModel(model, model.localId === selectedLocalId)));
  }, [models, selectedLocalId]);

  useEffect(() => {
    const canvas = proposedViewRef.current?.renderer.domElement;
    const group = modelGroupRef.current;
    if (!canvas || !group) return;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let dragging: { object: THREE.Group; id: string; offset: THREE.Vector3 } | null = null;

    const setPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, proposedViewRef.current!.camera);
    };
    const findModel = (object: THREE.Object3D | null): THREE.Group | null => {
      let current = object;
      while (current && current !== group) {
        if (typeof current.userData.localId === 'string') return current as THREE.Group;
        current = current.parent;
      }
      return null;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      setPointer(event);
      const hit = raycaster.intersectObjects(group.children, true).find((item) => findModel(item.object));
      if (!hit) return;
      const object = findModel(hit.object);
      if (!object) return;
      const point = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(ground, point)) return;
      dragging = { object, id: object.userData.localId as string, offset: object.position.clone().sub(point) };
      proposedViewRef.current!.controls.enabled = false;
      canvas.style.cursor = 'grabbing';
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent) => {
      setPointer(event);
      if (dragging) {
        const point = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(ground, point)) {
          dragging.object.position.x = point.x + dragging.offset.x;
          dragging.object.position.z = point.z + dragging.offset.z;
        }
        return;
      }
      canvas.style.cursor = 'grab';
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      const { id, object } = dragging;
      dragging = null;
      proposedViewRef.current!.controls.enabled = true;
      canvas.style.cursor = 'grab';
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      setSelectedLocalId(id);
      setModels((previous) => previous.map((model) => model.localId === id
        ? { ...model, position_x: object.position.x, position_z: object.position.z }
        : model));
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  const addModel = (type: ScenarioModelType) => {
    const template = MODEL_CATALOG.find((c) => c.type === type)!;
    const localId = `m-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    const next: ScenarioModelItem = {
      localId,
      model_type: type,
      label: template.label,
      position_x: Math.round((Math.random() - 0.5) * 30),
      position_y: 0,
      position_z: Math.round((Math.random() - 0.5) * 30),
      rotation_y: 0,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      width_m: template.w,
      length_m: template.l,
      height_m: template.h,
    };
    setModels((prev) => [...prev, next]);
    setSelectedLocalId(localId);
  };

  const updateSelected = (patch: Partial<ScenarioModelItem>) => {
    setModels((prev) => prev.map((m) => (m.localId === selectedLocalId ? { ...m, ...patch } : m)));
  };

  const removeSelected = () => {
    setModels((prev) => prev.filter((m) => m.localId !== selectedLocalId));
    setSelectedLocalId('');
  };

  const runImpactCalculation = async () => {
    setError(null);
    try {
      const res = await apiFetch<{ impact: ImpactReport }>('/scenarios/impact', {
        method: 'POST',
        body: JSON.stringify({
          center_lat: centerLat,
          center_lng: centerLng,
          existing_road_area_sqm: existingRoadArea,
          existing_green_area_sqm: existingGreenArea,
          models: models.map(({ localId: _id, id: _dbId, ...rest }) => rest),
        }),
      });
      setImpact(res.impact);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impact calculation failed');
    }
  };

  const saveScenario = async () => {
    setError(null);
    setFeedback(null);
    if (!profile) {
      const localScenario: LocalScenario = {
        id: `local-${Date.now()}`,
        title,
        ward,
        center_lat: centerLat,
        center_lng: centerLng,
        existing_road_area_sqm: existingRoadArea,
        existing_green_area_sqm: existingGreenArea,
        models: models.map((model) => ({ ...model })),
        savedAt: new Date().toISOString(),
      };
      const next = [localScenario, ...localScenarios];
      try {
        localStorage.setItem(LOCAL_SCENARIOS_KEY, JSON.stringify(next));
        setLocalScenarios(next);
        setFeedback(`"${title}" saved in this browser as a simulation (not an approved project).`);
      } catch (saveError) {
        console.error('Unable to save local future-city simulation.', saveError);
        setError('Could not save this simulation in browser storage.');
      }
      return;
    }
    try {
      const res = await apiFetch<{ scenario: FutureScenario }>('/scenarios', {
        method: 'POST',
        body: JSON.stringify({
          title,
          ward,
          center_lat: centerLat,
          center_lng: centerLng,
          existing_road_area_sqm: existingRoadArea,
          existing_green_area_sqm: existingGreenArea,
          is_public: false,
          models: models.map(({ localId: _id, id: _dbId, ...rest }) => rest),
        }),
      });
      setFeedback(`Scenario "${res.scenario.title}" saved as simulation.`);
      setSavedScenarios((prev) => [res.scenario, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scenario (requires Supabase DB + login)');
    }
  };

  const loadLocalScenario = (scenario: LocalScenario) => {
    setTitle(scenario.title);
    setWard(scenario.ward);
    setCenterLat(scenario.center_lat);
    setCenterLng(scenario.center_lng);
    setExistingRoadArea(scenario.existing_road_area_sqm);
    setExistingGreenArea(scenario.existing_green_area_sqm);
    setModels(scenario.models.map((model, index) => ({
      ...model,
      localId: `local-${scenario.id}-${index}`,
    })));
    setSelectedLocalId('');
    setFeedback(`Loaded "${scenario.title}" simulation saved ${new Date(scenario.savedAt).toLocaleString()}.`);
  };

  const adjustCamera = (action: 'zoom-in' | 'zoom-out' | 'reset' | 'fullscreen') => {
    const view = proposedViewRef.current;
    if (!view) return;
    if (action === 'reset') {
      view.camera.position.set(72, 58, 76);
      view.controls.target.set(0, 1.5, 0);
      view.controls.update();
      return;
    }
    if (action === 'fullscreen') {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void mountRef.current?.parentElement?.requestFullscreen();
      }
      return;
    }
    const direction = view.camera.position.clone().sub(view.controls.target).normalize();
    const distance = action === 'zoom-in' ? -8 : 8;
    view.camera.position.addScaledVector(direction, distance);
    view.controls.update();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-charcoal/10 p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-forest-green">
            Future City 3D Visualization &amp; Impact Analysis
          </h1>
          <p className="text-sm text-dark-blue-grey">
            Place, move, rotate, and resize proposed civic assets in Three.js and compare existing vs. proposed land &amp; cost impacts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'compare' ? 'proposed' : 'compare')}
            className="px-3 py-2 rounded-lg border border-charcoal/20 text-xs font-medium bg-white"
          >
            {viewMode === 'compare' ? 'Single Proposed View' : 'Side-by-Side Comparison'}
          </button>
          <button
            type="button"
            onClick={runImpactCalculation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-muted-blue text-white text-xs font-medium"
          >
            <Calculator className="w-3.5 h-3.5" />
            Calculate Impact
          </button>
          <button
            type="button"
            onClick={saveScenario}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-champagne text-charcoal text-xs font-semibold"
          >
            <Save className="w-3.5 h-3.5" />
            Save Simulation
          </button>
        </div>
      </div>

      {/* Simulation Notice */}
      <div className="bg-warm-ivory border border-champagne rounded-xl p-3 text-xs text-charcoal flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-terracotta shrink-0" />
        <span>
          <strong>SIMULATION ONLY — NOT AN APPROVED GOVERNMENT PROJECT:</strong> 3D concepts and cost estimates are planning visualizations for civic discussion.
        </span>
      </div>

      {error && <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta p-3 rounded-lg text-sm">{error}</div>}
      {feedback && <div className="bg-success-green/10 border border-success-green/30 text-success-green p-3 rounded-lg text-sm">{feedback}</div>}

      {/* Scenario Metadata & Model Palette */}
      <div className="bg-white rounded-xl border border-charcoal/10 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <label className="lg:col-span-2">
            Scenario Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border border-charcoal/20 px-2.5 py-1.5 text-sm" />
          </label>
          <label>
            Ward
            <input value={ward} onChange={(e) => setWard(e.target.value)} className="mt-1 w-full rounded border border-charcoal/20 px-2.5 py-1.5 text-sm" />
          </label>
          <label>
            Existing Road Area (sq.m)
            <input type="number" value={existingRoadArea} onChange={(e) => setExistingRoadArea(Number(e.target.value))} className="mt-1 w-full rounded border border-charcoal/20 px-2.5 py-1.5 text-sm" />
          </label>
          <label>
            Existing Green Area (sq.m)
            <input type="number" value={existingGreenArea} onChange={(e) => setExistingGreenArea(Number(e.target.value))} className="mt-1 w-full rounded border border-charcoal/20 px-2.5 py-1.5 text-sm" />
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {MODEL_CATALOG.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => addModel(item.type)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-warm-ivory border border-charcoal/15 text-xs font-medium hover:border-forest-green"
            >
              <Plus className="w-3 h-3 text-forest-green" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Viewport(s) + Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className={`xl:col-span-3 grid gap-4 ${viewMode === 'compare' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {viewMode === 'compare' && (
            <div className="bg-white rounded-xl border border-charcoal/10 p-3 space-y-2">
              <div className="text-xs font-semibold text-dark-blue-grey uppercase">Existing Baseline Corridor</div>
              <div ref={existingMountRef} className="w-full h-[380px] rounded-lg overflow-hidden" />
            </div>
          )}
          <div className="bg-white rounded-xl border border-charcoal/10 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-forest-green uppercase">Proposed Simulation — drag empty space to orbit; drag an asset to move</div>
              <div className="flex shrink-0 gap-1">
                <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => adjustCamera('zoom-in')} className="rounded border border-charcoal/15 p-1.5 text-forest-green hover:bg-warm-ivory"><Plus className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => adjustCamera('zoom-out')} className="rounded border border-charcoal/15 p-1.5 text-forest-green hover:bg-warm-ivory"><Minus className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Reset camera" title="Reset camera" onClick={() => adjustCamera('reset')} className="rounded border border-charcoal/15 p-1.5 text-forest-green hover:bg-warm-ivory"><Home className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Toggle fullscreen" title="Toggle fullscreen" onClick={() => adjustCamera('fullscreen')} className="rounded border border-charcoal/15 p-1.5 text-forest-green hover:bg-warm-ivory"><Expand className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div ref={mountRef} className="w-full h-[380px] rounded-lg overflow-hidden" />
          </div>
        </div>

        {/* Transform Inspector */}
        <div className="bg-white rounded-xl border border-charcoal/10 p-4 space-y-3">
          <div className="text-xs font-semibold uppercase text-dark-blue-grey">Placed Objects ({models.length})</div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {models.map((m) => (
              <button
                key={m.localId}
                type="button"
                onClick={() => setSelectedLocalId(m.localId)}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs ${
                  m.localId === selectedLocalId ? 'bg-secondary-green text-white' : 'bg-warm-ivory text-charcoal'
                }`}
              >
                {m.label} ({m.model_type.replace('_', ' ')})
              </button>
            ))}
          </div>

          {selectedModel && (
            <div className="border-t border-charcoal/10 pt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-forest-green">Edit Transform</span>
                <button type="button" onClick={removeSelected} className="text-terracotta inline-flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
              <label className="block">
                Label
                <input value={selectedModel.label} onChange={(e) => updateSelected({ label: e.target.value })} className="mt-0.5 w-full rounded border border-charcoal/20 px-2 py-1" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  Pos X (m)
                  <input type="number" value={selectedModel.position_x} onChange={(e) => updateSelected({ position_x: Number(e.target.value) })} className="mt-0.5 w-full rounded border border-charcoal/20 px-2 py-1" />
                </label>
                <label>
                  Pos Z (m)
                  <input type="number" value={selectedModel.position_z} onChange={(e) => updateSelected({ position_z: Number(e.target.value) })} className="mt-0.5 w-full rounded border border-charcoal/20 px-2 py-1" />
                </label>
                <label>
                  Pos Y (m)
                  <input type="number" value={selectedModel.position_y} onChange={(e) => updateSelected({ position_y: Number(e.target.value) })} className="mt-0.5 w-full rounded border border-charcoal/20 px-2 py-1" />
                </label>
                <label>
                  Rotate Y (rad)
                  <input type="number" step="0.1" value={selectedModel.rotation_y} onChange={(e) => updateSelected({ rotation_y: Number(e.target.value) })} className="mt-0.5 w-full rounded border border-charcoal/20 px-2 py-1" />
                </label>
                <label>
                  Scale Width
                  <input type="number" step="0.1" min="0.2" value={selectedModel.scale_x} onChange={(e) => updateSelected({ scale_x: Number(e.target.value) })} className="mt-0.5 w-full rounded border border-charcoal/20 px-2 py-1" />
                </label>
                <label>
                  Scale Height
                  <input type="number" step="0.1" min="0.2" value={selectedModel.scale_y} onChange={(e) => updateSelected({ scale_y: Number(e.target.value) })} className="mt-0.5 w-full rounded border border-charcoal/20 px-2 py-1" />
                </label>
                <label>
                  Scale Length
                  <input type="number" step="0.1" min="0.2" value={selectedModel.scale_z} onChange={(e) => updateSelected({ scale_z: Number(e.target.value) })} className="mt-0.5 w-full rounded border border-charcoal/20 px-2 py-1" />
                </label>
              </div>
            </div>
          )}

          {savedScenarios.length > 0 && (
            <div className="border-t border-charcoal/10 pt-3 space-y-1">
              <div className="text-xs font-semibold uppercase text-dark-blue-grey">Saved Simulations — Not Approved Projects</div>
              {savedScenarios.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    setTitle(sc.title);
                    setWard(sc.ward);
                    setCenterLat(sc.center_lat);
                    setCenterLng(sc.center_lng);
                    setExistingRoadArea(sc.existing_road_area_sqm);
                    setExistingGreenArea(sc.existing_green_area_sqm);
                    setModels(
                      sc.scenario_models.map((m, idx) => ({
                        ...m,
                        localId: m.id || `loaded-${idx}`,
                      }))
                    );
                  }}
                  className="w-full text-left text-xs px-2 py-1 rounded bg-warm-ivory hover:bg-champagne/25"
                >
                  {sc.title}
                </button>
              ))}
            </div>
          )}
          {localScenarios.length > 0 && (
            <div className="border-t border-charcoal/10 pt-3 space-y-1">
              <div className="text-xs font-semibold uppercase text-dark-blue-grey">This Browser — Simulations Only</div>
              {localScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => loadLocalScenario(scenario)}
                  className="w-full text-left text-xs px-2 py-1 rounded bg-warm-ivory hover:bg-champagne/25"
                >
                  {scenario.title} · {scenario.ward}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Impact Analysis Report */}
      {impact && (
        <div className="bg-white rounded-xl border border-charcoal/10 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-forest-green">Impact Analysis Results</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-champagne/25">{impact.disclaimer}</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="bg-warm-ivory p-3.5 rounded-lg">
              <div className="text-xs text-dark-blue-grey">Road Area (Existing → Proposed)</div>
              <div className="font-semibold text-forest-green mt-1">
                {impact.existing_road_area_sqm} → {impact.total_proposed_road_area_sqm} sq.m
              </div>
            </div>
            <div className="bg-warm-ivory p-3.5 rounded-lg">
              <div className="text-xs text-dark-blue-grey">Green Space Gain</div>
              <div className="font-semibold text-success-green mt-1">
                +{impact.proposed_green_space_change_sqm} sq.m (Total: {impact.total_proposed_green_area_sqm})
              </div>
            </div>
            <div className="bg-warm-ivory p-3.5 rounded-lg">
              <div className="text-xs text-dark-blue-grey">Additional Land Footprint</div>
              <div className="font-semibold mt-1">{impact.additional_land_requirement_sqm} sq.m</div>
            </div>
            <div className="bg-warm-ivory p-3.5 rounded-lg">
              <div className="text-xs text-dark-blue-grey">Estimated Cost (Unit Rates)</div>
              <div className="font-semibold text-forest-green mt-1">
                ₹{impact.estimated_cost_inr.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="border border-charcoal/10 rounded-lg p-3 space-y-1.5">
              <div className="font-semibold text-forest-green">Nearest Public Facilities (PostGIS / OSM Ref)</div>
              {impact.nearest_facilities.map((f) => (
                <div key={`${f.facility_type}-${f.facility_name}`} className="flex justify-between py-1 border-b border-charcoal/5 last:border-0">
                  <span className="capitalize">{f.facility_type.replace('_', ' ')}: {f.facility_name}</span>
                  <span className="font-mono font-medium">{f.distance_m} m</span>
                </div>
              ))}
            </div>

            <div className="border border-charcoal/10 rounded-lg p-3 space-y-1.5">
              <div className="font-semibold text-terracotta">Unavailable Information &amp; Scope Limits</div>
              <ul className="list-disc pl-4 space-y-1 text-dark-blue-grey">
                {impact.unavailable_data_notices.map((n, idx) => (
                  <li key={idx}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
