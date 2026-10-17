export const FLOORS = ['B5', 'B4', 'B3', 'B2', 'B1', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
export const PITCH = 3.5;

const valid = (n) => Number.isInteger(n) && n >= 0 && n < FLOORS.length;

export class LiftController {
  constructor() {
    this.reset();
  }

  reset() {
    this.position = 5 * PITCH;
    this.velocity = 0;
    this.floor = 5;
    this.direction = 0;
    this.target = null;
    this.motion = null;
    this.state = 'idle';
    this.door = 0;
    this.dwell = 0;
    this.obstruction = false;
    this.obstructionSources = new Set();
    this.alarm = false;
    this.paused = false;
    this.car = new Set();
    this.up = new Set();
    this.down = new Set();
    this.stops = [];
    this.events = [];
    this.time = 0;
    this.doorOpenSeconds = 1.35;
    this.doorDwellSeconds = 3;
    this.doorCloseSeconds = 1.7;
    this.maxSpeed = 1.75;
    this.accel = 0.8;
    this.log('시스템 준비 · 1층 대기');
  }

  log(message, type = 'info') {
    this.events.unshift({ time: this.time, message, type });
    if (this.events.length > 40) this.events.length = 40;
  }

  pending() {
    return [...new Set([...this.car, ...this.up, ...this.down])].sort((a, b) => a - b);
  }

  ahead(dir = this.direction) {
    return this.pending().filter((n) => (n * PITCH - this.position) * dir > 0.02);
  }

  callCar(n) {
    if (!valid(n)) return false;
    return this.add(this.car, n, '내부');
  }

  callHall(n, dir) {
    if (!valid(n) || ![1, -1].includes(dir) || (n === 0 && dir === -1) || (n === 14 && dir === 1)) {
      return false;
    }
    return this.add(dir === 1 ? this.up : this.down, n, dir === 1 ? '상행 호출' : '하행 호출');
  }

  add(set, n, label) {
    if (set.has(n)) return false;
    const wasEmpty = this.pending().length === 0;
    set.add(n);
    if (wasEmpty && this.state === 'idle') {
      this.direction = Math.sign(n * PITCH - this.position);
    }
    this.log(`${FLOORS[n]}층 · ${label} 등록`);
    if (this.aligned() && n === this.floor && this.state !== 'moving' && this.canServeHere()) {
      if (this.state === 'open' || this.state === 'opening' || this.state === 'closing') {
        this.serveHere();
        this.openDoor();
      }
    }
    return true;
  }

  aligned() {
    return Math.abs(this.position - this.floor * PITCH) < 0.002 && Math.abs(this.velocity) < 0.001;
  }

  canServeHere() {
    return (
      this.car.has(this.floor) ||
      (this.direction >= 0 && this.up.has(this.floor)) ||
      (this.direction <= 0 && this.down.has(this.floor)) ||
      (this.ahead().length === 0 && this.pending().includes(this.floor))
    );
  }

  serveHere() {
    this.car.delete(this.floor);
    if (this.direction >= 0) this.up.delete(this.floor);
    if (this.direction <= 0) this.down.delete(this.floor);
    if (this.ahead().length === 0) {
      this.up.delete(this.floor);
      this.down.delete(this.floor);
    }
  }

  chooseTarget() {
    const all = this.pending();
    if (!all.length) return null;
    if (this.aligned() && this.canServeHere()) return this.floor;
    if (!this.direction) {
      const nearest = all.reduce((a, b) =>
        Math.abs(a * PITCH - this.position) <= Math.abs(b * PITCH - this.position) ? a : b
      );
      this.direction = Math.sign(nearest * PITCH - this.position) || 1;
    }
    let ahead = this.ahead();
    if (!ahead.length) {
      this.direction *= -1;
      ahead = this.ahead();
    }
    if (!ahead.length) return all.includes(this.floor) ? this.floor : null;
    ahead.sort((a, b) => (a - b) * this.direction);
    const eligible = ahead.filter(
      (n) => this.car.has(n) || (this.direction === 1 ? this.up : this.down).has(n)
    );
    return eligible.length ? eligible[0] : ahead.at(-1);
  }

  openDoor() {
    if (!this.aligned() || this.state === 'moving') return false;
    this.dwell = this.doorDwellSeconds;
    if (this.state !== 'open' && this.state !== 'opening') {
      this.state = 'opening';
      this.log('문 열림 시작');
    }
    return true;
  }

  closeDoor() {
    if (this.obstruction || !['open', 'opening'].includes(this.state)) return false;
    this.state = 'closing';
    this.log('문 닫힘 시작');
    return true;
  }

  setObstruction(on, source = 'manual') {
    const previous = this.obstruction;
    if (on) this.obstructionSources.add(source);
    else this.obstructionSources.delete(source);
    this.obstruction = this.obstructionSources.size > 0;
    if (previous === this.obstruction) return;
    const active = this.obstruction;
    this.log(active ? '출입문 감지선 차단' : '출입문 감지선 복구', active ? 'warn' : 'info');
    if (active && this.state === 'closing') {
      this.state = 'opening';
      this.dwell = this.doorDwellSeconds;
      this.log('감지선 작동 · 문 다시 열림', 'warn');
    }
    if (!active && this.state === 'open') {
      this.dwell = this.doorDwellSeconds;
    }
  }

  toggleAlarm() {
    this.alarm = !this.alarm;
    this.log(this.alarm ? '비상 호출 신호 · 시뮬레이션' : '비상 호출 해제', this.alarm ? 'warn' : 'info');
  }

  tick(dt) {
    if (this.paused || !Number.isFinite(dt) || dt <= 0) return;
    // Bound substeps so queue decisions and braking remain independent of render FPS.
    let left = Math.min(dt, 1);
    while (left > 1e-9) {
      const step = Math.min(left, 1 / 120);
      this.step(step);
      left -= step;
    }
  }

  step(dt) {
    this.time += dt;
    if (this.state === 'opening') {
      this.door = Math.min(1, this.door + dt / this.doorOpenSeconds);
      if (this.door >= 1) {
        this.state = 'open';
        this.dwell = this.doorDwellSeconds;
        this.log('문 열림 완료');
      }
      return;
    }
    if (this.state === 'open') {
      if (!this.obstruction) {
        this.dwell -= dt;
        if (this.dwell <= 0) this.closeDoor();
      }
      return;
    }
    if (this.state === 'closing') {
      if (this.obstruction) {
        this.state = 'opening';
        return;
      }
      this.door = Math.max(0, this.door - dt / this.doorCloseSeconds);
      if (this.door <= 0) {
        this.state = 'idle';
        this.log('도어 잠금 확인');
      }
      return;
    }
    if (this.state === 'idle') {
      this.target = this.chooseTarget();
      if (this.target === null) {
        this.direction = 0;
        return;
      }
      if (Math.abs(this.target * PITCH - this.position) < 0.002) {
        this.arrive();
        return;
      }
      this.direction = Math.sign(this.target * PITCH - this.position);
      this.state = 'moving';
      this.planMotion();
      this.log(`${FLOORS[this.target]}층 방향 출발`);
      return;
    }
    if (this.state === 'moving') {
      // Only insert a nearer compatible stop when the car can still brake for it.
      const braking = (this.velocity * this.velocity) / (2 * this.accel) + 0.04;
      const candidates = this.ahead().filter(
        (n) =>
          (n - this.target) * this.direction < 0 &&
          (this.car.has(n) || (this.direction === 1 ? this.up : this.down).has(n)) &&
          Math.abs(n * PITCH - this.position) > braking
      );
      if (candidates.length) {
        candidates.sort((a, b) => (a - b) * this.direction);
        this.target = candidates[0];
        this.planMotion();
      }
      const m = this.motion;
      m.t = Math.min(m.total, m.t + dt);
      let travelled;
      let speed;
      if (m.t < m.ta) {
        travelled = m.u * m.t + 0.5 * this.accel * m.t * m.t;
        speed = m.u + this.accel * m.t;
      } else if (m.t < m.ta + m.tc) {
        const t = m.t - m.ta;
        travelled = m.da + m.peak * t;
        speed = m.peak;
      } else {
        const t = m.t - m.ta - m.tc;
        travelled = m.da + m.dc + m.peak * t - 0.5 * this.accel * t * t;
        speed = Math.max(0, m.peak - this.accel * t);
      }
      this.position = m.start + travelled * this.direction;
      this.velocity = speed * this.direction;
      this.floor = Math.max(0, Math.min(14, Math.round(this.position / PITCH)));
      if (m.t >= m.total) {
        this.position = this.target * PITCH;
        this.velocity = 0;
        this.floor = this.target;
        this.arrive();
      }
    }
  }

  planMotion() {
    const u = Math.abs(this.velocity);
    const distance = Math.abs(this.target * PITCH - this.position);
    const a = this.accel;
    const peak = Math.min(this.maxSpeed, Math.sqrt(a * distance + (u * u) / 2));
    const ta = Math.max(0, (peak - u) / a);
    const da = ((u + peak) * ta) / 2;
    const dd = (peak * peak) / (2 * a);
    const dc = Math.max(0, distance - da - dd);
    const tc = dc / peak;
    this.motion = {
      start: this.position,
      u,
      peak,
      ta,
      da,
      dc,
      tc,
      total: ta + tc + peak / a,
      t: 0,
    };
  }

  arrive() {
    this.velocity = 0;
    this.floor = Math.round(this.position / PITCH);
    const incoming = this.direction === 1 ? this.up : this.down;
    const opposite = this.direction === 1 ? this.down : this.up;
    const reverse =
      this.direction !== 0 &&
      !incoming.has(this.floor) &&
      this.ahead().length === 0 &&
      (opposite.has(this.floor) || this.ahead(-this.direction).length > 0);
    // Clear the arrival's served calls in the incoming direction before
    // committing the departure direction; otherwise turnaround calls stay lit.
    // A matching hall pickup keeps its direction while passengers choose a floor.
    this.serveHere();
    if (reverse) this.direction *= -1;
    this.stops.push(this.floor);
    this.log(`${FLOORS[this.floor]}층 도착`, 'arrival');
    this.target = null;
    this.state = 'opening';
    this.dwell = this.doorDwellSeconds;
  }

  snapshot() {
    return {
      position: this.position,
      velocity: this.velocity,
      floor: this.floor,
      direction: this.direction,
      target: this.target,
      state: this.state,
      door: this.door,
      obstruction: this.obstruction,
      alarm: this.alarm,
      paused: this.paused,
      pending: this.pending(),
      stops: [...this.stops],
    };
  }
}
