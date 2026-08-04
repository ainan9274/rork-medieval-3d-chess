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

import type { Faction } from "../core/types";
import type { SpellLight } from "./spells";
import { muzzleFlashTexture, radialTexture, smokeTexture } from "./textures";

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

let flashMap: THREE.CanvasTexture | null = null;
let ballMap: THREE.CanvasTexture | null = null;
let puffMap: THREE.CanvasTexture | null = null;

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

/** Frees the shared maps (scene teardown). */
export function disposeGunAssets(): void {
  flashMap?.dispose();
  ballMap?.dispose();
  puffMap?.dispose();
  flashMap = null;
  ballMap = null;
  puffMap = null;
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

  constructor(look: GunLook, size: number, light: SpellLight | null) {
    this.light = light;
    this.group.name = "shot";
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
    this.trail.scale.set(size * 3.4, size * 0.9, 1);
    this.core.scale.setScalar(size);
    this.trail.renderOrder = 6;
    this.core.renderOrder = 7;
    this.trail.frustumCulled = false;
    this.core.frustumCulled = false;
    this.group.add(this.trail, this.core);
  }

  place(at: THREE.Vector3, intensity: number): void {
    this.group.position.copy(at);
    (this.core.material as THREE.SpriteMaterial).opacity = 0.95 * intensity;
    (this.trail.material as THREE.SpriteMaterial).opacity = 0.4 * intensity;
    this.light?.set(at, intensity * 4);
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
  shot.place(from, 1);
  scene.add(shot.group);
  const at = new THREE.Vector3();
  try {
    await tweens.to({
      duration: options.flight,
      easing: (t: number) => t,
      onUpdate: (t: number) => {
        at.lerpVectors(from, to, t);
        shot.place(at, 1);
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
  const group = new THREE.Group();
  group.name = "powder_cloud";
  group.position.copy(at);
  scene.add(group);

  const puffs: { sprite: THREE.Sprite; drift: THREE.Vector3; scale: number; spin: number }[] = [];
  const side = new THREE.Vector3(0, 1, 0).cross(options.direction).normalize();
  for (let i = 0; i < options.count; i += 1) {
    const material = new THREE.SpriteMaterial({
      map: sharedPuffMap(),
      color: options.look.smoke,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      rotation: Math.random() * Math.PI * 2,
    });
    const sprite = new THREE.Sprite(material);
    const scale = options.size * (0.55 + Math.random() * 0.6);
    sprite.scale.setScalar(scale * 0.4);
    sprite.renderOrder = 5;
    sprite.frustumCulled = false;
    group.add(sprite);
    puffs.push({
      sprite,
      // Blown forward down the line of fire, with a little spread either side.
      drift: options.direction
        .clone()
        .multiplyScalar(options.size * (0.5 + Math.random() * 0.9))
        .addScaledVector(side, (Math.random() - 0.5) * options.size * 0.9)
        .setY(options.size * (0.14 + Math.random() * 0.3)),
      scale,
      spin: (Math.random() - 0.5) * 0.9,
    });
  }

  try {
    await tweens.to({
      duration: life,
      easing: (t: number) => t,
      onUpdate: (t: number) => {
        // Fast bloom, long dirty fade — powder smoke outlives the flash by far.
        const bloom = Math.min(1, t / 0.12);
        const fade = Math.pow(1 - t, 1.5);
        for (const puff of puffs) {
          const material = puff.sprite.material as THREE.SpriteMaterial;
          material.opacity = 0.5 * bloom * fade;
          material.rotation += puff.spin * 0.016;
          puff.sprite.scale.setScalar(puff.scale * (0.4 + t * 1.5));
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
