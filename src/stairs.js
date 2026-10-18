// Shared dimensions for the physical walkable surfaces and their 3D geometry.
export const STAIRS = {
  start: 3.42,
  end: 6.57,
  midEnd: 7.4,
  left: [3.6, 4.95],
  right: [5.55, 6.95],
  landing: [2.8, 7.2],
  doorX: 2.54,
  doorZ: 2.35,
  stepCount: 10,
  floorHeight: 3.5,
  floors: 15,
};

const between = (v, a, b) => v >= a - 1e-7 && v <= b + 1e-7;

export class Stairwell {
  constructor() {
    this.reset();
  }

  reset() {
    this.doors = Array.from({ length: STAIRS.floors }, () => ({ open: 0, target: 0 }));
  }

  inGateway(x, z) {
    return between(x, 2.28, 2.8) && between(z, 2.0, 2.7);
  }

  doorOccupied(floor, p) {
    return (
      p &&
      p.zone !== 'cabin' &&
      Math.abs(p.groundY() - (floor - 5) * 3.5) < 0.3 &&
      between(p.x, 2.24, 3.85) &&
      between(p.z, 1.65, 3.1)
    );
  }

  toggleDoor(floor, p) {
    const d = this.doors[floor];
    if (!d) return false;
    if (d.target && this.doorOccupied(floor, p)) return false;
    d.target = d.target ? 0 : 1;
    return true;
  }

  update(dt, p) {
    for (const [floor, d] of this.doors.entries()) {
      if (floor === 14 && p && p.zone !== 'cabin') {
        const near10F = Math.abs(p.groundY() - (14 - 5) * 3.5) < 0.6;
        const nearDoor = between(p.x, 1.8, 3.8) && between(p.z, 1.3, 3.4);
        if (near10F && nearDoor) {
          d.target = 1;
        } else if (!this.doorOccupied(floor, p)) {
          d.target = 0;
        }
      } else if (!d.target && d.open > 0 && this.doorOccupied(floor, p)) {
        d.target = 1;
      }
      const step = Math.max(0, Math.min(dt, 1)) / 0.7;
      d.open = d.target ? Math.min(1, d.open + step) : Math.max(0, d.open - step);
    }
  }

  surfaceAt(x, z, nearY) {
    const candidates = [];
    for (let floor = 0; floor < STAIRS.floors; floor++) {
      const base = (floor - 5) * 3.5;
      if (this.inGateway(x, z) && this.doors[floor].open >= 0.95) {
        candidates.push(base);
      }
      if (between(x, ...STAIRS.landing) && between(z, 1.4, STAIRS.start)) {
        candidates.push(base);
      }
      if (floor === STAIRS.floors - 1) continue;
      if (between(x, ...STAIRS.left) && between(z, STAIRS.start, STAIRS.end)) {
        candidates.push(base + (1.75 * (z - STAIRS.start)) / (STAIRS.end - STAIRS.start));
      }
      if (between(x, ...STAIRS.right) && between(z, STAIRS.start, STAIRS.end)) {
        candidates.push(base + 1.75 + (1.75 * (STAIRS.end - z)) / (STAIRS.end - STAIRS.start));
      }
      if (between(x, STAIRS.left[0], STAIRS.right[1]) && between(z, STAIRS.end, STAIRS.midEnd)) {
        candidates.push(base + 1.75);
      }
    }
    const closest = candidates.sort((a, b) => Math.abs(a - nearY) - Math.abs(b - nearY))[0];
    return closest !== undefined && Math.abs(closest - nearY) <= 0.08 ? closest : null;
  }
}
