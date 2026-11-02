// Spring-based motion, per the project's "Vidrio" interaction direction:
// gesture-driven elements (the mobile nav drawer) animate with a physical
// spring instead of a fixed-duration CSS transition, so they can be grabbed
// and reversed mid-flight and inherit the velocity of the gesture that
// released them. Parameterized like Apple's UIKit springs — damping ratio
// (1.0 = no overshoot) + response (seconds to reach the target) — rather
// than raw stiffness/damping, which are harder to tune by feel.

export interface SpringOptions {
  damping?: number; // 1.0 = critically damped (no overshoot), <1 adds bounce
  response?: number; // seconds; lower = snappier
  velocity?: number; // px/s handed off from a gesture release
  onDone?: () => void;
}

export interface SpringHandle {
  goTo: (target: number, opts?: SpringOptions) => void;
  jumpTo: (value: number) => void;
  setPosition: (value: number) => void;
  getPosition: () => number;
  stop: () => void;
  isRunning: () => boolean;
}

export function createSpring(apply: (value: number) => void): SpringHandle {
  let pos = 0;
  let vel = 0;
  let target = 0;
  let k = 0;
  let c = 0;
  let raf: number | null = null;
  let onDone: (() => void) | null = null;

  function step() {
    const dt = 1 / 60;
    const accel = -k * (pos - target) - c * vel;
    vel += accel * dt;
    pos += vel * dt;
    apply(pos);
    if (Math.abs(vel) < 0.4 && Math.abs(pos - target) < 0.4) {
      pos = target;
      apply(pos);
      raf = null;
      const cb = onDone;
      onDone = null;
      cb?.();
      return;
    }
    raf = requestAnimationFrame(step);
  }

  return {
    goTo(t, opts = {}) {
      const dampingRatio = opts.damping ?? 1;
      const response = opts.response ?? 0.35;
      const angFreq = (2 * Math.PI) / response;
      k = angFreq * angFreq;
      c = 2 * dampingRatio * angFreq;
      target = t;
      if (opts.velocity != null) vel = opts.velocity;
      onDone = opts.onDone ?? null;
      if (raf != null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(step);
    },
    jumpTo(t) {
      pos = t;
      vel = 0;
      target = t;
      apply(pos);
      if (raf != null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    },
    setPosition(p) {
      pos = p;
    },
    getPosition() {
      return pos;
    },
    stop() {
      if (raf != null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    },
    isRunning() {
      return raf !== null;
    },
  };
}

// Progressive resistance past a boundary — a soft edge instead of a hard stop.
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// Where a flick would coast to a stop, exponential-decay scroll projection
// (not the v^2/2a textbook form) — this is what makes a flick feel thrown.
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
