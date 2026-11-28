/* eslint-disable */
// @ts-nocheck -- copied 3D car component; skips the strict checks for this file only
/**
 * Car Drop Menu. Designed & built by Aakash Mehra.
 *
 * A menu of cars beside a small three.js stage, drawn like a flat isometric
 * illustration (orthographic camera, three-tone toon paint, painted-on
 * details). Picking a car lets the current one fall through the floor and
 * drops the next one in from the top. It lands on four independently sprung
 * wheels (body heave, pitch and roll, spring + damper + bump stop per corner,
 * springy tyres), so every landing bounces a little differently.
 */

import * as React from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useReducedMotion } from "motion/react";


/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/** Body style. Each has its own shape and suspension tune. */
export type CarBody = "boxy" | "suv" | "sports" | "pickup";

export interface CarItem {
  /** Unique id, used for selection. */
  id: string;
  /** Display name, e.g. "Sports car". */
  name: string;
  /** Small line under the name. */
  subtitle?: string;
  /** Spoken by screen readers when the car is shown. */
  description?: string;
  /** Body style to build. */
  body: CarBody;
  /** Paint colour. Defaults to the body style's colour. */
  color?: string;
}

export interface CarDropMenuProps {
  /** Cars to show. Defaults to a boxy 4x4, an SUV, a sports car and a pickup. */
  items?: CarItem[];
  /** Initially selected id (uncontrolled). Defaults to the first item. */
  defaultValue?: string;
  /** Selected id (controlled). */
  value?: string;
  /** Called when the user picks a car. */
  onValueChange?: (id: string) => void;
  /** Extra classes for the root element. */
  className?: string;
}

const DEFAULT_CAR_ITEMS: CarItem[] = [
  {
    id: "boxy",
    name: "Boxy 4x4",
    subtitle: "Long travel · soft",
    description: "an upright off-roader on soft, long-travel springs",
    body: "boxy",
  },
  {
    id: "suv",
    name: "SUV",
    subtitle: "Comfort · medium",
    description: "a rounded family SUV with a comfort tune",
    body: "suv",
  },
  {
    id: "sports",
    name: "Sports car",
    subtitle: "Track · stiff",
    description: "a low, wide coupe on stiff track springs",
    body: "sports",
  },
  {
    id: "pickup",
    name: "Pickup",
    subtitle: "Light rear · lively",
    description: "a crew cab pickup with a light, bouncy tail",
    body: "pickup",
  },
];

/* -------------------------------------------------------------------------- */
/*                                   Specs                                    */
/* -------------------------------------------------------------------------- */

type V2 = [number, number];
type V3 = [number, number, number];

/**
 * Body frame: x forward (nose at +x), y up, z to the car's right.
 * Origin is the centre of mass at axle height, so wheel centres sit at y = 0.
 */
type Spec = {
  color: string;
  /** Brake caliper colour. */
  caliper: string;
  /** Wheel radius, tyre width, wheel arch radius. */
  R: number;
  tw: number;
  ra: number;
  /** Front and rear axle x. */
  xF: number;
  xR: number;
  /** Body width (without bevel) and sill height. */
  W: number;
  yb: number;
  /** Side profile from the front bottom corner, over the top, to the rear bottom corner. */
  top: V2[];
  /** Cabin, convex: rear base, front base, front top, rear top. */
  gh: V2[];
  /** Cabin width as a fraction of W. */
  gw: number;
  /** x of each pillar between side windows. */
  pillars: number[];
  /** Door shut lines on the body side: x, from y, to y. */
  doors: V3[];
  /** Door handles: x, y. */
  handles: V2[];
  bevel: number;
  flares?: boolean;
  /** Suspension: ride frequency front/rear (Hz), damping ratio, bump travel, droop travel. */
  f: [number, number];
  zeta: number;
  bump: number;
  droop: number;
  /** Lights, grilles, vents, trim. Edge decals use (t along the edge 0..1, z). */
  decor: (k: Kit) => void;
};

/** Mirror a decal across the centre line. */
const mz = (q: V2[]): V2[] => q.map(([a, b]) => [a, -b] as V2).reverse();
/** Rectangle in decal space. */
const rect = (t0: number, t1: number, z0: number, z1: number): V2[] => [
  [t0, z0],
  [t1, z0],
  [t1, z1],
  [t0, z1],
];
/** Circle polygon. */
const circ = (x: number, y: number, r: number, n = 22): V2[] =>
  Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r, y + Math.sin((i / n) * Math.PI * 2) * r] as V2);

const SPECS: Record<CarBody, Spec> = {
  boxy: {
    color: "#5f7050",
    caliper: "#3a3c40",
    R: 0.42,
    tw: 0.3,
    ra: 0.58,
    xF: 1.42,
    xR: -1.43,
    W: 1.92,
    yb: -0.06,
    top: [
      [2.28, -0.06],
      [2.28, 0.62],
      [2.2, 0.8],
      [0.72, 0.84],
      [-2.25, 0.84],
      [-2.3, 0.78],
      [-2.3, -0.06],
    ],
    gh: [
      [-2.25, 0.8],
      [0.74, 0.8],
      [0.6, 1.58],
      [-2.18, 1.58],
    ],
    gw: 0.92,
    pillars: [-0.35, -1.35],
    doors: [
      [0.7, 0.04, 0.82],
      [-0.35, 0.04, 0.82],
      [-1.35, 0.04, 0.82],
    ],
    handles: [
      [0.38, 0.66],
      [-0.66, 0.66],
    ],
    bevel: 0.05,
    flares: true,
    f: [1.15, 1.1],
    zeta: 0.15,
    bump: 0.14,
    droop: 0.2,
    decor: (k) => {
      const { W } = k.sp;
      // front: grille with body coloured slats, round lamps, plate
      k.face(0, rect(0.52, 0.93, -0.42, 0.42), k.black);
      for (const t of [0.6, 0.68, 0.76, 0.84]) k.face(0, rect(t, t + 0.035, -0.4, 0.4), k.paint, 0.002);
      k.face(0, rect(0.17, 0.4, -0.27, 0.27), k.black);
      k.face(0, rect(0.19, 0.38, -0.25, 0.25), k.white, 0.002);
      k.both((s) => {
        k.cyl(0.17, 0.05, [2.31, 0.44, 0.67 * s], "x", k.black);
        k.cyl(0.14, 0.05, [2.32, 0.44, 0.67 * s], "x", k.lamp);
        k.cyl(0.07, 0.05, [2.33, 0.44, 0.67 * s], "x", k.white);
        k.cyl(0.05, 0.04, [2.31, 0.2, 0.7 * s], "x", k.amber);
        k.box([0.08, 0.06, 0.1], [2.47, 0.02, 0.42 * s], k.red, 0.015);
      });
      k.box([0.2, 0.22, W + 0.08], [2.36, 0.02, 0], k.black);
      k.box([0.2, 0.22, W + 0.08], [-2.38, 0.02, 0], k.black);
      // hood: raised panel lines and washer jets
      k.face(2, rect(0.08, 0.95, -0.62, -0.6), k.light, 0.002);
      k.face(2, rect(0.08, 0.95, 0.6, 0.62), k.light, 0.002);
      k.face(2, rect(0.9, 0.94, -0.18, -0.12), k.black, 0.002);
      k.face(2, rect(0.9, 0.94, 0.12, 0.18), k.black, 0.002);
      // sides: crease, step, snorkel, mirrors
      k.side([[-2.25, 0.5], [2.22, 0.5], [2.22, 0.525], [-2.25, 0.525]], k.deep);
      k.side(circ(-1.9, 0.6, 0.07), k.deep);
      k.side(circ(-1.9, 0.6, 0.05), k.dark, 0.002);
      k.both((s) => {
        k.box([1.5, 0.05, 0.18], [0, -0.15, (W / 2 + 0.07) * s], k.black, 0.02);
        k.box([0.1, 0.17, 0.2], [0.5, 1.03, (W / 2 + 0.17) * s], k.paint, 0.035);
        k.box([0.02, 0.13, 0.16], [0.56, 1.03, (W / 2 + 0.17) * s], k.glass, 0.01);
        k.box([0.06, 0.04, 0.14], [0.55, 0.96, (W / 2 + 0.07) * s], k.black, 0.01);
        k.box([0.04, 0.3, 0.12], [-2.33, 0.5, 0.82 * s], k.tail, 0.01);
        k.box([0.04, 0.1, 0.12], [-2.33, 0.28, 0.82 * s], k.amber, 0.01);
      });
      k.box([0.1, 0.78, 0.1], [0.62, 1.12, -(W / 2 + 0.06)], k.black, 0.03);
      k.box([0.22, 0.1, 0.12], [0.62, 1.55, -(W / 2 + 0.06)], k.black, 0.03);
      // roof rack
      const y = 1.58 + 0.05 + 0.06;
      k.both((s) => k.box([2.3, 0.05, 0.05], [-0.8, y + 0.04, 0.72 * s], k.black, 0.015));
      for (const x of [-1.85, -1.3, -0.75, -0.2, 0.25]) k.box([0.05, 0.04, 1.5], [x, y + 0.04, 0], k.black, 0.012);
      k.both((s) => {
        for (const x of [-1.85, 0.25]) k.box([0.06, 0.08, 0.06], [x, y - 0.02, 0.72 * s], k.black, 0.012);
      });
      // spare wheel at the back with a body coloured cover
      k.wheel([-2.5, 0.62, 0], -Math.PI / 2);
      k.cyl(0.4, 0.12, [-2.58, 0.62, 0], "x", k.paint);
      k.cyl(0.3, 0.13, [-2.585, 0.62, 0], "x", k.dark);
    },
  },
  suv: {
    color: "#7f97aa",
    caliper: "#3a3c40",
    R: 0.4,
    tw: 0.28,
    ra: 0.5,
    xF: 1.4,
    xR: -1.45,
    W: 1.94,
    yb: -0.04,
    top: [
      [2.36, -0.04],
      [2.38, 0.36],
      [2.28, 0.56],
      [1.9, 0.66],
      [0.9, 0.78],
      [-2.2, 0.84],
      [-2.36, 0.7],
      [-2.38, -0.04],
    ],
    gh: [
      [-2.25, 0.8],
      [0.95, 0.74],
      [-0.05, 1.38],
      [-1.95, 1.4],
    ],
    gw: 0.88,
    pillars: [-0.8, -1.65],
    doors: [
      [0.92, 0.16, 0.76],
      [-0.8, 0.16, 0.8],
      [-1.68, 0.3, 0.82],
    ],
    handles: [
      [-0.55, 0.64],
      [-1.42, 0.66],
    ],
    bevel: 0.09,
    f: [1.4, 1.45],
    zeta: 0.26,
    bump: 0.09,
    droop: 0.16,
    decor: (k) => {
      const { W } = k.sp;
      const gz = (k.sp.gw * W) / 2;
      // bumper face: lower intake, fog lamps, plate, skid plate
      k.face(0, [[0.12, -0.6], [0.12, 0.6], [0.5, 0.5], [0.5, -0.5]], k.black);
      for (const t of [0.22, 0.34]) k.face(0, rect(t, t + 0.04, -0.52, 0.52), k.dark, 0.002);
      k.face(0, rect(0.58, 0.9, -0.26, 0.26), k.black);
      k.face(0, rect(0.61, 0.87, -0.24, 0.24), k.white, 0.002);
      k.both((s) => {
        k.face(0, k.disc(0, 0.32, 0.78 * s, 0.075), k.black);
        k.face(0, k.disc(0, 0.32, 0.78 * s, 0.05), k.white, 0.002);
      });
      k.box([0.08, 0.06, 1.0], [2.42, -0.08, 0], k.chrome, 0.02);
      // nose: grille with chrome bars, swept headlights with a light strip
      k.face(1, [[0.06, -0.44], [0.06, 0.44], [0.95, 0.4], [0.95, -0.4]], k.black);
      for (const t of [0.25, 0.48, 0.71]) k.face(1, rect(t, t + 0.06, -0.4, 0.4), k.chrome, 0.002);
      const lamp: V2[] = [[0.18, 0.5], [0.12, 0.9], [0.92, 0.88], [0.92, 0.48]];
      for (const q of [lamp, mz(lamp)]) k.face(1, q, k.lamp);
      for (const z of [1, -1]) k.face(1, rect(0.2, 0.32, 0.54 * z, 0.86 * z).map(([t, zz]) => [t, zz] as V2), k.white, 0.002);
      // hood lines
      for (const z of [-0.36, 0.34]) k.face(3, rect(0.04, 0.96, z, z + 0.02), k.light, 0.002);
      // sides: black cladding, mirrors, rails, spoiler, lights
      k.sill(0.14, k.black);
      k.side([[-2.2, 0.56], [2.1, 0.5], [2.1, 0.52], [-2.2, 0.58]], k.light);
      k.side(circ(-1.98, 0.6, 0.065), k.deep);
      k.both((s) => {
        k.box([0.1, 0.15, 0.22], [0.74, 0.92, (W / 2 + 0.17) * s], k.paint, 0.04);
        k.box([0.02, 0.11, 0.18], [0.8, 0.92, (W / 2 + 0.17) * s], k.glass, 0.01);
        k.box([0.03, 0.03, 0.12], [0.76, 0.87, (W / 2 + 0.17) * s], k.amber, 0.008);
        k.box([1.6, 0.05, 0.05], [-1.0, 1.52, (gz - 0.12) * s], k.chrome, 0.015);
        for (const x of [-0.25, -1.75]) k.box([0.1, 0.07, 0.07], [x, 1.48, (gz - 0.12) * s], k.black, 0.015);
        k.box([0.06, 0.12, 0.4], [-2.4, 0.7, 0.62 * s], k.tail, 0.02);
      });
      k.box([0.26, 0.05, gz * 2 - 0.1], [-2.02, 1.44, 0], k.paint, 0.02, 0.1);
      k.box([0.18, 0.08, 0.06], [-1.1, 1.47, 0], k.black, 0.03);
      k.box([0.18, 0.16, W], [-2.42, 0.04, 0], k.black);
    },
  },
  sports: {
    color: "#de4a33",
    caliper: "#f2c230",
    R: 0.36,
    tw: 0.32,
    ra: 0.44,
    xF: 1.36,
    xR: -1.28,
    W: 2.0,
    yb: -0.16,
    top: [
      [2.24, -0.16],
      [2.3, 0.1],
      [2.2, 0.27],
      [1.7, 0.36],
      [0.62, 0.47],
      [-1.5, 0.52],
      [-2.18, 0.52],
      [-2.27, 0.3],
      [-2.24, -0.16],
    ],
    gh: [
      [-1.55, 0.48],
      [0.62, 0.44],
      [-0.18, 0.92],
      [-1.0, 0.94],
    ],
    gw: 0.8,
    pillars: [-0.74],
    doors: [
      [0.6, -0.06, 0.46],
      [-0.82, -0.06, 0.5],
    ],
    handles: [[-0.58, 0.4]],
    bevel: 0.08,
    f: [2.1, 2.3],
    zeta: 0.5,
    bump: 0.06,
    droop: 0.08,
    decor: (k) => {
      const { W } = k.sp;
      // bumper: wide intake with mesh bars, fog lamps, splitter
      k.face(0, [[0.12, -0.58], [0.12, 0.58], [0.78, 0.5], [0.78, -0.5]], k.black);
      for (const t of [0.32, 0.52]) k.face(0, rect(t, t + 0.06, -0.5, 0.5), k.dark, 0.002);
      k.both((s) => {
        k.face(0, k.disc(0, 0.45, 0.8 * s, 0.07), k.black);
        k.face(0, k.disc(0, 0.45, 0.8 * s, 0.048), k.white, 0.002);
      });
      k.box([0.18, 0.03, W - 0.1], [2.3, -0.2, 0], k.black, 0.01);
      // nose: black grille band and swept headlights
      k.face(1, [[0.04, -0.38], [0.04, 0.38], [0.8, 0.3], [0.8, -0.3]], k.black);
      const lamp: V2[] = [[0.08, 0.46], [0.12, 0.92], [0.9, 0.86], [0.88, 0.56]];
      for (const q of [lamp, mz(lamp)]) k.face(1, q, k.lamp);
      for (const z of [1, -1]) k.face(1, rect(0.14, 0.26, 0.52 * z, 0.86 * z), k.white, 0.002);
      // hood: twin vents with slats, centre crease
      const vent: V2[] = [[0.18, 0.2], [0.5, 0.26], [0.5, 0.52], [0.18, 0.48]];
      for (const q of [vent, mz(vent)]) k.face(3, q, k.deep, 0.002);
      for (const z of [1, -1]) for (const t of [0.26, 0.34, 0.42]) k.face(3, rect(t, t + 0.025, 0.27 * z, 0.47 * z), k.black, 0.004);
      k.face(3, rect(0.04, 0.96, -0.012, 0.012), k.light, 0.002);
      k.face(2, rect(0.1, 0.9, -0.012, 0.012), k.light, 0.002);
      // sides: skirt, shoulder line, intake, fuel cap, mirrors
      k.sill(0.07, k.black);
      k.side([[-2.12, 0.4], [1.95, 0.32], [1.95, 0.335], [-2.12, 0.415]], k.light);
      k.side([[-0.88, 0.06], [-0.94, 0.27], [-1.08, 0.3], [-1.06, 0.06]], k.black);
      k.side([[-0.9, 0.09], [-0.95, 0.24], [-1.04, 0.26], [-1.03, 0.09]], k.deep, 0.002);
      k.side(circ(-1.92, 0.36, 0.055), k.deep);
      k.both((s) => {
        k.box([0.14, 0.09, 0.2], [0.36, 0.6, (W / 2 + 0.13) * s], k.paint, 0.035);
        k.box([0.03, 0.06, 0.14], [0.31, 0.6, (W / 2 + 0.14) * s], k.glass, 0.01);
        k.box([0.08, 0.03, 0.06], [0.4, 0.54, (W / 2 + 0.05) * s], k.black, 0.01);
        k.cyl(0.05, 0.1, [-2.3, -0.08, 0.5 * s], "x", k.chrome);
        k.cyl(0.035, 0.11, [-2.3, -0.08, 0.5 * s], "x", k.black);
      });
      // tail: light bar, diffuser, lip spoiler, fin antenna
      k.face(-2, rect(0.15, 0.7, -0.86, 0.86), k.tail);
      k.face(-2, rect(0.15, 0.7, -0.3, 0.3), k.black, 0.002);
      k.face(-1, rect(0.55, 0.95, -0.6, 0.6), k.black);
      k.box([0.2, 0.05, W - 0.2], [-2.12, 0.57, 0], k.deep, 0.02, 0.18);
      k.box([0.2, 0.06, 0.05], [-0.95, 0.99, 0], k.black, 0.025);
    },
  },
  pickup: {
    color: "#dba13c",
    caliper: "#3a3c40",
    R: 0.42,
    tw: 0.3,
    ra: 0.57,
    xF: 1.3,
    xR: -1.92,
    W: 1.98,
    yb: -0.06,
    top: [
      [2.25, -0.06],
      [2.27, 0.5],
      [2.15, 0.76],
      [0.42, 0.84],
      [-1.36, 0.86],
      [-1.38, 0.9],
      [-2.9, 0.9],
      [-2.92, -0.06],
    ],
    gh: [
      [-1.32, 0.8],
      [0.45, 0.8],
      [-0.15, 1.48],
      [-1.28, 1.5],
    ],
    gw: 0.9,
    pillars: [-0.62],
    doors: [
      [0.42, 0.06, 0.82],
      [-0.62, 0.06, 0.84],
      [-1.32, 0.06, 0.84],
      [-1.42, 0.06, 0.88],
    ],
    handles: [
      [0.12, 0.68],
      [-0.92, 0.7],
    ],
    bevel: 0.05,
    flares: true,
    f: [1.35, 1.8],
    zeta: 0.2,
    bump: 0.14,
    droop: 0.2,
    decor: (k) => {
      const { W } = k.sp;
      // front: big grille with chrome bars, stacked lamps, chrome bumper
      k.face(0, rect(0.42, 0.97, -0.6, 0.6), k.black);
      for (const t of [0.5, 0.62, 0.74, 0.86]) k.face(0, rect(t, t + 0.04, -0.58, 0.58), k.chrome, 0.002);
      k.face(0, rect(0.42, 0.97, -0.05, 0.05), k.chrome, 0.003);
      k.both((s) => {
        k.face(0, rect(0.58, 0.97, 0.64 * s, 0.94 * s), k.black);
        k.face(0, rect(0.74, 0.94, 0.66 * s, 0.92 * s), k.lamp, 0.002);
        k.face(0, rect(0.6, 0.7, 0.66 * s, 0.92 * s), k.amber, 0.002);
        k.cyl(0.055, 0.04, [2.43, 0.05, 0.7 * s], "x", k.white);
        k.box([0.1, 0.17, 0.2], [0.33, 1.0, (W / 2 + 0.17) * s], k.black, 0.03);
        k.box([0.02, 0.13, 0.16], [0.39, 1.0, (W / 2 + 0.17) * s], k.glass, 0.01);
        k.box([1.6, 0.05, 0.18], [-0.25, -0.15, (W / 2 + 0.07) * s], k.black, 0.02);
        k.box([0.06, 0.36, 0.12], [-2.95, 0.62, 0.86 * s], k.tail, 0.02);
      });
      k.box([0.24, 0.22, W + 0.06], [2.31, 0.04, 0], k.chrome, 0.03);
      k.box([0.03, 0.12, 0.34], [2.44, 0.06, 0], k.white, 0.01);
      k.box([0.2, 0.18, W + 0.04], [-2.97, 0.04, 0], k.chrome, 0.03);
      // hood ridges, cab marker lamps
      for (const z of [-0.42, 0.4]) k.face(2, rect(0.04, 0.96, z, z + 0.02), k.light, 0.002);
      for (const z of [-0.3, 0, 0.3]) k.box([0.05, 0.03, 0.08], [-0.2, 1.56, z], k.amber, 0.01);
      // bed: tonneau cover, fuel cap, tailgate
      // cover sits clear of the bed's rounded top (0.9 + bevel) so the two never fight
      k.box([1.5, 0.05, W - 0.02], [-2.14, 0.975, 0], k.black, 0.015);
      for (const x of [-1.66, -2.02, -2.38, -2.74]) k.box([0.03, 0.012, W - 0.12], [x, 1.003, 0], k.grey, 0.005);
      k.side(circ(-2.45, 0.6, 0.07), k.deep);
      k.face(-1, rect(0.15, 0.25, -0.15, 0.15), k.black);
    },
  },
};

/* -------------------------------------------------------------------------- */
/*                                  Physics                                   */
/* -------------------------------------------------------------------------- */

const G = 9.8;
const STEP = 1 / 1000; // integrator substep
const MW = 0.04; // wheel mass, body mass is 1
const KT = 3000; // tyre stiffness
const CT = 4; // tyre damping
const KB = 4800; // bump stop stiffness per unit corner mass
const CB = 30; // bump stop damping per unit corner mass
const DRAG = 0.16; // quadratic air drag while dropping in, caps it near 8 m/s so the landing reads as a bounce, not a crash
const ARB = 1.5; // anti-roll bar stiffness, relative to the corner spring
const G_EXIT = G * 2.4; // the outgoing car is yanked down fast

type Rig = {
  X: number[];
  Z: number[];
  ks: number[];
  cs: number[];
  s0: number[];
  kb: number[];
  cb: number[];
  Ip: number;
  Ir: number;
  R: number;
  bump: number;
  droop: number;
  /** Visual centre along x, so the car sits centred on stage. */
  cx: number;
};

function rigOf(sp: Spec): Rig {
  const front = -sp.xR / (sp.xF - sp.xR); // share of weight on the front axle
  const Z = sp.W / 2 + 0.02 - sp.tw / 2;
  const xs = sp.top.map((p) => p[0]);
  const len = Math.max(...xs) - Math.min(...xs);
  const r: Rig = {
    X: [sp.xF, sp.xF, sp.xR, sp.xR],
    Z: [Z, -Z, Z, -Z],
    ks: [],
    cs: [],
    s0: [],
    kb: [],
    cb: [],
    Ip: (len * len + 2.4) / 12,
    Ir: (sp.W * sp.W + 2.4) / 12,
    R: sp.R,
    bump: sp.bump,
    droop: sp.droop,
    cx: (Math.max(...xs) + Math.min(...xs)) / 2,
  };
  for (let i = 0; i < 4; i++) {
    const m = (i < 2 ? front : 1 - front) / 2;
    const w = 2 * Math.PI * sp.f[i < 2 ? 0 : 1];
    const ks = m * w * w;
    r.ks.push(ks);
    r.cs.push(2 * sp.zeta * Math.sqrt(ks * m));
    r.s0.push((m * G) / ks);
    r.kb.push(KB * m);
    r.cb.push(CB * m);
  }
  return r;
}

const RIGS = Object.fromEntries(
  (Object.keys(SPECS) as CarBody[]).map((b) => [b, rigOf(SPECS[b])]),
) as Record<CarBody, Rig>;

type Sim = {
  /** drop: on the floor. fall: the floor is gone. */
  mode: "drop" | "fall";
  x: number;
  vx: number;
  y: number;
  vy: number;
  /** Pitch (nose up +) and roll (right side down +). */
  p: number;
  vp: number;
  r: number;
  vr: number;
  /** Wheel centre heights, their speeds, suspension extension (0 = static ride) and tyre squash. */
  w: number[];
  vw: number[];
  s: number[];
  pen: number[];
};

function corner(sim: Sim, rig: Rig, i: number) {
  const cp = Math.cos(sim.p);
  return sim.y + rig.X[i] * Math.sin(sim.p) - rig.Z[i] * Math.sin(sim.r) * cp;
}

/** A fresh drop from above the stage, tilted and spun a little differently each time. */
function spawnSim(rig: Rig, rand: () => number = Math.random): Sim {
  const sim: Sim = {
    mode: "drop",
    x: 0,
    vx: 0,
    y: 5.7 + rand() * 0.5,
    vy: -4 - rand() * 1.5,
    p: (rand() - 0.5) * 0.26,
    vp: (rand() - 0.5) * 0.5,
    r: (rand() - 0.5) * 0.1,
    vr: (rand() - 0.5) * 0.16,
    w: [],
    vw: [],
    s: [],
    pen: [0, 0, 0, 0],
  };
  for (let i = 0; i < 4; i++) {
    const s = Math.min(rig.s0[i], rig.droop); // wheels hang in the air
    sim.s.push(s);
    sim.w.push(corner(sim, rig, i) - s);
    sim.vw.push(sim.vy);
  }
  return sim;
}

/** One substep: four quarter-car corners driving a body that heaves, pitches and rolls. */
function stepSim(sim: Sim, rig: Rig, h: number) {
  const cp = Math.cos(sim.p);
  const sp = Math.sin(sim.p);
  const cr = Math.cos(sim.r);
  const sr = Math.sin(sim.r);
  // drag is shared by body and wheels so it never stretches the springs
  const g = sim.mode === "drop" ? G + DRAG * sim.vy * Math.abs(sim.vy) : G_EXIT;
  let ay = -g;
  let tp = 0;
  let tr = 0;
  const S: number[] = [];
  const SV: number[] = [];
  for (let i = 0; i < 4; i++) {
    // ponytail: small-angle corner velocity and torque arms, fine below ~0.4 rad
    const X = rig.X[i];
    const Z = rig.Z[i];
    S.push(sim.y + X * sp - Z * sr * cp - sim.w[i]);
    SV.push(sim.vy + X * cp * sim.vp - Z * cr * cp * sim.vr - sim.vw[i]);
  }
  for (let i = 0; i < 4; i++) {
    const X = rig.X[i];
    const Z = rig.Z[i];
    const s = S[i];
    const sv = SV[i];
    // spring, damper, and an anti-roll bar tying each corner to its axle partner (i ^ 1)
    let F = rig.ks[i] * (rig.s0[i] - s) - rig.cs[i] * sv + ARB * rig.ks[i] * (S[i ^ 1] - s);
    if (s < -rig.bump) {
      const d = -rig.bump - s;
      F += rig.kb[i] * d * (1 + 10 * d) - rig.cb[i] * sv;
    } else if (s > rig.droop) {
      const d = s - rig.droop;
      F -= rig.kb[i] * d + rig.cb[i] * sv;
    }
    let Ft = 0;
    let pen = 0;
    if (sim.mode === "drop") {
      pen = rig.R - sim.w[i];
      if (pen > 0) Ft = Math.max(0, KT * pen - CT * sim.vw[i]);
    }
    ay += F;
    tp += F * X * cp;
    tr -= F * Z * cr;
    sim.vw[i] += ((Ft - F) / MW - g) * h;
    sim.w[i] += sim.vw[i] * h;
    sim.s[i] = s;
    sim.pen[i] = Math.max(0, pen);
  }
  sim.vy += ay * h;
  sim.vp += (tp / rig.Ip) * h;
  sim.vr += (tr / rig.Ir) * h;
  sim.y += sim.vy * h;
  sim.p += sim.vp * h;
  sim.r += sim.vr * h;
  sim.x += sim.vx * h;
}

function advance(sim: Sim, rig: Rig, dt: number) {
  const n = Math.ceil(dt / STEP);
  for (let k = 0; k < n; k++) stepSim(sim, rig, dt / n);
}

/** Nearly motionless. */
function quiet(sim: Sim) {
  let e = sim.vy * sim.vy + sim.vp * sim.vp + sim.vr * sim.vr;
  for (const v of sim.vw) e += v * v * 0.05;
  return e < 4e-5;
}

/** Physics internals, exported for the self-check script. */


/* -------------------------------------------------------------------------- */
/*                                  Modelling                                 */
/* -------------------------------------------------------------------------- */

type Kit = {
  sp: Spec;
  /** Toon paint and its shades. */
  paint: THREE.Material;
  light: THREE.Material;
  dark: THREE.Material;
  deep: THREE.Material;
  /** Flat colours. */
  black: THREE.Material;
  white: THREE.Material;
  lamp: THREE.Material;
  tail: THREE.Material;
  amber: THREE.Material;
  red: THREE.Material;
  chrome: THREE.Material;
  glass: THREE.Material;
  grey: THREE.Material;
  /** Decal on a body profile edge (negative index counts from the rear). */
  face: (edge: number, q: V2[], mat: THREE.Material, lift?: number) => void;
  /** Circle polygon in an edge's decal space. */
  disc: (edge: number, t: number, z: number, r: number) => V2[];
  /** Decal on both body sides, in (x, y). */
  side: (poly: V2[], mat: THREE.Material, lift?: number) => void;
  /** Strip along the sill of height h, skipping the wheel arches. */
  sill: (h: number, mat: THREE.Material) => void;
  box: (size: V3, pos: V3, mat: THREE.Material, r?: number, rz?: number) => void;
  cyl: (r: number, h: number, pos: V3, axis: "x" | "y" | "z", mat: THREE.Material) => void;
  both: (fn: (side: 1 | -1) => void) => void;
  wheel: (pos: V3, ry: number) => void;
};

type Flat = "black" | "white" | "lamp" | "tail" | "amber" | "red" | "chrome" | "frame" | "glass" | "shine" | "tyre" | "rim" | "hub" | "nut" | "disc" | "rotor" | "well" | "coil" | "damper";

type Mats = { flat: Record<Flat, THREE.Material>; ramp: THREE.DataTexture };

const FLAT: Record<Flat, string> = {
  black: "#22252a",
  white: "#f7f6f1",
  lamp: "#f8dc84",
  tail: "#e4572e",
  amber: "#f0a531",
  red: "#d8392b",
  chrome: "#c3c7cc",
  frame: "#1d2730",
  glass: "#2f6f87",
  shine: "#7db3c5",
  tyre: "#2a2b2f",
  rim: "#b8bbc0",
  hub: "#d4d6d9",
  nut: "#74777c",
  disc: "#3a3c41",
  rotor: "#8d9095",
  well: "#16171a",
  coil: "#f2b632",
  damper: "#34363b",
};

function makeMats(): Mats {
  // Three hard tone bands (side, front, top) instead of smooth shading.
  const ramp = new THREE.DataTexture(new Uint8Array([38, 64, 128, 255]), 4, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  const flat = Object.fromEntries(
    Object.entries(FLAT).map(([k, c]) => [k, new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })]),
  ) as unknown as Record<Flat, THREE.Material>;
  return { flat, ramp };
}

const toon = (color: THREE.ColorRepresentation, ramp: THREE.Texture, f = 1) =>
  new THREE.MeshToonMaterial({
    color: new THREE.Color(color).multiplyScalar(f),
    gradientMap: ramp,
    side: THREE.DoubleSide,
  });

const extrude = (shape: THREE.Shape, depth: number, bevel: number) => {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 32,
  });
  g.translate(0, 0, -depth / 2);
  return g;
};

/** Where an arch of radius r around axle x crosses the sill. */
function archAt(sp: Spec, r: number) {
  const dx = Math.sqrt(r * r - sp.yb * sp.yb);
  return { dx, a0: Math.atan2(sp.yb, -dx), a1: Math.atan2(sp.yb, dx) };
}

function lowerShape(sp: Spec) {
  const s = new THREE.Shape();
  s.moveTo(sp.top[sp.top.length - 1][0], sp.yb);
  const { dx, a0, a1 } = archAt(sp, sp.ra);
  for (const xw of [sp.xR, sp.xF]) {
    s.lineTo(xw - dx, sp.yb);
    s.absarc(xw, 0, sp.ra, a0, a1, true);
  }
  for (const [x, y] of sp.top.slice(0, -1)) s.lineTo(x, y);
  return s;
}

/** Shrink a convex CCW polygon by m. */
function inset(p: V2[], m: number): V2[] {
  const n = p.length;
  const lines = p.map((a, i) => {
    const b = p[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / l;
    const dy = (b[1] - a[1]) / l;
    return [a[0] - dy * m, a[1] + dx * m, dx, dy];
  });
  return lines.map((L, i) => {
    const P = lines[(i - 1 + n) % n];
    const t = ((L[0] - P[0]) * L[3] - (L[1] - P[1]) * L[2]) / (P[2] * L[3] - P[3] * L[2]);
    return [P[0] + P[2] * t, P[1] + P[3] * t] as V2;
  });
}

/** Keep the part of a convex polygon where nx*x + ny*y <= c. */
function clip(p: V2[], nx: number, ny: number, c: number): V2[] {
  const out: V2[] = [];
  const f = (q: V2) => nx * q[0] + ny * q[1] - c;
  p.forEach((a, i) => {
    const b = p[(i + 1) % p.length];
    const fa = f(a);
    const fb = f(b);
    if (fa <= 0) out.push(a);
    if (fa <= 0 !== fb <= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return out;
}

/** Polygon in (t along a→b, z), lifted o off the surface along the edge's outward normal. */
function pane(a: V2, b: V2, o: number, q: V2[]) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  const nx = (dy / l) * o;
  const ny = (-dx / l) * o;
  const pos: number[] = [];
  for (const [t, z] of q) pos.push(a[0] + dx * t + nx, a[1] + dy * t + ny, z);
  const idx: number[] = [];
  for (let k = 1; k < q.length - 1; k++) idx.push(0, k, k + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const flatShape = (poly: V2[]) => new THREE.ShapeGeometry(new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y))));

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, v = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * 6.5;
    return v.set(Math.cos(a) * 0.085, t, Math.sin(a) * 0.085);
  }
}

/** Tyre, rim with five spokes, hub and nuts, brake rotor and caliper. Rim faces +z. */
function makeWheel(sp: Spec, mats: Mats, caliper: THREE.Material) {
  const { R, tw } = sp;
  const F = mats.flat;
  const g = new THREE.Group();
  const t = new THREE.Group();
  t.name = "t";
  g.add(t);
  const c = 0.08;
  const rim = R * 0.66;
  const pts: THREE.Vector2[] = [new THREE.Vector2(rim - 0.01, -tw / 2)];
  for (let k = 0; k <= 8; k++) {
    const a = -Math.PI / 2 + (k / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - c + c * Math.cos(a), -tw / 2 + c + c * Math.sin(a)));
  }
  for (let k = 0; k <= 8; k++) {
    const a = (k / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - c + c * Math.cos(a), tw / 2 - c + c * Math.sin(a)));
  }
  pts.push(new THREE.Vector2(rim - 0.01, tw / 2));
  const mesh = (geo: THREE.BufferGeometry, m: THREE.Material, z = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.z = z;
    t.add(o);
    return o;
  };
  const zx = (geo: THREE.BufferGeometry) => geo.rotateX(Math.PI / 2);
  mesh(zx(new THREE.LatheGeometry(pts, 48)), F.tyre);
  mesh(zx(new THREE.CylinderGeometry(rim, rim, tw * 0.74, 40)), F.disc);
  mesh(zx(new THREE.CylinderGeometry(rim * 0.78, rim * 0.78, 0.02, 40)), F.rotor, tw * 0.18);
  const cal = mesh(new RoundedBoxGeometry(0.1, rim * 0.5, 0.08, 2, 0.02), caliper, tw * 0.22);
  cal.position.set(-rim * 0.55, rim * 0.35, tw * 0.22);
  cal.rotation.z = 0.55;
  mesh(new THREE.TorusGeometry(rim * 0.94, 0.028, 8, 48), F.rim, tw * 0.36);
  mesh(new THREE.TorusGeometry(rim * 1.04, 0.012, 6, 48), F.rim, tw * 0.37);
  mesh(zx(new THREE.CylinderGeometry(0.085, 0.095, 0.05, 24)), F.hub, tw * 0.37);
  mesh(zx(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12)), F.nut, tw * 0.38);
  const spoke = new THREE.BoxGeometry(0.07, rim * 0.84, 0.035);
  const nut = zx(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 8));
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const s = mesh(spoke, F.rim, tw * 0.35);
    s.rotation.z = a;
    s.position.set(-Math.sin(a) * rim * 0.46, Math.cos(a) * rim * 0.46, tw * 0.35);
    const n = mesh(nut, F.nut, tw * 0.385);
    n.position.set(-Math.sin(a + 0.63) * 0.058, Math.cos(a + 0.63) * 0.058, tw * 0.385);
  }
  return g;
}

/** Builds one car, wheels named w0..w3 (FR, FL, RR, RL), coils k0..k3, damper rods d0..d3. */
function buildCar(body: CarBody, color: string, mats: Mats) {
  const sp = SPECS[body];
  const rig = RIGS[body];
  const F = mats.flat;
  const car = new THREE.Group();
  car.rotation.order = "YZX";
  const add = (o: THREE.Object3D) => car.add(o);
  const paint = toon(color, mats.ramp);
  const caliper = new THREE.MeshBasicMaterial({ color: sp.caliper });

  // body and cabin
  add(new THREE.Mesh(extrude(lowerShape(sp), sp.W, sp.bevel), paint));
  const gw = sp.W * sp.gw;
  add(new THREE.Mesh(extrude(new THREE.Shape(sp.gh.map(([x, y]) => new THREE.Vector2(x, y))), gw, sp.bevel), paint));
  const bodyZ = sp.W / 2 + sp.bevel;
  const cabZ = gw / 2 + sp.bevel;

  // side glass: dark frame, tinted pane, and light streaks on the front window
  const win = inset(sp.gh, 0.06);
  const cuts = [-Infinity, ...[...sp.pillars].sort((a, b) => a - b), Infinity];
  for (let i = 0; i < cuts.length - 1; i++) {
    let poly = win;
    if (cuts[i] > -Infinity) poly = clip(poly, -1, 0, -(cuts[i] + 0.055));
    if (cuts[i + 1] < Infinity) poly = clip(poly, 1, 0, cuts[i + 1] - 0.055);
    if (poly.length < 3) continue;
    const pieces: [V2[], THREE.Material, number][] = [
      [poly, F.frame, 0.004],
      [inset(poly, 0.028), F.glass, 0.007],
    ];
    if (i === cuts.length - 2) {
      const g = inset(poly, 0.028);
      const n: V2 = [0.74, 0.67];
      const cx = g.reduce((s, p) => s + p[0], 0) / g.length;
      const cy = g.reduce((s, p) => s + p[1], 0) / g.length;
      const c = n[0] * cx + n[1] * cy;
      for (const [c0, c1] of [
        [c - 0.02, c + 0.1],
        [c + 0.17, c + 0.21],
      ]) {
        const band = clip(clip(g, n[0], n[1], c1), -n[0], -n[1], -c0);
        if (band.length > 2) pieces.push([band, F.shine, 0.01]);
      }
    }
    for (const [p, m, o] of pieces) {
      const geo = flatShape(p);
      for (const s of [1, -1]) {
        const mesh = new THREE.Mesh(geo, m);
        mesh.position.z = s * (cabZ + o);
        add(mesh);
      }
    }
  }
  // windscreen and rear window, with streaks and wipers
  const [rb, fb, ft, rt] = sp.gh;
  const hz = gw / 2 + sp.bevel - 0.07;
  const o = sp.bevel + 0.004;
  add(new THREE.Mesh(pane(fb, ft, o, rect(0.03, 0.97, -hz, hz)), F.frame));
  add(new THREE.Mesh(pane(fb, ft, o + 0.003, rect(0.08, 0.92, -hz + 0.05, hz - 0.05)), F.glass));
  for (const [z0, w] of [
    [-0.42, 0.2],
    [0.0, 0.08],
  ])
    add(new THREE.Mesh(pane(fb, ft, o + 0.006, [[0.1, z0], [0.1, z0 + w], [0.9, z0 + w + 0.32], [0.9, z0 + 0.32]]), F.shine));
  for (const z of [-0.08, 0.5])
    add(new THREE.Mesh(pane(fb, ft, o + 0.009, [[0.1, z - 0.48], [0.13, z - 0.48], [0.16, z], [0.13, z]]), F.black));
  add(new THREE.Mesh(pane(rt, rb, o, rect(0.04, 0.96, -hz, hz)), F.frame));
  add(new THREE.Mesh(pane(rt, rb, o + 0.003, rect(0.1, 0.9, -hz + 0.06, hz - 0.06)), F.glass));
  add(new THREE.Mesh(pane(rt, rb, o + 0.006, [[0.15, -0.3], [0.15, -0.18], [0.85, 0.06], [0.85, -0.06]]), F.shine));

  // dark wheel wells, and flares on the off-roaders
  const { dx, a0, a1 } = archAt(sp, sp.ra);
  for (const xw of [sp.xR, sp.xF]) {
    const well = new THREE.Shape();
    well.moveTo(xw - dx, sp.yb);
    well.absarc(xw, 0, sp.ra, a0, a1, true);
    add(new THREE.Mesh(extrude(well, sp.W - 1.3, 0), F.well));
    if (sp.flares) {
      const oa = archAt(sp, sp.ra + 0.1);
      const fl = new THREE.Shape();
      fl.moveTo(xw - oa.dx, sp.yb);
      fl.absarc(xw, 0, sp.ra + 0.1, oa.a0, oa.a1, true);
      fl.lineTo(xw + dx, sp.yb);
      fl.absarc(xw, 0, sp.ra, a1, a0, false);
      add(new THREE.Mesh(extrude(fl, sp.W + 0.1, 0.02), F.black));
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * (0.12 + (k / 6) * 0.76);
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8).rotateX(Math.PI / 2), F.chrome);
        for (const s of [1, -1]) {
          const b = bolt.clone();
          b.position.set(xw + Math.cos(a) * (sp.ra + 0.05), Math.sin(a) * (sp.ra + 0.05), s * (sp.W / 2 + 0.08));
          add(b);
        }
      }
    }
  }

  // wheels, coil springs and dampers
  const helix = new THREE.TubeGeometry(new Helix(), 180, 0.017, 6);
  const top = sp.ra - 0.05;
  for (let i = 0; i < 4; i++) {
    const side = rig.Z[i] > 0 ? 1 : -1;
    const wheel = makeWheel(sp, mats, caliper);
    wheel.name = `w${i}`;
    wheel.position.set(rig.X[i], 0, rig.Z[i]);
    if (side < 0) wheel.rotation.y = Math.PI;
    add(wheel);
    const zc = rig.Z[i] - side * (sp.tw / 2 + 0.08);
    const coil = new THREE.Mesh(helix, F.coil);
    coil.name = `k${i}`;
    coil.position.set(rig.X[i], 0, zc);
    coil.scale.y = top;
    add(coil);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.24, 14), F.damper);
    can.position.set(rig.X[i], top - 0.12, zc);
    add(can);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.34, 10), F.chrome);
    rod.name = `d${i}`;
    rod.position.set(rig.X[i], 0.17, zc);
    add(rod);
  }

  // details
  const n = sp.top.length - 1;
  const edge = (i: number) => (i < 0 ? n + i : i);
  const kit: Kit = {
    sp,
    paint,
    light: toon(color, mats.ramp, 1.22),
    dark: toon(color, mats.ramp, 0.62),
    deep: toon(color, mats.ramp, 0.78),
    black: F.black,
    white: F.white,
    lamp: F.lamp,
    tail: F.tail,
    amber: F.amber,
    red: F.red,
    chrome: F.chrome,
    glass: F.glass,
    grey: F.disc,
    face: (e, q, mat, lift = 0) => {
      const i = edge(e);
      add(new THREE.Mesh(pane(sp.top[i], sp.top[i + 1], sp.bevel + 0.004 + lift, q), mat));
    },
    disc: (e, t, z, r) => {
      const i = edge(e);
      const l = Math.hypot(sp.top[i + 1][0] - sp.top[i][0], sp.top[i + 1][1] - sp.top[i][1]);
      return circ(0, 0, r).map(([u, v]) => [t + u / l, z + v] as V2);
    },
    side: (poly, mat, lift = 0) => {
      const geo = flatShape(poly);
      for (const s of [1, -1]) {
        const m = new THREE.Mesh(geo, mat);
        m.position.z = s * (bodyZ + 0.004 + lift);
        add(m);
      }
    },
    sill: (h, mat) => {
      const xs = sp.top.map((p) => p[0]);
      const r = sp.ra + 0.01;
      const y0 = sp.yb + 0.02;
      for (const [x0, x1] of [
        [Math.min(...xs) + 0.02, sp.xR - r],
        [sp.xR + r, sp.xF - r],
        [sp.xF + r, Math.max(...xs) - 0.02],
      ])
        kit.side([[x0, y0], [x1, y0], [x1, y0 + h], [x0, y0 + h]], mat);
    },
    box: (size, pos, mat, r = 0.03, rz = 0) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(r, ...size.map((v) => v / 2 - 0.001))), mat);
      m.position.set(...pos);
      m.rotation.z = rz;
      add(m);
    },
    cyl: (r, h, pos, axis, mat) => {
      const g = new THREE.CylinderGeometry(r, r, h, 32);
      if (axis === "x") g.rotateZ(Math.PI / 2);
      if (axis === "z") g.rotateX(Math.PI / 2);
      const m = new THREE.Mesh(g, mat);
      m.position.set(...pos);
      add(m);
    },
    both: (fn) => {
      fn(1);
      fn(-1);
    },
    wheel: (pos, ry) => {
      const w = makeWheel(sp, mats, caliper);
      w.position.set(...pos);
      w.rotation.y = ry;
      add(w);
    },
  };
  // shut lines and handles
  for (const [x, y0, y1] of sp.doors) kit.side([[x - 0.008, y0], [x + 0.008, y0], [x + 0.008, y1], [x - 0.008, y1]], kit.dark);
  for (const [x, y] of sp.handles) {
    kit.side([[x - 0.1, y - 0.025], [x + 0.06, y - 0.025], [x + 0.06, y + 0.025], [x - 0.1, y + 0.025]], kit.dark);
    kit.side([[x - 0.09, y - 0.012], [x + 0.05, y - 0.012], [x + 0.05, y + 0.016], [x - 0.09, y + 0.016]], F.chrome, 0.002);
  }
  sp.decor(kit);

  car.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return car;
}

/* -------------------------------------------------------------------------- */
/*                                   Stage                                    */
/* -------------------------------------------------------------------------- */

const ELEV = (30 * Math.PI) / 180;
const TARGET = new THREE.Vector3(0, 0.8, 0);

type Car = {
  key: number;
  rig: Rig;
  sim: Sim;
  obj: THREE.Group;
  wheels: THREE.Object3D[];
  tyres: THREE.Object3D[];
  coils: THREE.Object3D[];
  rods: THREE.Object3D[];
  top: number;
  wait: number;
  still: number;
  rest: boolean;
  /** Touched the floor at least once. */
  landed: boolean;
  /** Seconds left of the shrink-away when replaced mid-air (0 = not leaving). */
  pop: number;
};

const POP = 0.16;

type Ctx = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  mats: Mats;
  templates: Map<string, THREE.Group>;
  cars: Map<number, Car>;
};

function place(c: Car) {
  const { sim, rig } = c;
  c.obj.position.set(sim.x - rig.cx, sim.y, 0);
  c.obj.rotation.set(sim.r, 0, sim.p);
  for (let i = 0; i < 4; i++) {
    const s = sim.s[i];
    c.wheels[i].position.y = -s;
    const sy = Math.max(0.7, 1 - sim.pen[i] / rig.R);
    c.tyres[i].scale.set(1 + (1 - sy) * 0.6, sy, 1);
    c.coils[i].position.y = -s;
    c.coils[i].scale.y = Math.max(0.05, c.top + s);
    c.rods[i].position.y = 0.17 - s;
  }
}

function spawnCar(ctx: Ctx, item: CarItem, key: number): Car {
  const sp = SPECS[item.body];
  const color = item.color ?? sp.color;
  const id = `${item.body}:${color}`;
  let tpl = ctx.templates.get(id);
  if (!tpl) {
    tpl = buildCar(item.body, color, ctx.mats);
    ctx.templates.set(id, tpl);
  }
  const obj = tpl.clone();
  const find = (n: string) => [0, 1, 2, 3].map((i) => obj.getObjectByName(`${n}${i}`)!);
  const wheels = find("w");
  const rig = RIGS[item.body];
  const c: Car = {
    key,
    rig,
    sim: spawnSim(rig),
    obj,
    wheels,
    tyres: wheels.map((w) => w.getObjectByName("t")!),
    coils: find("k"),
    rods: find("d"),
    top: sp.ra - 0.05,
    wait: 0,
    still: 0,
    rest: false,
    landed: false,
    pop: 0,
  };
  ctx.scene.add(obj);
  ctx.cars.set(key, c);
  place(c);
  return c;
}

function removeCar(ctx: Ctx, c: Car) {
  ctx.scene.remove(c.obj);
  ctx.cars.delete(c.key);
}

/** Skip straight to the settled pose (reduced motion). */
function settle(c: Car) {
  const { sim, rig } = c;
  Object.assign(sim, { y: rig.R + 0.05, vy: 0, p: 0, vp: 0, r: 0, vr: 0 });
  for (let i = 0; i < 4; i++) {
    sim.w[i] = rig.R;
    sim.vw[i] = 0;
  }
  for (let t = 0; t < 8 && !(t > 1 && quiet(sim)); t += 0.1) advance(sim, rig, 0.1);
  c.rest = true;
  place(c);
}

function createStage(canvas: HTMLCanvasElement): Ctx {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

  // Toon bands: top faces lightest, the nose a step down, the near side darkest.
  scene.add(new THREE.AmbientLight("#ffffff", 0.36 * Math.PI));
  const sun = new THREE.DirectionalLight("#ffffff", 0.68 * Math.PI);
  sun.position.set(3.5, 10, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 });
  sun.shadow.radius = 1.5;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  return { renderer, scene, camera, mats: makeMats(), templates: new Map(), cars: new Map() };
}

/** Front-left three quarter, orthographic so it reads like an isometric drawing. */
function frame(ctx: Ctx, w: number, h: number) {
  ctx.renderer.setSize(w, h, false);
  const aspect = w / h;
  const hh = Math.max(3.05, 3.37 / aspect);
  const cam = ctx.camera;
  Object.assign(cam, { left: -hh * aspect, right: hh * aspect, top: hh, bottom: -hh });
  const d = 40;
  cam.position.set(
    TARGET.x + d * Math.cos(ELEV) * Math.SQRT1_2,
    TARGET.y + d * Math.sin(ELEV),
    TARGET.z - d * Math.cos(ELEV) * Math.SQRT1_2,
  );
  cam.lookAt(TARGET);
  cam.updateProjectionMatrix();
}

function disposeStage(ctx: Ctx) {
  const seen = new Set<{ dispose: () => void }>();
  for (const tpl of ctx.templates.values()) {
    tpl.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      for (const r of [m.geometry, ...(Array.isArray(m.material) ? m.material : [m.material])]) seen.add(r);
    });
  }
  for (const m of Object.values(ctx.mats.flat)) seen.add(m);
  seen.add(ctx.mats.ramp);
  for (const r of seen) r.dispose();
  ctx.renderer.dispose();
}

/* -------------------------------------------------------------------------- */
/*                                 Component                                  */
/* -------------------------------------------------------------------------- */

export function CarDropMenu({
  items = DEFAULT_CAR_ITEMS,
  defaultValue,
  value,
  onValueChange,
  className,
}: CarDropMenuProps) {
  const [inner, setInner] = React.useState(defaultValue ?? items[0]?.id);
  const selectedId = value ?? inner;
  const selected = items.find((i) => i.id === selectedId) ?? items[0];
  const reduce = useReducedMotion() ?? false;
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");

  const canvas = React.useRef(null as HTMLCanvasElement | null);
  const stage = React.useRef(null as Ctx | null);
  const raf = React.useRef(0);
  const nextKey = React.useRef(1);
  const shown = React.useRef(null as string | null);

  const loop = React.useCallback(() => {
    if (raf.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      const ctx = stage.current;
      if (!ctx) {
        raf.current = 0;
        return;
      }
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      let busy = false;
      for (const c of [...ctx.cars.values()]) {
        if (c.wait > 0) {
          c.wait -= dt;
          c.obj.visible = c.wait <= 0;
          busy = true;
          continue;
        }
        if (c.pop > 0) {
          c.pop -= dt;
          if (c.pop <= 0) removeCar(ctx, c);
          else c.obj.scale.setScalar(Math.pow(c.pop / POP, 1.5));
          busy = true;
          continue;
        }
        if (c.rest) continue;
        advance(c.sim, c.rig, dt);
        c.landed ||= c.sim.pen.some((p) => p > 0);
        if (c.sim.mode === "fall" && c.sim.y < -9) {
          removeCar(ctx, c);
          continue;
        }
        place(c);
        if (c.sim.mode === "drop") {
          c.still = quiet(c.sim) ? c.still + dt : 0;
          c.rest = c.still > 0.4;
        }
        busy = true;
      }
      ctx.renderer.render(ctx.scene, ctx.camera);
      raf.current = busy ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  // Stage setup.
  React.useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = createStage(el);
    stage.current = ctx;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (!width || !height) return;
      frame(ctx, width, height);
      ctx.renderer.render(ctx.scene, ctx.camera);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      stage.current = null;
      shown.current = null;
      disposeStage(ctx);
    };
  }, []);

  // Selection changed: the floor gives way under the current car, the newest choice always wins.
  React.useEffect(() => {
    const ctx = stage.current;
    if (!ctx || !selected) return;
    const live = [...ctx.cars.values()].some((c) => c.sim.mode !== "fall" && !c.pop);
    if (live && shown.current === selected.id) return;
    shown.current = selected.id;
    let falling = 0;
    for (const c of [...ctx.cars.values()]) {
      if (c.pop) continue;
      if (c.sim.mode === "fall") {
        falling++;
      } else if (c.wait > 0 || reduce) {
        removeCar(ctx, c); // never made it on stage, or no motion wanted
      } else if (!c.landed) {
        c.pop = POP; // still in the air: shrink away instead of crowding the next one
      } else {
        const s = c.sim;
        s.mode = "fall";
        s.vy = Math.min(s.vy, 0) - 2.5;
        s.vp += (Math.random() - 0.5) * 1.6;
        s.vr += (Math.random() - 0.5) * 1.0;
        s.vx = (Math.random() - 0.5) * 0.8;
        c.rest = false;
        falling++;
      }
    }
    const fallers = [...ctx.cars.values()].filter((c) => c.sim.mode === "fall");
    for (const c of fallers.slice(0, Math.max(0, fallers.length - 2))) removeCar(ctx, c);

    const car = spawnCar(ctx, selected, nextKey.current++);
    if (reduce) settle(car);
    else {
      car.wait = falling ? 0.14 : 0.05;
      car.obj.visible = false;
    }
    loop();
  }, [selected, reduce, loop]);

  return (
    <div className={className}>
      <canvas ref={canvas} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <p aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
        {selected ? `${selected.name}: ${selected.description ?? selected.subtitle ?? ""}` : ""}
      </p>
    </div>
  );
}

export default CarDropMenu;
