export const ESCALATOR = {
  start: -28,
  end: -34,
  up: [17.85, 19.25],
  down: [20.75, 22.15],
  height: 3.5,
  speed: 0.45,
};

export function escalatorLayout(f) {
  const reverse = f % 2 === 1;
  return {
    start: reverse ? -34 : -28,
    end: reverse ? -28 : -34,
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

  contains(x, z) {
    return inRange(x, -35.8, -26.2) && inRange(z, 17.2, 24.6);
  }

  lane(z, f = 0) {
    const l = escalatorLayout(f);
    return Math.abs(z - l.upZ) <= 0.7 ? 1 : Math.abs(z - l.downZ) <= 0.7 ? -1 : 0;
  }

  onFlight(x, z) {
    return x < -28 - 1e-6 && x > -34 + 1e-6 && (inRange(z, ...ESCALATOR.up) || inRange(z, ...ESCALATOR.down));
  }

  surfaceAt(x, z, nearY) {
    if (!this.contains(x, z)) return null;
    const ys = [];
    for (let f = 0; f < 15; f++) {
      const base = (f - 5) * 3.5;
      if (x >= -28 - 1e-6 || x <= -34 + 1e-6 || z >= 22.25) ys.push(base);
      if (f < 14 && inRange(x, -34, -28) && this.lane(z, f)) {
        const l = escalatorLayout(f);
        const start = this.lane(z, f) === 1 ? l.start : l.end;
        const end = this.lane(z, f) === 1 ? l.end : l.start;
        ys.push(base + ((x - start) / (end - start)) * 3.5);
      }
    }
    const y = ys.sort((a, b) => Math.abs(a - nearY) - Math.abs(b - nearY))[0];
    return y !== undefined && Math.abs(y - nearY) <= 0.08 ? y : null;
  }

  carry(p, dt, c) {
    if (c.paused || this.stopped || p.zone !== 'escalator' || !this.onFlight(p.x, p.z)) return;
    const f = Math.max(0, Math.min(13, Math.floor(p.escalatorY / 3.5 + 5 + 1e-8)));
    const l = escalatorLayout(f);
    const direction = this.lane(p.z, f);
    const dx = Math.sign(l.end - l.start) * ESCALATOR.speed * Math.min(Math.max(dt, 0), 0.1) * (direction ? 1 : 0);
    const x = p.x + dx;
    const y = this.surfaceAt(x, p.z, p.groundY(c));
    if (y === null) return;
    p.x = x;
    p.escalatorY = y;
    p.floor = Math.max(0, Math.min(14, Math.round(y / 3.5) + 5));
  }
}
