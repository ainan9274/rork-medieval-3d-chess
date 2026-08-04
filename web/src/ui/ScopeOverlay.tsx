import { useEffect, useRef, useState } from "react";

import type { ScopeState, ScreenPoint } from "../scene/sceneEngine";

/** How long the frame takes to open out again once the eye leaves the sights. */
const RELEASE_MS = 420;

/** How long the shot's own recoil owns the picture, tremor stood down. */
const RECOIL_MS = 300;

/** Widest the hands can wander at full tremor, in vmin. */
const TREMOR_REACH = 2.6;

/** Widest the picture can cant over at full tremor, in degrees. */
const TREMOR_ROLL = 0.9;

interface ScopeOverlayProps {
  /** The live sight picture, or null when nothing is sighted. */
  state: ScopeState | null;
  /** Reads where the sighted body sits on screen, 0..1 across the canvas. */
  track: (out: ScreenPoint) => boolean;
}

type Phase = "aim" | "fire" | "out";

/**
 * The marksman's sight picture.
 *
 * When the Empire's rifleman levels his piece the frame closes down onto the
 * body: the hall goes dark around a narrow tube, a brass reticle settles over
 * the target with the shooter's held breath moving under it, his hands wander
 * off the mark by an amount rolled for that shot, the shot throws the whole
 * picture off, and the frame opens out again as the lens pulls back. Nothing
 * here re-renders per frame — the reticle is walked across the screen and
 * shaken by writing custom properties straight onto the DOM, so the overlay
 * costs the animation loop nothing while a fight is running.
 */
export function ScopeOverlay({ state, track }: ScopeOverlayProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const eyeRef = useRef<HTMLDivElement | null>(null);
  const handRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);

  /** This shot's unsteadiness, held past the engine clearing the sight picture. */
  const tremorRef = useRef(0);
  /** How long the breath is meant to be held, so strain can be paced against it. */
  const holdRef = useRef(0.8);
  /** Rolled per sight picture so two shots never wander along the same path. */
  const seedRef = useRef(0);
  /** When the sights came up, and when the shot left; both `performance.now()`. */
  const aimedAtRef = useRef(0);
  const firedAtRef = useRef(0);

  // The engine only ever says "aim", "fire" or nothing; the release is ours.
  useEffect(() => {
    if (state) {
      if (state.phase === "aim") {
        tremorRef.current = state.tremor;
        holdRef.current = Math.max(0.25, state.hold);
        seedRef.current = Math.random() * 1000;
        aimedAtRef.current = performance.now();
        firedAtRef.current = 0;
      } else {
        tremorRef.current = state.tremor;
        firedAtRef.current = performance.now();
      }
      setPhase(state.phase);
      return;
    }
    // Never sighted in the first place: stay out of the tree entirely.
    setPhase((current) => (current === null ? null : "out"));
  }, [state]);

  // Unmount once the frame has finished opening out.
  useEffect(() => {
    if (phase !== "out") return;
    const timer = setTimeout(() => setPhase(null), RELEASE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // One loop drives both the tracking and the shake: keep the reticle on the
  // body while the lens is still punching in, and let the hands wander on it.
  useEffect(() => {
    if (phase === null) return;
    const point: ScreenPoint = { x: 0.5, y: 0.5 };
    const steady = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const follow = (now: number): void => {
      frame = requestAnimationFrame(follow);
      const eye = eyeRef.current;
      if (eye && track(point)) {
        // Clamped a little inside the bezel: a reticle half off screen reads as
        // a bug rather than as a target running out of the field of view.
        eye.style.setProperty("--scope-x", `${Math.min(0.92, Math.max(0.08, point.x)) * 100}%`);
        eye.style.setProperty("--scope-y", `${Math.min(0.9, Math.max(0.1, point.y)) * 100}%`);
      }

      const hand = handRef.current;
      if (!hand || steady) return;

      const t = (now - aimedAtRef.current) / 1000;
      const seed = seedRef.current;
      // The hands arrive unsettled, steady for a moment on the mark, then drift
      // worse and worse as the breath runs out — and stand down the instant the
      // shot goes, because from there the recoil owns the picture.
      const arrival = 1.35 - 0.55 * Math.min(1, t / 0.34);
      const strain = 0.55 + 0.85 * Math.min(1, t / holdRef.current) ** 1.7;
      const spent = firedAtRef.current === 0 ? 0 : Math.min(1, (now - firedAtRef.current) / RECOIL_MS);
      const amount = tremorRef.current * arrival * strain * (1 - spent);

      // Three incommensurable sines per axis: no repeat inside a held breath,
      // and no cost worth measuring next to a frame of the hall.
      const x =
        Math.sin(t * 6.7 + seed) * 0.52 + Math.sin(t * 12.9 + seed * 2.3) * 0.31 + Math.sin(t * 23.3 + seed * 0.7) * 0.17;
      const y =
        Math.cos(t * 5.3 + seed * 1.7) * 0.48 +
        Math.cos(t * 11.1 + seed * 3.1) * 0.33 +
        Math.cos(t * 19.7 + seed * 0.4) * 0.19;
      const roll = Math.sin(t * 4.1 + seed * 0.9) * 0.62 + Math.sin(t * 9.7 + seed * 2.9) * 0.38;

      hand.style.setProperty("--scope-hand-x", `${(x * amount * TREMOR_REACH).toFixed(3)}vmin`);
      hand.style.setProperty("--scope-hand-y", `${(y * amount * TREMOR_REACH).toFixed(3)}vmin`);
      hand.style.setProperty("--scope-hand-roll", `${(roll * amount * TREMOR_ROLL).toFixed(3)}deg`);
      // The breath under the reticle swells with the same unsteadiness, so a
      // long shot is visibly harder to hold than one at point-blank range.
      hand.style.setProperty("--scope-breath", (0.55 + amount * 0.9).toFixed(3));
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [phase, track]);

  if (phase === null) return null;

  return (
    <div ref={rootRef} className="mc-scope" data-phase={phase} aria-hidden="true">
      <div ref={eyeRef} className="mc-scope-eye">
        <div ref={handRef} className="mc-scope-hand">
          <div className="mc-scope-sway">
            <div className="mc-scope-iris" />
            <div className="mc-scope-ring" />
            <div className="mc-scope-wire" />
            <div className="mc-scope-post" />
            <div className="mc-scope-mil" />
            <div className="mc-scope-bead" />
          </div>
        </div>
      </div>
      <div className="mc-scope-flash" />
      <p className="mc-scope-caption mc-display">{phase === "fire" ? "FEU" : "EN JOUE"}</p>
    </div>
  );
}
