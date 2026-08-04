/**
 * Sculpted arms: the Grande Armée's weapons as real generated meshes.
 *
 * Every other army is armed from primitives in `scene/weapons.ts`, which is the
 * right answer for a fantasy blade nobody can check. It is the wrong answer for
 * 1800: a Charleville musket, an An XI cuirassier sword and a flintlock pistol
 * are *documented objects*, and a box-and-cylinder approximation of one reads as
 * a toy. The Napoleonic arms are therefore generated sculpts, and this module is
 * what makes a downloaded mesh usable as a hand prop.
 *
 * The hard part is not loading it — it is that a generated weapon arrives in an
 * arbitrary pose. Meshy hands back a sword lying along the diagonal of its own
 * bounding box (the cuirassier sword measures 0.97 x 1.00 x 0.96), so nothing
 * about the file says which way the blade runs, which end is the point, or which
 * side the trigger guard is on. Rather than eyeball a rotation per model, every
 * sculpt is *measured* and fitted into the same local frame the procedural props
 * are authored in — length up +Y, butt at the origin, the lock plane on ±Z:
 *
 *  1. **Long axis** from the principal axes of the vertex cloud, so a diagonal
 *     model is handled exactly like an axis-aligned one.
 *  2. **Which end is the point** from the cross-section at each end: a muzzle, a
 *     bayonet tip and a blade point are all thin, a butt plate and a sword hilt
 *     are all fat. The Marengo sword arrives hilt-last and the pistol
 *     muzzle-first; neither needs a special case.
 *  3. **Roll** from the remaining two principal axes. A blade's flat lies across
 *     the swing (±X, as {@link curvedBlade} authors it); a firearm's lock plane
 *     stands in the barrel's own plane (±Z), with the trigger-guard side found
 *     by asking which side of the mass the *barrel* sits on — the stock, lock
 *     and guard all hang below the bore, so the thin end's centroid points at
 *     the top of the gun.
 *
 * Only the fist and the muzzle are authored by hand (as fractions of the
 * weapon's length), because no measurement finds a trigger. Both were read off
 * the cross-section profile of each sculpt and cross-check against the
 * hand-built props they replace to within a couple of percent.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { ARM_SCULPTS } from "../assets/generated";
import type { Faction } from "../core/types";
import { loadGltf } from "./gltfQueue";
import type { WeaponId } from "./weapons";

/** How a sculpt's cross-section maps onto the prop's own axes. */
export type ArmFamily =
  /** Edged: the flat of the blade lies across the swing. */
  | "blade"
  /** Barrelled: the lock, butt and trigger guard stand in the barrel's plane. */
  | "firearm";

export interface ArmSculptSource {
  /** Generated GLB. */
  url: string;
  /** Butt-to-point length, in figure heights — the size the sculpt is fitted to. */
  length: number;
  /**
   * Where the fist closes, as a fraction of {@link length} measured up from the
   * butt. Read off the sculpt's cross-section profile: for a long arm the wrist
   * of the stock behind the lock, for a blade the middle of the grip between
   * pommel and guard.
   */
  grip: number;
  /**
   * Barrel mouth, same units as {@link grip}. Omitted for edged weapons. On the
   * musket this is the bayonet *socket*, not the bayonet point — the flame has
   * to leave the bore, not the blade beyond it.
   */
  muzzle?: number;
  family: ArmFamily;
}

/** A sculpt fitted into the prop frame, ready to be cloned into a fist. */
export interface ArmSculpt {
  /** Prepared group: butt at the origin, length up +Y, transform already baked. */
  group: THREE.Group;
  /** Fist height in the prop's own coordinates. */
  grip: number;
  /** Muzzle height in the prop's own coordinates, or null for a blade. */
  muzzle: number | null;
}

/** One figure's copy of a sculpt — shared geometry, its own materials. */
export interface ArmInstance {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  materials: THREE.MeshStandardMaterial[];
}

/**
 * Resting emissive of a sculpted arm. Weapons are lit by the hall, not by
 * themselves, so this is only high enough to give the selection highlight in
 * `PieceView.update` something to lift.
 */
const RESTING_EMISSIVE = 0.12;

/** Army tint the highlight glows in, matching the figures' own livery. */
const LIVERY: Record<Faction, number> = { w: 0x223d75, b: 0x611710 };

const loader = new GLTFLoader();
const templates = new Map<WeaponId, ArmSculpt>();
const jobs = new Map<WeaponId, Promise<void>>();

/** The sculpt for a weapon, or null while it is still downloading (or absent). */
export function armSculpt(id: WeaponId): ArmSculpt | null {
  return templates.get(id) ?? null;
}

/** Whether this weapon has a sculpt at all, downloaded or not. */
export function hasArmSculpt(id: WeaponId): boolean {
  return ARM_SCULPTS[id] !== undefined;
}

/**
 * Downloads and fits one sculpt. Never throws and never runs twice for the same
 * weapon: a failure leaves {@link armSculpt} null, and the figure is armed from
 * primitives instead — a plain musket beats an unarmed soldier.
 */
export function warmArmSculpt(id: WeaponId): Promise<void> {
  const running = jobs.get(id);
  if (running) return running;
  const source = ARM_SCULPTS[id];
  if (!source) return Promise.resolve();

  const job = (async () => {
    try {
      const gltf = await loadGltf(loader, source.url, 3);
      templates.set(id, fitArmSculpt(gltf.scene, source));
    } catch (error) {
      console.warn(`[armoury] no sculpt for "${id}", falling back to primitives`, error);
    }
  })();
  jobs.set(id, job);
  return job;
}

/**
 * A figure's own copy. Geometry and textures are shared with every other figure
 * carrying the same weapon; the materials are cloned because the highlight, the
 * fade and the dissolve all write into them per figure.
 */
export function instanceArmSculpt(id: WeaponId, color: Faction): ArmInstance | null {
  const template = templates.get(id);
  if (!template) return null;

  const group = template.group.clone(true);
  const instance: ArmInstance = { group, meshes: [], materials: [] };
  group.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.material as THREE.MeshStandardMaterial;
    const material = source.clone();
    material.emissive = new THREE.Color(LIVERY[color]);
    material.emissiveIntensity = RESTING_EMISSIVE;
    material.envMapIntensity = 1.15;
    mesh.material = material;
    instance.meshes.push(mesh);
    instance.materials.push(material);
  });
  return instance;
}

/** Resting emissive every sculpted material is handed out at. */
export function armSculptEmissive(): number {
  return RESTING_EMISSIVE;
}

// ---------------------------------------------------------------- measurement

/** Every vertex of `object`, in `object`'s own frame. */
function collectVertices(object: THREE.Object3D): THREE.Vector3[] {
  object.updateMatrixWorld(true);
  const rootInverse = object.matrixWorld.clone().invert();
  const toRoot = new THREE.Matrix4();
  const points: THREE.Vector3[] = [];
  object.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const position = mesh.geometry.getAttribute("position");
    if (!position) return;
    toRoot.multiplyMatrices(rootInverse, mesh.matrixWorld);
    for (let index = 0; index < position.count; index += 1) {
      points.push(new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(toRoot));
    }
  });
  return points;
}

/**
 * Diagonalises a symmetric 3x3 by Jacobi rotations.
 *
 * @param m upper triangle as [xx, xy, xz, yy, yz, zz]
 * @returns eigenvalues and their eigenvectors as matrix columns
 */
function jacobiEigen(m: number[]): { values: number[]; vectors: number[][] } {
  const a = [
    [m[0], m[1], m[2]],
    [m[1], m[3], m[4]],
    [m[2], m[4], m[5]],
  ];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const offDiagonal: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  for (let sweep = 0; sweep < 32; sweep += 1) {
    let p = 0;
    let q = 1;
    let largest = 0;
    for (const [i, j] of offDiagonal) {
      if (Math.abs(a[i][j]) > largest) {
        largest = Math.abs(a[i][j]);
        p = i;
        q = j;
      }
    }
    if (largest < 1e-14) break;
    const theta = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    // A <- A J, then A <- J^T A, then V <- V J.
    for (let k = 0; k < 3; k += 1) {
      const ap = a[k][p];
      const aq = a[k][q];
      a[k][p] = c * ap - s * aq;
      a[k][q] = s * ap + c * aq;
    }
    for (let k = 0; k < 3; k += 1) {
      const ap = a[p][k];
      const aq = a[q][k];
      a[p][k] = c * ap - s * aq;
      a[q][k] = s * ap + c * aq;
    }
    for (let k = 0; k < 3; k += 1) {
      const vp = v[k][p];
      const vq = v[k][q];
      v[k][p] = c * vp - s * vq;
      v[k][q] = s * vp + c * vq;
    }
  }
  return { values: [a[0][0], a[1][1], a[2][2]], vectors: v };
}

/**
 * Principal axes of a point cloud, longest spread first.
 *
 * A bounding box cannot answer this: a sword lying along the diagonal of its own
 * box has three near-equal extents and no long side at all.
 */
function principalAxes(points: THREE.Vector3[], centre: THREE.Vector3): THREE.Vector3[] {
  let xx = 0;
  let xy = 0;
  let xz = 0;
  let yy = 0;
  let yz = 0;
  let zz = 0;
  const delta = new THREE.Vector3();
  for (const point of points) {
    delta.copy(point).sub(centre);
    xx += delta.x * delta.x;
    xy += delta.x * delta.y;
    xz += delta.x * delta.z;
    yy += delta.y * delta.y;
    yz += delta.y * delta.z;
    zz += delta.z * delta.z;
  }
  const scale = 1 / Math.max(1, points.length);
  const { values, vectors } = jacobiEigen([xx, xy, xz, yy, yz, zz].map((entry) => entry * scale));
  return values
    .map((value, index) => ({
      value,
      axis: new THREE.Vector3(vectors[0][index], vectors[1][index], vectors[2][index]).normalize(),
    }))
    .sort((first, second) => second.value - first.value)
    .map((entry) => entry.axis);
}

/** Cross-section span of each slice along the weapon, butt-end first. */
function crossSectionProfile(
  projected: { long: number; broad: number; narrow: number }[],
  min: number,
  span: number,
  slices: number,
): number[] {
  const bounds = Array.from({ length: slices }, () => ({
    broad: [Infinity, -Infinity],
    narrow: [Infinity, -Infinity],
  }));
  for (const point of projected) {
    const slot = bounds[Math.min(slices - 1, Math.max(0, Math.floor(((point.long - min) / span) * slices)))];
    slot.broad[0] = Math.min(slot.broad[0], point.broad);
    slot.broad[1] = Math.max(slot.broad[1], point.broad);
    slot.narrow[0] = Math.min(slot.narrow[0], point.narrow);
    slot.narrow[1] = Math.max(slot.narrow[1], point.narrow);
  }
  return bounds.map((slot) =>
    Number.isFinite(slot.broad[0])
      ? Math.max(slot.broad[1] - slot.broad[0], slot.narrow[1] - slot.narrow[0])
      : 0,
  );
}

const SLICES = 18;
/** Slices at each end compared to decide which one is the point. */
const END_SLICES = 3;

/**
 * Fits a generated weapon into the prop frame the hand props are authored in:
 * butt at the origin, length running up +Y, scaled to `source.length`.
 *
 * Exported for the unit test, which feeds it a weapon built from primitives at a
 * known pose and checks it comes back the right way up.
 */
export function fitArmSculpt(scene: THREE.Object3D, source: ArmSculptSource): ArmSculpt {
  const group = new THREE.Group();
  group.name = "sculpt";
  group.add(scene);

  const points = collectVertices(group);
  if (points.length === 0) throw new Error("sculpt has no geometry");

  const centre = points
    .reduce((sum, point) => sum.add(point), new THREE.Vector3())
    .multiplyScalar(1 / points.length);
  const [longAxis, broadAxis, narrowAxis] = principalAxes(points, centre);

  const delta = new THREE.Vector3();
  const projected = points.map((point) => {
    delta.copy(point).sub(centre);
    return { long: delta.dot(longAxis), broad: delta.dot(broadAxis), narrow: delta.dot(narrowAxis) };
  });
  let min = Infinity;
  let max = -Infinity;
  for (const point of projected) {
    min = Math.min(min, point.long);
    max = Math.max(max, point.long);
  }
  const span = Math.max(1e-6, max - min);

  // Which end is the point: the thin one. A muzzle, a bayonet and a blade tip
  // all taper; a butt plate, a bowl guard and a pistol butt do not.
  const profile = crossSectionProfile(projected, min, span, SLICES);
  const mean = (values: number[]): number =>
    values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const lowEnd = mean(profile.slice(0, END_SLICES));
  const highEnd = mean(profile.slice(-END_SLICES));
  // +1 when the far end of the long axis is the point, -1 when it is the butt.
  const towardPoint = highEnd <= lowEnd ? 1 : -1;

  const up = longAxis.clone().multiplyScalar(towardPoint);
  let front: THREE.Vector3;
  if (source.family === "firearm") {
    // The barrel is the thin end, and the stock, lock and trigger guard all hang
    // below the bore — so the thin end's own centroid points at the *top* of the
    // gun, and the trigger guard is the other way.
    let barrelBroad = 0;
    let barrelCount = 0;
    for (const point of projected) {
      const fromPoint = towardPoint > 0 ? max - point.long : point.long - min;
      if (fromPoint > span / 3) continue;
      barrelBroad += point.broad;
      barrelCount += 1;
    }
    const barrelSide = barrelCount > 0 && barrelBroad < 0 ? -1 : 1;
    front = broadAxis.clone().multiplyScalar(-barrelSide);
  } else {
    // A blade keeps its flat across the swing, so the thin cross-axis is the one
    // that faces the figure's front.
    front = narrowAxis.clone();
  }
  const lateral = new THREE.Vector3().crossVectors(up, front).normalize();

  const basis = new THREE.Matrix4().makeBasis(lateral, up, front);
  // The basis maps prop axes onto model axes; the prop needs the other direction.
  const rotation = new THREE.Quaternion().setFromRotationMatrix(basis).invert();
  const scale = source.length / span;

  // Butt on the origin. X/Z need no centring: the cloud was rotated about its
  // own centroid, so the weapon already stands on its own axis.
  let lowest = Infinity;
  for (const point of points) {
    lowest = Math.min(lowest, delta.copy(point).sub(centre).applyQuaternion(rotation).y * scale);
  }

  group.quaternion.copy(rotation);
  group.scale.setScalar(scale);
  group.position.copy(centre).negate().applyQuaternion(rotation).multiplyScalar(scale);
  group.position.y -= lowest;

  group.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Props hang off hand bones: their bind-pose bounds say nothing about where
    // they are once the arms swing.
    mesh.frustumCulled = false;
  });

  return {
    group,
    grip: source.grip * source.length,
    muzzle: source.muzzle === undefined ? null : source.muzzle * source.length,
  };
}
