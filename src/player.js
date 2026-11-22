import { MALL_LIFT_2_X, MALL_LIFT_X, MALL_LIFT_Z, MALL_MAX_FLOOR } from './hotel-world.js';

const MALL_LIFT_XS = [MALL_LIFT_X, MALL_LIFT_2_X];

export class WalkingPlayer {
  constructor(
    stairs = null,
    world = null,
    escalators = null,
    room = null,
    pool = null,
    mallController = null,
    mallControllerB = null
  ) {
    this.stairs = stairs;
    this.world = world;
    this.escalators = escalators;
    this.room = room;
    this.pool = pool;
    this.mallController = mallController;
    this.mallControllerB = mallControllerB;
    this.reset();
  }

  getMallController(car = this.activeMallCar, mallC = this.mallController, mallCB = this.mallControllerB) {
    if (car === 'B') return mallCB ?? this.mallControllerB ?? mallC ?? this.mallController;
    return mallC ?? this.mallController;
  }

  reset() {
    this.x = 0;
    this.z = 2.65;
    this.floor = 5;
    this.zone = 'lobby';
    this.activeMallCar = 'A';
    this.yaw = 0;
    this.pitch = -0.12;
    this.speed = 2;
    this.stairY = 0;
    this.worldY = 0;
    this.escalatorY = 0;
  }

  groundY(c, mallC = this.mallController, mallCB = this.mallControllerB) {
    const mc = this.getMallController(this.activeMallCar, mallC, mallCB);
    return this.zone === 'escalator'
      ? this.escalatorY
      : this.zone === 'cabin'
        ? (c?.position ?? 17.5) - 17.5
        : this.zone === 'mallCabin'
          ? (mc?.position ?? 17.5) - 17.5
          : this.zone === 'ramp'
            ? this.worldY
            : this.zone === 'stairs'
              ? this.stairY
              : (this.floor - 5) * 3.5;
  }

  eyeY(c) {
    if (this.pool && this.zone === 'pool' && this.pool.isWater(this.x, this.z, this.floor)) {
      const bob = Math.sin((c?.time ?? 0) * 2.4) * 0.025;
      return this.groundY(c) + 0.96 + bob;
    }
    return this.groundY(c) + 1.65;
  }

  sync(c, mallC = this.mallController, mallCB = this.mallControllerB) {
    if (this.zone === 'cabin') this.floor = c.floor;
    else if (this.zone === 'mallCabin') {
      const mc = this.getMallController(this.activeMallCar, mallC, mallCB);
      if (mc) this.floor = mc.floor;
    }
  }

  look(dx, dy) {
    this.yaw -= dx * 0.0025;
    this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch - dy * 0.0025));
  }

  inDoorway() {
    return Math.abs(this.x) < 0.45 && this.z > 0.6 && this.z < 1.4;
  }

  mallDoorwayCar() {
    if (this.z <= MALL_LIFT_Z + 0.8 || this.z >= MALL_LIFT_Z + 1.62) return null;
    if (Math.abs(this.x - MALL_LIFT_X) < 0.5) return 'A';
    if (Math.abs(this.x - MALL_LIFT_2_X) < 0.5) return 'B';
    return null;
  }

  inMallDoorway(car = null) {
    const doorCar = this.mallDoorwayCar();
    return car ? doorCar === car : doorCar !== null;
  }

  blocksDoor(c) {
    return this.inDoorway() && c.aligned() && c.floor === this.floor;
  }

  blocksMallDoor(mallC = this.mallController, car = null) {
    const targetCar = car ?? (this.mallControllerB && mallC === this.mallControllerB ? 'B' : null);
    return Boolean(mallC && this.inMallDoorway(targetCar) && mallC.aligned() && mallC.floor === this.floor);
  }

  leaveDoorway() {
    if (this.inDoorway()) {
      this.z = this.zone === 'cabin' ? 0.48 : 1.62;
    }
    if (this.inMallDoorway()) {
      this.z = this.zone === 'mallCabin' ? MALL_LIFT_Z + 0.55 : MALL_LIFT_Z + 1.72;
    }
  }

  canOccupy(x, z, c, mallC = this.mallController, mallCB = this.mallControllerB) {
    const mcA = mallC ?? this.mallController;
    const mcB = mallCB ?? this.mallControllerB ?? mcA;
    const activeMc = this.activeMallCar === 'B' ? mcB : mcA;
    const activeAligned = Boolean(activeMc && activeMc.aligned() && activeMc.floor === this.floor);

    const inCarACabin = Math.abs(x - MALL_LIFT_X) <= 1.0 && z >= MALL_LIFT_Z - 0.85 && z <= MALL_LIFT_Z + 0.85;
    const inCarADoor = Math.abs(x - MALL_LIFT_X) <= 0.45 && z > MALL_LIFT_Z + 0.85 && z <= MALL_LIFT_Z + 1.62;
    const inCarBCabin = Math.abs(x - MALL_LIFT_2_X) <= 1.0 && z >= MALL_LIFT_Z - 0.85 && z <= MALL_LIFT_Z + 0.85;
    const inCarBDoor = Math.abs(x - MALL_LIFT_2_X) <= 0.45 && z > MALL_LIFT_Z + 0.85 && z <= MALL_LIFT_Z + 1.62;

    if (this.zone === 'mallCabin') {
      const inOwnCabin = this.activeMallCar === 'B' ? inCarBCabin : inCarACabin;
      const inOwnDoor = this.activeMallCar === 'B' ? inCarBDoor : inCarADoor;
      if (inOwnCabin) return true;
      if (inOwnDoor) return Boolean(activeAligned && activeMc.door >= 0.95);
      if (inCarACabin || inCarBCabin || inCarADoor || inCarBDoor) return false;
      if (this.world && this.world.isMallArea(x, z, this.floor)) {
        return Boolean(
          activeAligned &&
            activeMc.door >= 0.95 &&
            this.world.surfaceAt(x, z, this.groundY(c, mcA, mcB), this.floor) !== null
        );
      }
      return false;
    }

    if (this.zone !== 'cabin') {
      if (inCarADoor || inCarACabin) {
        return Boolean(mcA && mcA.aligned() && mcA.floor === this.floor && mcA.door >= 0.95);
      }
      if (inCarBDoor || inCarBCabin) {
        return Boolean(mcB && mcB.aligned() && mcB.floor === this.floor && mcB.door >= 0.95);
      }
    }

    if (this.room && this.zone !== 'cabin' && this.room.contains(x, z, this.floor)) {
      return this.room.canOccupy(x, z, this, c);
    }
    if (this.zone === 'room' && !this.room?.canExit(x, z, this)) {
      return false;
    }
    if (this.pool && this.zone !== 'cabin' && this.pool.contains(x, z, this.floor)) {
      return this.pool.canOccupy(x, z, this, c);
    }
    if (this.zone === 'pool' && !this.pool?.canExit(x, z, this)) {
      return false;
    }
    if (this.zone === 'escalator') {
      if (this.escalators && this.escalators.contains(x, z)) {
        return this.escalators.surfaceAt(x, z, this.groundY(c, mcA, mcB)) !== null;
      }
      const m5fWestNorthPortal = this.floor === 13 && x >= -39.4 && x <= -37.0 && this.z <= 17.35 && z < 17.2;
      // Side walls at z = 17.2 and z = 24.6 enclose the escalator lanes; exit cleanly via East/West landings
      if (!m5fWestNorthPortal && x > -40.0 && x < -22.0) {
        return false;
      }
      return (
        Math.abs(this.escalatorY - (this.floor - 5) * 3.5) <= 0.025 &&
        Boolean(this.world?.isMallArea?.(x, z, this.floor)) &&
        this.world.surfaceAt(x, z, this.groundY(c, mcA, mcB), this.floor) !== null
      );
    } else if (this.escalators && this.zone !== 'cabin' && this.escalators.contains(x, z)) {
      const m5fWestNorthPortal = this.floor === 13 && x >= -39.4 && x <= -37.0 && this.z < 17.2;
      // Prevent walking laterally through North/South escalator balustrades into the middle of flights
      if (!m5fWestNorthPortal && x > -40.0 && x < -22.0 && (this.z < 17.2 || this.z > 24.6)) {
        return false;
      }
      return this.escalators.surfaceAt(x, z, this.groundY(c, mcA, mcB)) !== null;
    }
    const aligned = c.aligned() && c.floor === this.floor;
    if (this.world && this.zone !== 'cabin' && this.world.isExtendedArea(x, z, this.floor)) {
      return this.world.surfaceAt(x, z, this.groundY(c, mcA, mcB), this.floor) !== null;
    }
    if (this.stairs && this.zone !== 'cabin') {
      const y = this.groundY(c);
      if (x > 2.28) return this.stairs.surfaceAt(x, z, y) !== null;
      if (this.zone === 'stairs') {
        if (Math.abs(y - (this.floor - 5) * 3.5) > 0.025) return false;
        if (this.x > 2.28 && !this.stairs.inGateway(this.x, z)) return false;
      }
    }
    if (Math.abs(x) <= 2.28 && z >= 1.4 && z <= 3.42) {
      return (
        this.zone === 'lobby' ||
        this.zone === 'stairs' ||
        this.zone === 'escalator' ||
        this.zone === 'room' ||
        this.zone === 'pool' ||
        aligned
      );
    }
    if (Math.abs(x) <= 0.7 && z >= -0.62 && z <= 0.66) {
      return this.zone === 'cabin' || aligned;
    }
    return Math.abs(x) <= 0.25 && z >= 0.66 && z <= 1.4 && aligned && c.door >= 0.95;
  }

  move(forward, strafe, dt, c, sprint = false, mallC = this.mallController, mallCB = this.mallControllerB) {
    const mcA = mallC ?? this.mallController;
    const mcB = mallCB ?? this.mallControllerB ?? mcA;
    this.sync(c, mcA, mcB);
    if (c.paused || !Number.isFinite(dt) || dt <= 0) return;
    const norm = Math.hypot(forward, strafe);
    if (!norm) return;
    forward /= Math.max(1, norm);
    strafe /= Math.max(1, norm);
    const distance = this.speed * (sprint ? 3 : 1) * Math.min(dt, 0.25);
    const dx = (strafe * Math.cos(this.yaw) - forward * Math.sin(this.yaw)) * distance;
    const dz = (-forward * Math.cos(this.yaw) - strafe * Math.sin(this.yaw)) * distance;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.035));

    for (let i = 0; i < steps; i++) {
      const nx = this.x + dx / steps;
      if (this.canOccupy(nx, this.z, c, mcA, mcB)) this.x = nx;
      const nz = this.z + dz / steps;
      if (this.canOccupy(this.x, nz, c, mcA, mcB)) this.z = nz;

      const inCarACabin =
        Math.abs(this.x - MALL_LIFT_X) <= 1.0 && this.z >= MALL_LIFT_Z - 0.85 && this.z <= MALL_LIFT_Z + 0.85;
      const inCarBCabin =
        Math.abs(this.x - MALL_LIFT_2_X) <= 1.0 && this.z >= MALL_LIFT_Z - 0.85 && this.z <= MALL_LIFT_Z + 0.85;

      if (inCarACabin || inCarBCabin) {
        this.zone = 'mallCabin';
        this.activeMallCar = inCarBCabin ? 'B' : 'A';
      } else if (this.zone === 'mallCabin' && this.z < MALL_LIFT_Z + 1.6) {
        // Walking through Mall elevator doorway — stay coupled to mallCabin until clear on the landing
      } else if (this.room && this.room.contains(this.x, this.z, this.floor) && this.zone !== 'cabin') {
        this.zone = 'room';
      } else if (this.pool && this.pool.contains(this.x, this.z, this.floor) && this.zone !== 'cabin') {
        this.zone = 'pool';
      } else if (this.escalators && this.escalators.contains(this.x, this.z) && this.zone !== 'cabin') {
        const y = this.escalators.surfaceAt(this.x, this.z, this.groundY(c, mcA, mcB));
        if (y !== null) {
          this.escalatorY = y;
          this.zone = 'escalator';
          this.floor = this.escalators.nearestStop?.(y) ?? Math.max(0, Math.min(14, Math.round(y / 3.5) + 5));
        }
      } else if (this.world && this.zone !== 'cabin' && this.world.isExtendedArea(this.x, this.z, this.floor)) {
        if (this.zone === 'mallCabin') {
          const activeMc = this.getMallController(this.activeMallCar, mcA, mcB);
          if (activeMc) this.floor = activeMc.floor;
        }
        const height = this.world.surfaceAt(this.x, this.z, this.groundY(c, mcA, mcB), this.floor);
        if (height !== null) {
          this.worldY = height;
          const cap = this.world.isMallArea(this.x, this.z, Math.round(height / 3.5) + 5)
            ? MALL_MAX_FLOOR
            : this.floor >= 6
              ? 14
              : 5;
          this.floor = Math.max(0, Math.min(cap, Math.round(height / 3.5) + 5));
          this.zone = this.world.isRamp(this.x, this.z, height) ? 'ramp' : 'lobby';
        }
      } else if (this.stairs && this.x > 2.28 && this.zone !== 'cabin') {
        const height = this.stairs.surfaceAt(this.x, this.z, this.groundY(c, mcA, mcB));
        if (height !== null) {
          this.stairY = height;
          this.zone = 'stairs';
          this.floor = Math.max(0, Math.min(14, Math.round(height / 3.5) + 5));
        }
      } else if (Math.abs(this.x) <= 0.75 && this.z <= 0.66) {
        this.zone = 'cabin';
      } else if (this.z >= 1.4 && this.zone !== 'mallCabin') {
        if (this.zone === 'cabin') this.floor = c.floor;
        this.zone = 'lobby';
      }
    }
    this.sync(c, mcA, mcB);
  }
}
