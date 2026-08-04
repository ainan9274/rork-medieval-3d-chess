import { useEffect, useRef, useState } from "react";

import type { ScopeState, ScreenPoint } from "../scene/sceneEngine";

/** How long the frame takes to open out again once the eye leaves the sights. */
const RELEASE_MS = 420;

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
 * the target with the shooter's held breath moving under it, the shot throws
 * the whole picture off the mark, and the frame opens out again as the lens
 * pulls back. Nothing here re-renders per frame — the reticle is walked across
 * the screen by writing two custom properties straight onto the DOM, so the
 * overlay costs the animation loop nothing while a fight is running.
 */
export function ScopeOverlay({ state, track }: ScopeOverlayProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const eyeRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);

  // The engine only ever says "aim", "fire" or nothing; the release is ours.
  useEffect(() => {
    if (state) {
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

  // Keep the reticle on the body while the lens is still punching in.
  useEffect(() => {
    if (phase === null) return;
    const point: ScreenPoint = { x: 0.5, y: 0.5 };
    let frame = 0;
    const follow = (): void => {
      frame = requestAnimationFrame(follow);
      const eye = eyeRef.current;
      if (!eye || !track(point)) return;
      // Clamped a little inside the bezel: a reticle half off screen reads as a
      // bug rather than as a target running out of the field of view.
      eye.style.setProperty("--scope-x", `${Math.min(0.92, Math.max(0.08, point.x)) * 100}%`);
      eye.style.setProperty("--scope-y", `${Math.min(0.9, Math.max(0.1, point.y)) * 100}%`);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [phase, track]);

  if (phase === null) return null;

  return (
    <div ref={rootRef} className="mc-scope" data-phase={phase} aria-hidden="true">
      <div ref={eyeRef} className="mc-scope-eye">
        <div className="mc-scope-sway">
          <div className="mc-scope-iris" />
          <div className="mc-scope-ring" />
          <div className="mc-scope-wire" />
          <div className="mc-scope-post" />
          <div className="mc-scope-mil" />
          <div className="mc-scope-bead" />
        </div>
      </div>
      <div className="mc-scope-flash" />
      <p className="mc-scope-caption mc-display">{phase === "fire" ? "FEU" : "EN JOUE"}</p>
    </div>
  );
}
