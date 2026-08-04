/**
 * Black powder: what a shot looks like when it leaves a barrel.
 *
 * The Grande Armée does not fight with witchfire. Its officers, its line
 * infantry and its batteries kill at range with a flash at the muzzle, a cloud
 * of dirty white smoke and a ball that crosses the board almost too fast to
 * follow. Everything here is additive billboards on the caller's tween clock —
 * built, animated and disposed inside one shot, so nothing needs a permanent
 * slot in the frame loop.
 *
 * Lights are always *borrowed* from the scene's shared pool, never created:
 * three.js keys its shader programs on the scene's light count, so adding one
 * mid-fight recompiles every material in the hall (see {@link SpellLightPool}).
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { Faction } from "../core/types";
import type { SpellLight } from "./spells";
import { fineSmokeTexture, muzzleFlashTexture, radialTexture, smokeTexture } from "./textures";

/** How one army's powder burns. Both sides use the same charge; only the
 * livery tint of the smoke differs, so a volley always reads as gunpowder
 * rather than as a spell. */
export interface GunLook {
  /** The flash at the bore. */
  flash: number;
  /** The ball in flight, seen as a hot streak. */
  ball: number;
  /** Powder smoke rolling off the barrel. */
  smoke: number;
  /** Colour the flash throws into the hall. */
  light: number;
}

export const GUN_LOOK: Record<Faction, GunLook> = {
  w: { flash: 0xfff6dd, ball: 0xffe6b4, smoke: 0xcfd4dc, light: 0xffd9a0 },
  b: { flash: 0xfff1c8, ball: 0xffcf82, smoke: 0xc8bfae, light: 0xffb45e },
};

/** The frame a normalised ball is authored in: nose along +Z. */
const FORWARD = new THREE.Vector3(0, 0, 1);

let flashMap: THREE.CanvasTexture | null = null;
let ballMap: THREE.CanvasTexture | null = null;
let puffMap: THREE.CanvasTexture | null = null;
let finePuffMap: THREE.CanvasTexture | null = null;

function sharedFlashMap(): THREE.CanvasTexture {
  if (!flashMap) flashMap = muzzleFlashTexture();
  return flashMap;
}

function sharedBallMap(): THREE.CanvasTexture {
  if (!ballMap) ballMap = radialTexture("rgba(255,255,255,1)", "rgba(255,190,110,0)");
  return ballMap;
}

function sharedPuffMap(): THREE.CanvasTexture {
  if (!puffMap) puffMap = smokeTexture();
  return puffMap;
}

/** The paler, threadier bloom a rifled barrel leaves. */
function sharedFinePuffMap(): THREE.CanvasTexture {
  if (!finePuffMap) finePuffMap = fineSmokeTexture();
  return finePuffMap;
}

// ---------------------------------------------------------------- the ball

/** Named model axes, as reported by the generator for every sculpt. */
type AxisName = "positiveX" | "negativeX" | "positiveY" | "negativeY" | "positiveZ" | "negativeZ";

const AXES: Record<AxisName, THREE.Vector3> = {
  positiveX: new THREE.Vector3(1, 0, 0),
  negativeX: new THREE.Vector3(-1, 0, 0),
  positiveY: new THREE.Vector3(0, 1, 0),
  negativeY: new THREE.Vector3(0, -1, 0),
  positiveZ: new THREE.Vector3(0, 0, 1),
  negativeZ: new THREE.Vector3(0, 0, -1),
};

/** The generated projectile sculpt and the axes it was authored along. */
export interface ShotModelSource {
  url: string;
  /**
   * Which way the nose of the ball points in the sculpt's own frame, when the
   * generator reported one. A cast ball is a body of revolution, so it usually
   * comes back *directionless* — leave this out and the long axis measured off
   * the mesh is used as the nose instead, which is what a bullet's shape means.
   */
  front?: AxisName;
  /** The sculpt's own up axis. Only meaningful together with `front`. */
  up?: AxisName;
}

/**
 * The cast ball itself, normalised once: nose down the flight line, centred on
 * its own middle, and one world unit long, so a shot only has to scale it by
 * its calibre. Null until the sculpt has been fetched (or if it never arrives —
 * every shot then falls back to the additive streak alone).
 */
let ballModel: THREE.Object3D | null = null;
let ballJob: Promise<void> | null = null;

function basis(front: THREE.Vector3, up: THREE.Vector3): THREE.Quaternion {
  const f = front.clone().normalize();
  const r = new THREE.Vector3().crossVectors(up, f).normalize();
  const u = new THREE.Vector3().crossVectors(f, r).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, u, f));
}

/**
 * The axis a sculpt is longest along, measured off its own bounds. For a cast
 * ball that is the nose-to-base line by definition, which is why a directionless
 * projectile can still be flown nose-first without guessing a yaw constant.
 */
function longestAxis(model: THREE.Object3D): THREE.Vector3 {
  const size = new THREE.Vector3();
  new THREE.Box3().setFromObject(model).getSize(size);
  if (size.x >= size.y && size.x >= size.z) return new THREE.Vector3(1, 0, 0);
  if (size.y >= size.z) return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

/** Any unit vector square to the given one — enough to complete a basis. */
function perpendicular(axis: THREE.Vector3): THREE.Vector3 {
  return Math.abs(axis.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
}

/**
 * Fetches the generated ball and prepares it for flight. Called once when the
 * hall is built; failures are swallowed on purpose — a missing sculpt must never
 * cost the army its gunfire.
 */
export function primeShotModel(source: ShotModelSource): Promise<void> {
  if (ballJob) return ballJob;
  ballJob = (async () => {
    try {
      const gltf = await new GLTFLoader().loadAsync(source.url);
      // Rotate the sculpt's own frame onto "nose along +Z, up along +Y", which is
      // the frame a shot orients along its line of travel. A directionless ball
      // has no reported front, so its own longest extent is taken as the nose.
      const oriented = new THREE.Group();
      const front = source.front ? AXES[source.front] : longestAxis(gltf.scene);
      const up = source.up ? AXES[source.up] : perpendicular(front);
      const correction = basis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0))
        .multiply(basis(front, up).invert());
      gltf.scene.quaternion.copy(correction);
      oriented.add(gltf.scene);

      // One unit from nose to base, centred on its own middle.
      const box = new THREE.Box3().setFromObject(oriented);
      const size = new THREE.Vector3();
      const centre = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(centre);
      const length = Math.max(1e-4, size.z);
      gltf.scene.position.sub(centre);
      oriented.scale.setScalar(1 / length);

      oriented.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        // A ball in flight is a handful of pixels crossing the screen in a tenth
        // of a second; culling it by a stale bounding sphere makes it blink.
        mesh.frustumCulled = false;
      });
      ballModel = oriented;
    } catch (error) {
      console.warn("[gunfire] ball sculpt unavailable", error);
    }
  })();
  return ballJob;
}

/** Frees the shared maps (scene teardown). */
export function disposeGunAssets(): void {
  flashMap?.dispose();
  ballMap?.dispose();
  puffMap?.dispose();
  finePuffMap?.dispose();
  flashMap = null;
  ballMap = null;
  puffMap = null;
  finePuffMap = null;
}

export interface MuzzleFlashOptions {
  look: GunLook;
  /** Width of the flash in world units — a pistol is a quarter of a field gun. */
  size: number;
  /** Where the barrel is pointing, so the flame leans out of the bore. */
  direction: THREE.Vector3;
  /** How long the flame is on screen. Powder burns for a frame or three. */
  life?: number;
  /** A slot borrowed from the scene's light pool, or null to fire unlit. */
  light?: SpellLight | null;
}

/**
 * The flash: a star of burning powder at the bore with a second, wider bloom
 * pushed a little way down the barrel line, so the flame reads as leaving the
 * gun rather than sitting on it. Snaps to full brightness on the first frame
 * and falls off fast — a slow muzzle flash always looks like a spell.
 */
export async function spawnMuzzleFlash(
  scene: THREE.Object3D,
  tweens: { to: (spec: { duration: number; easing: (t: number) => number; onUpdate: (t: number) => void }) => Promise<void> },
  at: THREE.Vector3,
  options: MuzzleFlashOptions,
): Promise<void> {
  const life = options.life ?? 0.11;
  const group = new THREE.Group();
  group.name = "muzzle_flash";
  group.position.copy(at);
  scene.add(group);

  const star = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sharedFlashMap(),
      color: options.look.flash,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 1,
      rotation: Math.random() * Math.PI,
    }),
  );
  star.scale.setScalar(options.size);
  star.renderOrder = 8;
  star.frustumCulled = false;

  // The second bloom sits a barrel's width forward along the line of fire.
  const lead = new THREE.Sprite((star.material as THREE.SpriteMaterial).clone());
  (lead.material as THREE.SpriteMaterial).color.setHex(options.look.ball);
  lead.position.copy(options.direction).multiplyScalar(options.size * 0.34);
  lead.scale.setScalar(options.size * 0.62);
  lead.renderOrder = 9;
  lead.frustumCulled = false;
  group.add(star, lead);

  const starMaterial = star.material as THREE.SpriteMaterial;
  const leadMaterial = lead.material as THREE.SpriteMaterial;

  try {
    await tweens.to({
      duration: life,
      easing: (t: number) => t,
      onUpdate: (t: number) => {
        // Blooms open, then are gone: brightness falls off much faster than size.
        const fade = Math.pow(1 - t, 2.1);
        starMaterial.opacity = fade;
        leadMaterial.opacity = fade * 0.85;
        star.scale.setScalar(options.size * (1 + t * 0.5));
        lead.scale.setScalar(options.size * (0.62 + t * 0.7));
        starMaterial.rotation += 0.12;
        options.light?.set(group.position, fade * 22 * options.size);
      },
    });
  } finally {
    options.light?.release();
    starMaterial.dispose();
    leadMaterial.dispose();
    group.removeFromParent();
    group.clear();
  }
}

/**
 * One shot in flight: a hot streak of a ball, stretched along its own line of
 * travel so it reads at any frame rate. It lives in world space and is placed
 * by {@link flyShot} every frame.
 */
class Shot {
  readonly group = new THREE.Group();
  private readonly core: THREE.Sprite;
  private readonly trail: THREE.Sprite;
  private readonly light: SpellLight | null;
  /** The cast ball itself, when the sculpt is in hand. */
  private readonly ball: THREE.Object3D | null;
  /** Rifling: the ball turns on its own axis all the way to the body. */
  private readonly spin = (Math.random() > 0.5 ? 1 : -1) * (26 + Math.random() * 16);

  constructor(look: GunLook, size: number, light: SpellLight | null) {
    this.light = light;
    this.group.name = "shot";
    this.ball = ballModel ? ballModel.clone(true) : null;
    if (this.ball) {
      // A cast ball is longer than it is wide; scale by its length.
      this.ball.scale.setScalar(size * 2.3);
      this.group.add(this.ball);
    }
    this.trail = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedBallMap(),
        color: look.smoke,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.4,
      }),
    );
    this.core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sharedBallMap(),
        color: look.ball,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.95,
      }),
    );
    // With a real ball in frame the streak is only the heat around it.
    this.trail.scale.set(size * 3.4, size * 0.9, 1);
    this.core.scale.setScalar(this.ball ? size * 0.7 : size);
    this.trail.renderOrder = 6;
    this.core.renderOrder = 7;
    this.trail.frustumCulled = false;
    this.core.frustumCulled = false;
    this.group.add(this.trail, this.core);
  }

  place(at: THREE.Vector3, intensity: number): void {
    this.group.position.copy(at);
    (this.core.material as THREE.SpriteMaterial).opacity = (this.ball ? 0.6 : 0.95) * intensity;
    (this.trail.material as THREE.SpriteMaterial).opacity = 0.4 * intensity;
    this.light?.set(at, intensity * 4);
  }

  /** Points the ball down its line of travel and rolls it as it goes. */
  aimAlong(direction: THREE.Vector3, travelled: number): void {
    const ball = this.ball;
    if (!ball) return;
    ball.quaternion.setFromUnitVectors(FORWARD, direction);
    ball.rotateZ(travelled * this.spin);
  }

  dispose(): void {
    this.light?.release();
    (this.core.material as THREE.Material).dispose();
    (this.trail.material as THREE.Material).dispose();
    this.group.removeFromParent();
    this.group.clear();
  }
}

export interface ShotOptions {
  look: GunLook;
  /** Diameter of the ball in world units. */
  size: number;
  /** Seconds of flight. A ball is fast: keep this short. */
  flight: number;
  /** A slot borrowed from the scene's light pool, or null. */
  light?: SpellLight | null;
  /** Called with the ball's position every frame, for the smoke it leaves. */
  onTrail?: (at: THREE.Vector3, t: number) => void;
}

/**
 * Sends a ball from a muzzle to a body: dead straight, no arc, no easing. Round
 * shot travels flat over a chessboard's worth of distance, and the flatness is
 * what tells the eye this is a gun rather than a lobbed spell.
 */
export async function flyShot(
  scene: THREE.Object3D,
  tweens: { to: (spec: { duration: number; easing: (t: number) => number; onUpdate: (t: number) => void }) => Promise<void> },
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: ShotOptions,
): Promise<void> {
  const shot = new Shot(options.look, options.size, options.light ?? null);
  const heading = to.clone().sub(from);
  const distance = Math.max(1e-4, heading.length());
  heading.divideScalar(distance);
  shot.place(from, 1);
  shot.aimAlong(heading, 0);
  scene.add(shot.group);
  const at = new THREE.Vector3();
  try {
    await tweens.to({
      duration: options.flight,
      easing: (t: number) => t,
      onUpdate: (t: number) => {
        at.lerpVectors(from, to, t);
        shot.place(at, 1);
        shot.aimAlong(heading, t * distance);
        options.onTrail?.(at, t);
      },
    });
  } finally {
    shot.dispose();
  }
}

export interface PowderCloudOptions {
  look: GunLook;
  /** Width of the cloud in world units. */
  size: number;
  /** Direction the smoke is pushed, i.e. the line of fire. */
  direction: THREE.Vector3;
  /** How many puffs make up the bank. */
  count: number;
  life?: number;
  /**
   * Overrides the faction tint. A rifled bore burns a small, tight-patched
   * charge almost completely, so its bank is a pale ash grey rather than the
   * soot of a smoothbore volley.
   */
  tint?: number;
  /** How thick the bank reads. 1 = a musket; below that you see through it. */
  density?: number;
  /**
   * Fine-grain powder: swaps in the paler, threadier map, keeps the bank tight
   * to the barrel line, lifts it faster and tears it apart sooner.
   */
  fine?: boolean;
}

/**
 * The bank of smoke a black-powder charge leaves hanging in front of the gun:
 * a handful of puffs shoved out along the barrel line, spreading, rising and
 * thinning. This is the signature of the whole army — the hall should be dirty
 * with it a second after a volley.
 */
export async function spawnPowderCloud(
  scene: THREE.Object3D,
  tweens: { to: (spec: { duration: number; easing: (t: number) => number; onUpdate: (t: number) => void }) => Promise<void> },
  at: THREE.Vector3,
  options: PowderCloudOptions,
): Promise<void> {
  const life = options.life ?? 1.5;
  const fine = options.fine === true;
  const tint = options.tint ?? options.look.smoke;
  const density = options.density ?? 1;
  const group = new THREE.Group();
  group.name = "powder_cloud";
  group.position.copy(at);
  scene.add(group);

  const puffs: { sprite: THREE.Sprite; drift: THREE.Vector3; scale: number; spin: number }[] = [];
  const side = new THREE.Vector3(0, 1, 0).cross(options.direction).normalize();
  for (let i = 0; i < options.count; i += 1) {
    const material = new THREE.SpriteMaterial({
      map: fine ? sharedFinePuffMap() : sharedPuffMap(),
      color: tint,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      rotation: Math.random() * Math.PI * 2,
    });
    const sprite = new THREE.Sprite(material);
    const scale = options.size * (fine ? 0.4 + Math.random() * 0.42 : 0.55 + Math.random() * 0.6);
    sprite.scale.setScalar(scale * 0.4);
    sprite.renderOrder = 5;
    sprite.frustumCulled = false;
    group.add(sprite);
    puffs.push({
      sprite,
      // Blown forward down the line of fire, with a little spread either side.
      drift: options.direction
        .clone()
        .multiplyScalar(options.size * (fine ? 0.34 + Math.random() * 0.6 : 0.5 + Math.random() * 0.9))
        .addScaledVector(side, (Math.random() - 0.5) * options.size * (fine ? 0.5 : 0.9))
        // Thin smoke has nothing to hang on: it lifts instead of sitting there.
        .setY(options.size * (fine ? 0.3 + Math.random() * 0.44 : 0.14 + Math.random() * 0.3)),
      scale,
      spin: (Math.random() - 0.5) * (fine ? 1.4 : 0.9),
    });
  }

  try {
    await tweens.to({
      duration: life,
      easing: (t: number) => t,
      onUpdate: (t: number) => {
        // Fast bloom, long dirty fade — powder smoke outlives the flash by far.
        // Fine powder thins out on a steeper curve: it is gone while a musket's
        // bank is still lying across the board.
        const bloom = Math.min(1, t / (fine ? 0.08 : 0.12));
        const fade = Math.pow(1 - t, fine ? 2.3 : 1.5);
        const peak = (fine ? 0.3 : 0.5) * density;
        const growth = fine ? 2.1 : 1.5;
        for (const puff of puffs) {
          const material = puff.sprite.material as THREE.SpriteMaterial;
          material.opacity = peak * bloom * fade;
          material.rotation += puff.spin * 0.016;
          puff.sprite.scale.setScalar(puff.scale * (0.4 + t * growth));
          puff.sprite.position.copy(puff.drift).multiplyScalar(t);
        }
      },
    });
  } finally {
    for (const puff of puffs) (puff.sprite.material as THREE.Material).dispose();
    group.removeFromParent();
    group.clear();
  }
}
