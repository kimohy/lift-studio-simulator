export const ESCALATOR_STOPS = Object.freeze([0, 1, 2, 3, 4, 5, 7, 9, 11, 13]);

export const ESCALATOR = {
  start: -25,
  end: -37,
  up: [17.85, 19.25],
  down: [20.75, 22.15],
  height: 3.5,
  mallHeight: 7.0,
  run: 12,
  speed: 0.72,
};

export function escalatorLayout(f) {
  let idx = ESCALATOR_STOPS.indexOf(f);
  if (idx === -1) {
    idx = 0;
    for (let i = 0; i < ESCALATOR_STOPS.length; i++) {
      if (ESCALATOR_STOPS[i] <= f) idx = i;
    }
  }
  const stopFloor = ESCALATOR_STOPS[idx];
  const nextFloor = idx < ESCALATOR_STOPS.length - 1 ? ESCALATOR_STOPS[idx + 1] : stopFloor;
  const reverse = idx % 2 === 1;
  const baseY = (stopFloor - 5) * 3.5;
  const topY = (nextFloor - 5) * 3.5;
  return {
    index: idx,
    floor: stopFloor,
    nextFloor,
    baseY,
    topY,
    height: topY - baseY,
    start: reverse ? -37 : -25,
    end: reverse ? -25 : -37,
    upZ: reverse ? 21.45 : 18.55,
    downZ: reverse ? 18.55 : 21.45,
  };
}

const inRange = (v, a, b) => v >= a - 1e-7 && v <= b + 1e-7;

export class Escalators {
  constructor() {
    this.stopped = false;
  }

  toggleStop() {
    this.stopped = !this.stopped;
    return this.stopped;
  }

  nearestStop(y) {
    let best = ESCALATOR_STOPS[0];
    let bestDiff = Infinity;
    for (const s of ESCALATOR_STOPS) {
      const diff = Math.abs((s - 5) * 3.5 - y);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = s;
      }
    }
    return best;
  }

  contains(x, z) {
    return inRange(x, -40.0, -22.0) && inRange(z, 17.2, 24.6);
  }

  lane(z, f = 0) {
    const l = escalatorLayout(f);
    return Math.abs(z - l.upZ) <= 0.7 ? 1 : Math.abs(z - l.downZ) <= 0.7 ? -1 : 0;
  }

  onFlight(x, z) {
    return x < -25 - 1e-6 && x > -37 + 1e-6 && (inRange(z, ...ESCALATOR.up) || inRange(z, ...ESCALATOR.down));
  }

  surfaceAt(x, z, nearY) {
    if (!this.contains(x, z)) return null;
    const ys = [];
    for (let i = 0; i < ESCALATOR_STOPS.length; i++) {
      const f = ESCALATOR_STOPS[i];
      const l = escalatorLayout(f);
      if (x >= -25 - 1e-6 || x <= -37 + 1e-6 || z >= 22.25) ys.push(l.baseY);
      if (i < ESCALATOR_STOPS.length - 1 && inRange(x, -37, -25) && this.lane(z, f)) {
        const dir = this.lane(z, f);
        const start = dir === 1 ? l.start : l.end;
        const end = dir === 1 ? l.end : l.start;
        ys.push(l.baseY + ((x - start) / (end - start)) * l.height);
      }
    }
    const y = ys.sort((a, b) => Math.abs(a - nearY) - Math.abs(b - nearY))[0];
    return y !== undefined && Math.abs(y - nearY) <= 0.08 ? y : null;
  }

  carry(p, dt, c) {
    if (c.paused || this.stopped || p.zone !== 'escalator' || !this.onFlight(p.x, p.z)) return;
    let activeLayout = null;
    let activeDir = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < ESCALATOR_STOPS.length - 1; i++) {
      const l = escalatorLayout(ESCALATOR_STOPS[i]);
      const dir = this.lane(p.z, l.floor);
      if (!dir) continue;
      const start = dir === 1 ? l.start : l.end;
      const end = dir === 1 ? l.end : l.start;
      const fy = l.baseY + ((p.x - start) / (end - start)) * l.height;
      const diff = Math.abs(fy - p.escalatorY);
      if (diff < bestDiff) {
        bestDiff = diff;
        activeLayout = l;
        activeDir = dir;
      }
    }
    if (!activeLayout || bestDiff > 0.12 || !activeDir) return;
    const dx = Math.sign(activeLayout.end - activeLayout.start) * ESCALATOR.speed * Math.min(Math.max(dt, 0), 0.1);
    const x = p.x + dx;
    const y = this.surfaceAt(x, p.z, p.groundY(c));
    if (y === null) return;
    p.x = x;
    p.escalatorY = y;
    p.floor = this.nearestStop(y);
  }
}
