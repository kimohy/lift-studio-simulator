import { floorUsage } from './building.js';
import { FLOORS, PITCH } from './controller.js';

const CABIN_SLOTS = [
  { x: -0.4, z: -0.26 },
  { x: 0.4, z: -0.26 },
  { x: -0.4, z: 0.14 },
  { x: 0.4, z: 0.14 },
];

const WAIT_SLOTS = [
  { x: -0.82, z: 2.05 },
  { x: 0.82, z: 2.05 },
  { x: -1.22, z: 2.35 },
  { x: 1.22, z: 2.35 },
  { x: -0.82, z: 2.58 },
  { x: 0.82, z: 2.58 },
];

const LOBBY_SPOTS = [
  { name: '리셉션 앞', x: -5.4, z: 19.6, yaw: -0.15 },
  { name: '로비 중앙 샹들리에', x: -0.4, z: 14.8, yaw: 0.4 },
  { name: '그랜드 카페 카운터', x: 6.4, z: 16.0, yaw: -0.3 },
  { name: '그랜드 카페 테이블', x: 3.6, z: 12.6, yaw: -1.2 },
  { name: '로비 라운지 소파 앞', x: -4.8, z: 13.5, yaw: 1.4 },
  { name: '호텔 정문 쇼윈도', x: 1.8, z: 23.8, yaw: 3.0 },
  { name: '호텔 입구 광장', x: -1.5, z: 28.5, yaw: 2.8 },
  { name: '로비 안내 데스크 근처', x: -2.2, z: 10.6, yaw: 0.5 },
];

const PARKING_SPOTS = [
  { name: '주차 구역 A열', x: -4.8, z: 14.5, yaw: 1.5 },
  { name: '주차 통로 중앙', x: 0.4, z: 18.0, yaw: 0 },
  { name: '주차 구역 B열', x: 4.2, z: 16.0, yaw: -1.5 },
  { name: '주차장 안내판 앞', x: -0.8, z: 11.2, yaw: 0 },
];

const GUEST_FLOOR_SPOTS = [
  { name: '서측 객실 문 앞', x: -1.5, z: 3.1, yaw: Math.PI },
  { name: '동측 객실 문 앞', x: 1.5, z: 3.1, yaw: Math.PI },
  { name: '승강장 창가', x: -1.8, z: 2.2, yaw: 0.3 },
  { name: '승강장 안내판 앞', x: 1.6, z: 2.3, yaw: -0.3 },
];

const ROOFTOP_SPOTS = [
  { name: '루프탑 인피니티 풀 데크', x: 0.0, z: 13.8, yaw: Math.PI },
  { name: '루프탑 스카이 풀 바', x: -6.4, z: 12.6, yaw: 1.4 },
  { name: '루프탑 전망 테라스', x: -6.8, z: 23.8, yaw: Math.PI },
  { name: '루프탑 자쿠지 스파 옆', x: 6.5, z: 16.5, yaw: -1.3 },
];

export const DEFAULT_NPC_PROFILES = [
  {
    id: 'guest-doyun',
    name: '투숙객 · 김도윤',
    role: 'guest',
    homeFloor: 12, // 8F
    startFloor: 5,
    startX: -1.1,
    startZ: 7.2,
    coatColor: 0x2b3e50,
    trouserColor: 0x1d262d,
    hairColor: 0x231f20,
    skinColor: 0xd4aa8c,
    longHair: false,
    prop: 'briefcase',
    initialAction: 'elevator',
    initialTargetFloor: 12,
    greetings: [
      '8층 비즈니스 스위트에 묵고 있습니다. 엘리베이터가 아주 쾌적하네요.',
      '회의하러 가기 전에 1층 로비에서 잠시 일정을 확인하고 있었어요.',
      'Good day! This hotel has a very smooth elevator system.',
    ],
  },
  {
    id: 'guest-emily',
    name: '투숙객 · 에밀리',
    role: 'guest',
    homeFloor: 10, // 6F
    startFloor: 5,
    startX: 4.2,
    startZ: 15.2,
    coatColor: 0xb85248,
    trouserColor: 0x2c3539,
    hairColor: 0x6e4726,
    skinColor: 0xe0bba2,
    longHair: true,
    prop: 'cup',
    initialAction: 'roam',
    greetings: [
      '그랜드 카페 라떼가 정말 맛있어요! 산책 삼아 호텔을 구경 중입니다.',
      '6층 객실 전망이 정말 좋더라고요. The view from the 6th floor is lovely!',
      '안녕하세요! 오늘 날씨가 참 좋네요. Enjoy your stay at Grand Hotel!',
    ],
  },
  {
    id: 'guest-seojun',
    name: '투숙객 · 박서준',
    role: 'guest',
    homeFloor: 14, // 10F
    startFloor: 4, // B1 Parking
    startX: 0.2,
    startZ: 14.5,
    coatColor: 0x8c7a64,
    trouserColor: 0x282c30,
    hairColor: 0x221e1f,
    skinColor: 0xcfa587,
    longHair: false,
    prop: 'suitcase',
    initialAction: 'roam',
    greetings: [
      '지하 주차장에 차를 대고 로비로 올라가는 길입니다.',
      '10층 펜트하우스 라운지가 조용하고 좋더군요. Have a pleasant stay!',
      '반갑습니다! 혹시 몇 층으로 가시나요?',
    ],
  },
  {
    id: 'guest-yuna',
    name: '투숙객 · 최유나',
    role: 'guest',
    homeFloor: 7, // 3F
    startFloor: 5,
    startX: -4.2,
    startZ: 15.0,
    coatColor: 0x4d6b5d,
    trouserColor: 0x252d30,
    hairColor: 0x2c221e,
    skinColor: 0xd9b396,
    longHair: true,
    prop: null,
    initialAction: 'roam',
    greetings: [
      '3층 객실에 머물고 있어요. 로비 샹들리에가 참 멋지죠?',
      '체크인하고 잠시 라운지에서 쉬는 중이에요. Nice to meet you!',
      '엘리베이터 안내 음성이 한국어랑 영어로 나와서 편리하네요.',
    ],
  },
  {
    id: 'guest-hajun',
    name: '투숙객 · 정하준',
    role: 'guest',
    homeFloor: 13, // 9F
    startFloor: 5,
    startX: 1.4,
    startZ: 19.5,
    coatColor: 0x6d3238,
    trouserColor: 0x242a2e,
    hairColor: 0x272121,
    skinColor: 0xcda282,
    longHair: false,
    prop: 'cup',
    initialAction: 'roam',
    greetings: [
      '9층 객실에서 내려와 커피 한 잔 마시러 왔습니다.',
      '지하 주차장이 B5까지 있어서 주차 공간이 넉넉하네요.',
      '좋은 하루 보내세요! Hope you have a wonderful time here.',
    ],
  },
  {
    id: 'bellhop-taemin',
    name: '벨보이 · 태민',
    role: 'bellhop',
    homeFloor: 5, // 1F
    startFloor: 5,
    startX: -1.8,
    startZ: 12.2,
    coatColor: 0x5c2c2c,
    trouserColor: 0x1e2426,
    hairColor: 0x1f1b1b,
    skinColor: 0xd2a889,
    longHair: false,
    prop: 'suitcase',
    initialAction: 'roam',
    greetings: [
      '수하물 이동이나 객실 안내가 필요하시면 언제든 말씀해 주세요!',
      '투숙객분들의 짐을 객실 층까지 안전하게 옮겨 드리고 있습니다.',
      '환영합니다! 엘리베이터는 복도 안쪽 정면에 있습니다. Right this way to the lift!',
    ],
  },
];

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export class HotelNPCSystem {
  constructor(world = null, { profiles = DEFAULT_NPC_PROFILES, seed = 20261016, maxConcurrentRiders = 2 } = {}) {
    this.world = world;
    this.profiles = profiles;
    this.maxConcurrentRiders = maxConcurrentRiders;
    this.initialSeed = seed >>> 0;
    this.seed = this.initialSeed;
    this.npcs = [];
    this.reset();
  }

  random() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  pick(list) {
    return list[Math.floor(this.random() * list.length)];
  }

  reset(controller = null) {
    this.seed = this.initialSeed;
    if (controller) {
      for (const npc of this.npcs) {
        controller.setObstruction(false, `npc-${npc.id}`);
      }
    }
    this.npcs = this.profiles.map((p, index) => {
      const waitSlot = WAIT_SLOTS[index % WAIT_SLOTS.length];
      const cabinSlot = CABIN_SLOTS[index % CABIN_SLOTS.length];
      const npc = {
        ...p,
        index,
        floor: p.startFloor,
        zone: 'lobby',
        x: p.startX,
        z: p.startZ,
        y: (p.startFloor - 5) * PITCH,
        yaw: 0,
        speed: p.role === 'bellhop' ? 1.48 : 1.28 + (index % 3) * 0.08,
        state: 'idle_activity',
        activityName: '로비 산책',
        waypoints: [],
        waitTimer: 1.5 + index * 1.4,
        roamCount: 0,
        tripCooldown: index * 3.5,
        transitTimer: 0,
        targetFloor: p.initialTargetFloor ?? p.homeFloor,
        waitSlot,
        cabinSlot,
        moving: false,
        walkPhase: index * 1.3,
        waveStart: -100,
        waveUntil: 0,
        talkPauseTimer: 0,
        dialogueIndex: 0,
      };
      if (p.initialAction === 'elevator') {
        npc.tripCooldown = 0;
        this.planTripToFloor(npc, p.initialTargetFloor ?? p.homeFloor);
      } else {
        this.planRoam(npc);
      }
      return npc;
    });
  }

  getNPC(id) {
    return this.npcs.find((n) => n.id === id) ?? null;
  }

  inDoorway(npc) {
    return Math.abs(npc.x) < 0.45 && npc.z > 0.56 && npc.z < 1.46;
  }

  blocksDoor(npc, controller) {
    if (!controller.aligned() || controller.floor !== npc.floor) return false;
    if (npc.state !== 'boarding' && npc.state !== 'exiting') return false;
    if ((npc.transitTimer ?? 0) > 3.5) return false;
    return this.inDoorway(npc);
  }

  cabinCount() {
    return this.npcs.filter((n) => n.zone === 'cabin' || n.state === 'boarding').length;
  }

  activeElevatorUsers() {
    return this.npcs.filter((n) =>
      ['walking_to_lift', 'waiting_for_lift', 'boarding', 'riding', 'exiting'].includes(n.state)
    ).length;
  }

  exitingOnFloor(floor) {
    return this.npcs.some((n) => n.state === 'exiting' && n.floor === floor && n.z < 1.8);
  }

  chooseFreeCabinSlot(npc) {
    const taken = new Set(
      this.npcs
        .filter((other) => other !== npc && (other.zone === 'cabin' || other.state === 'boarding'))
        .map((other) => other.cabinSlotIndex)
    );
    for (let i = 0; i < CABIN_SLOTS.length; i++) {
      const idx = (npc.index + i) % CABIN_SLOTS.length;
      if (!taken.has(idx)) {
        npc.cabinSlotIndex = idx;
        npc.cabinSlot = CABIN_SLOTS[idx];
        return npc.cabinSlot;
      }
    }
    npc.cabinSlotIndex = npc.index % CABIN_SLOTS.length;
    npc.cabinSlot = CABIN_SLOTS[npc.cabinSlotIndex];
    return npc.cabinSlot;
  }

  planRoam(npc) {
    npc.state = 'roaming';
    npc.transitTimer = 0;
    npc.roamCount++;
    const waypoints = [];
    if (npc.floor === 5) {
      const spot = this.pick(LOBBY_SPOTS);
      npc.activityName = spot.name;
      if (npc.z < 8.2) {
        waypoints.push({ x: Math.max(-1.0, Math.min(1.0, npc.x)), z: 5.5 });
        waypoints.push({ x: Math.max(-1.2, Math.min(1.2, spot.x * 0.25)), z: 9.2 });
      } else if (Math.abs(npc.x - spot.x) > 5 && Math.abs(npc.z - spot.z) > 4) {
        waypoints.push({ x: (npc.x + spot.x) * 0.35, z: Math.max(10, (npc.z + spot.z) * 0.5) });
      }
      waypoints.push({ x: spot.x, z: spot.z, yaw: spot.yaw });
    } else if (npc.floor < 5) {
      const spot = this.pick(PARKING_SPOTS);
      npc.activityName = `${FLOORS[npc.floor]}층 ${spot.name}`;
      if (npc.z < 8.2) {
        waypoints.push({ x: 0, z: 5.5 });
        waypoints.push({ x: 0, z: 9.2 });
      }
      waypoints.push({ x: spot.x, z: spot.z, yaw: spot.yaw });
    } else if (npc.floor === 14) {
      const spot = this.pick(ROOFTOP_SPOTS);
      npc.activityName = `10층 ${spot.name}`;
      if (npc.z < 8.2) {
        waypoints.push({ x: 0, z: 3.4 });
        waypoints.push({ x: 0, z: 8.6 });
      }
      waypoints.push({ x: spot.x, z: spot.z, yaw: spot.yaw });
    } else {
      const spot = this.pick(GUEST_FLOOR_SPOTS);
      npc.activityName = `${FLOORS[npc.floor]}층 ${spot.name}`;
      waypoints.push({ x: spot.x, z: spot.z, yaw: spot.yaw });
    }
    npc.waypoints = waypoints;
  }

  chooseNextFloor(npc) {
    if (npc.floor !== 5) {
      if (npc.floor !== npc.homeFloor && this.random() < 0.3) return npc.homeFloor;
      return 5;
    }
    const roll = this.random();
    if (npc.role === 'bellhop') {
      return 6 + Math.floor(this.random() * 9); // 2F..10F
    }
    if (roll < 0.58 && npc.homeFloor !== 5) {
      return npc.homeFloor;
    }
    if (roll < 0.8) {
      return 6 + Math.floor(this.random() * 9); // 2F..10F
    }
    return Math.floor(this.random() * 5); // B5..B1 parking
  }

  planTripToFloor(npc, targetFloor) {
    if (!Number.isInteger(targetFloor) || targetFloor < 0 || targetFloor >= FLOORS.length || targetFloor === npc.floor) {
      this.planRoam(npc);
      return;
    }
    npc.targetFloor = targetFloor;
    npc.state = 'walking_to_lift';
    npc.transitTimer = 0;
    npc.activityName = `${FLOORS[targetFloor]}층 이동`;
    const slot = npc.waitSlot;
    const waypoints = [];
    if (npc.z > 8.4) {
      waypoints.push({ x: Math.max(-1.1, Math.min(1.1, npc.x * 0.25)), z: 8.4 });
      waypoints.push({ x: slot.x * 0.55, z: 3.3 });
    } else if (npc.z > 3.5) {
      waypoints.push({ x: slot.x * 0.55, z: 3.1 });
    }
    waypoints.push({ x: slot.x, z: slot.z, yaw: 0 });
    npc.waypoints = waypoints;
  }

  decideNextAction(npc) {
    if (npc.tripCooldown > 0 || this.activeElevatorUsers() >= this.maxConcurrentRiders) {
      this.planRoam(npc);
      return;
    }

    const shouldRide =
      npc.floor > 5
        ? npc.roamCount >= 2
        : npc.floor < 5
          ? npc.roamCount >= 1
          : npc.roamCount >= 2 && this.random() < 0.55;

    if (shouldRide) {
      npc.roamCount = 0;
      this.planTripToFloor(npc, this.chooseNextFloor(npc));
    } else {
      this.planRoam(npc);
    }
  }

  stepAlongWaypoints(npc, dt, player = null) {
    if (!npc.waypoints.length) {
      npc.moving = false;
      return true;
    }
    const target = npc.waypoints[0];
    const dx = target.x - npc.x;
    const dz = target.z - npc.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.05) {
      npc.x = target.x;
      npc.z = target.z;
      if (typeof target.yaw === 'number') npc.yaw = target.yaw;
      npc.waypoints.shift();
      if (!npc.waypoints.length) {
        npc.moving = false;
        return true;
      }
      return false;
    }

    // Polite yield when player is directly in front of a roaming NPC outside the doorway
    if (
      player &&
      npc.state === 'roaming' &&
      player.floor === npc.floor &&
      player.zone === npc.zone &&
      Math.hypot(player.x - npc.x, player.z - npc.z) < 0.72
    ) {
      npc.moving = false;
      return false;
    }

    const step = Math.min(dist, npc.speed * dt);
    const ux = dx / dist;
    const uz = dz / dist;
    npc.x += ux * step;
    npc.z += uz * step;

    const desiredYaw = Math.atan2(-ux, -uz);
    const diff = wrapAngle(desiredYaw - npc.yaw);
    npc.yaw = wrapAngle(npc.yaw + Math.sign(diff) * Math.min(Math.abs(diff), dt * 8));
    npc.moving = true;
    npc.walkPhase += step * 3.6;
    return false;
  }

  update(dt, controller, player = null) {
    if (!controller || controller.paused || !Number.isFinite(dt) || dt <= 0) return;
    const clampedDt = Math.min(dt, 0.2);

    for (const npc of this.npcs) {
      if (npc.tripCooldown > 0) {
        npc.tripCooldown = Math.max(0, npc.tripCooldown - clampedDt);
      }

      if (npc.talkPauseTimer > 0) {
        npc.talkPauseTimer = Math.max(0, npc.talkPauseTimer - clampedDt);
        if (npc.state === 'roaming' || npc.state === 'idle_activity') {
          npc.moving = false;
          if (player && player.floor === npc.floor) {
            npc.yaw = Math.atan2(-(player.x - npc.x), -(player.z - npc.z));
          }
          controller.setObstruction(false, `npc-${npc.id}`);
          continue;
        }
      }

      if (npc.state === 'roaming') {
        npc.zone = 'lobby';
        npc.y = (npc.floor - 5) * PITCH;
        const done = this.stepAlongWaypoints(npc, clampedDt, player);
        if (done) {
          npc.state = 'idle_activity';
          npc.waitTimer = npc.floor === 5 ? 4.0 + this.random() * 6.0 : 3.0 + this.random() * 4.0;
        }
      } else if (npc.state === 'idle_activity') {
        npc.moving = false;
        npc.zone = 'lobby';
        npc.y = (npc.floor - 5) * PITCH;
        npc.waitTimer -= clampedDt;
        if (npc.waitTimer <= 0) {
          this.decideNextAction(npc);
        }
      } else if (npc.state === 'walking_to_lift') {
        npc.zone = 'lobby';
        npc.y = (npc.floor - 5) * PITCH;
        const done = this.stepAlongWaypoints(npc, clampedDt, player);
        if (done) {
          npc.state = 'waiting_for_lift';
          npc.yaw = 0;
        }
      } else if (npc.state === 'waiting_for_lift') {
        npc.moving = false;
        npc.zone = 'lobby';
        npc.y = (npc.floor - 5) * PITCH;
        npc.yaw = 0;

        if (npc.targetFloor === npc.floor) {
          this.planRoam(npc);
          continue;
        }

        const dir = npc.targetFloor > npc.floor ? 1 : -1;
        const carAtFloor = controller.floor === npc.floor && controller.aligned();
        const doorReady =
          carAtFloor &&
          (controller.state === 'open' || (controller.state === 'opening' && controller.door >= 0.85));
        const directionCompatible =
          controller.direction === 0 ||
          controller.direction === dir ||
          controller.ahead(controller.direction).length === 0;

        if (
          doorReady &&
          directionCompatible &&
          !this.exitingOnFloor(npc.floor) &&
          this.cabinCount() < this.maxConcurrentRiders
        ) {
          const slot = this.chooseFreeCabinSlot(npc);
          npc.state = 'boarding';
          npc.transitTimer = 0;
          // Ensure the open door waits long enough for the NPC to cross the threshold
          if (controller.state === 'open') {
            controller.dwell = Math.max(controller.dwell, 2.2);
          }
          npc.waypoints = [
            { x: slot.x * 0.35, z: 1.38 },
            { x: slot.x * 0.35, z: 0.45 },
            { x: slot.x, z: slot.z, yaw: Math.PI },
          ];
        } else {
          // Only press the hall button when not already lit AND when the car is not busy with doors at this floor.
          // Never force-reopen closing doors from waiting_for_lift so full or departing cars can leave cleanly.
          const callSet = dir === 1 ? controller.up : controller.down;
          const carBusyAtFloor = carAtFloor && controller.state !== 'idle';
          if (!callSet.has(npc.floor) && !carBusyAtFloor) {
            controller.callHall(npc.floor, dir);
          }
        }
      } else if (npc.state === 'boarding') {
        npc.transitTimer = (npc.transitTimer ?? 0) + clampedDt;
        const canEnter =
          controller.floor === npc.floor &&
          controller.aligned() &&
          (controller.state === 'open' || controller.state === 'opening' || npc.z < 1.45);
        if (!canEnter) {
          controller.setObstruction(false, `npc-${npc.id}`);
          npc.zone = 'lobby';
          npc.state = 'waiting_for_lift';
          npc.transitTimer = 0;
          npc.x = npc.waitSlot.x;
          npc.z = npc.waitSlot.z;
          npc.waypoints = [];
          continue;
        }

        const done = this.stepAlongWaypoints(npc, clampedDt, null) || npc.transitTimer > 3.5;
        if (npc.z <= 0.66 || done) {
          npc.zone = 'cabin';
          npc.y = controller.position - 5 * PITCH;
        } else {
          npc.zone = 'lobby';
          npc.y = (npc.floor - 5) * PITCH;
        }

        if (done) {
          npc.x = npc.cabinSlot.x;
          npc.z = npc.cabinSlot.z;
          npc.zone = 'cabin';
          npc.yaw = Math.PI;
          npc.moving = false;
          npc.state = 'riding';
          npc.transitTimer = 0;
          controller.setObstruction(false, `npc-${npc.id}`);
          controller.callCar(npc.targetFloor);
        }
      } else if (npc.state === 'riding') {
        npc.moving = false;
        npc.zone = 'cabin';
        npc.floor = controller.floor;
        npc.y = controller.position - 5 * PITCH;
        npc.yaw = Math.PI;

        const arrived =
          controller.floor === npc.targetFloor &&
          controller.aligned() &&
          (controller.state === 'open' || (controller.state === 'opening' && controller.door >= 0.85));

        if (arrived) {
          npc.state = 'exiting';
          npc.transitTimer = 0;
          if (controller.state === 'open') {
            controller.dwell = Math.max(controller.dwell, 2.2);
          }
          npc.waypoints = [
            { x: npc.x * 0.35, z: 0.55 },
            { x: npc.x * 0.35, z: 1.55 },
            { x: npc.waitSlot.x, z: 2.35, yaw: Math.PI },
          ];
        } else if (
          controller.floor !== npc.targetFloor &&
          !controller.car.has(npc.targetFloor) &&
          controller.state !== 'opening'
        ) {
          controller.callCar(npc.targetFloor);
        }
      } else if (npc.state === 'exiting') {
        npc.transitTimer = (npc.transitTimer ?? 0) + clampedDt;
        const done = this.stepAlongWaypoints(npc, clampedDt, null) || npc.transitTimer > 3.5;
        if (npc.z >= 1.4 || done) {
          npc.zone = 'lobby';
          npc.floor = controller.floor;
          npc.y = (npc.floor - 5) * PITCH;
        } else {
          npc.zone = 'cabin';
          npc.y = controller.position - 5 * PITCH;
        }

        if (done) {
          npc.x = npc.waitSlot.x;
          npc.z = 2.35;
          npc.zone = 'lobby';
          npc.floor = controller.floor;
          npc.y = (npc.floor - 5) * PITCH;
          npc.transitTimer = 0;
          npc.tripCooldown = 14 + this.random() * 14;
          controller.setObstruction(false, `npc-${npc.id}`);
          this.planRoam(npc);
        }
      }

      controller.setObstruction(this.blocksDoor(npc, controller), `npc-${npc.id}`);
    }
  }

  statusLabel(npc) {
    if (npc.state === 'waiting_for_lift') return `${FLOORS[npc.targetFloor]}층행 엘리베이터 대기 중`;
    if (npc.state === 'walking_to_lift') return '엘리베이터 승강장으로 이동 중';
    if (npc.state === 'boarding') return '엘리베이터 탑승 중';
    if (npc.state === 'riding') return `${FLOORS[npc.targetFloor]}층으로 이동 중`;
    if (npc.state === 'exiting') return `${FLOORS[npc.floor]}층 하차 중`;
    return npc.activityName || `${FLOORS[npc.floor]}층 · ${floorUsage(npc.floor).ko}`;
  }

  interact(npcId, player, time = 0) {
    const npc = this.getNPC(npcId);
    if (!npc) return null;

    npc.waveStart = time;
    npc.waveUntil = time + 3.2;
    npc.talkPauseTimer = 3.2;
    if (player && (npc.state === 'roaming' || npc.state === 'idle_activity' || npc.state === 'waiting_for_lift')) {
      npc.yaw = Math.atan2(-(player.x - npc.x), -(player.z - npc.z));
    }

    if (npc.state === 'waiting_for_lift' || npc.state === 'walking_to_lift') {
      return `${npc.name}: "${FLOORS[npc.targetFloor]}층(${floorUsage(npc.targetFloor).ko})으로 가려고 엘리베이터를 이용하는 길이에요. Heading to ${FLOORS[npc.targetFloor]}F!"`;
    }
    if (npc.state === 'boarding' || npc.state === 'riding') {
      return `${npc.name}: "같이 타셨네요! 저는 ${FLOORS[npc.targetFloor]}층 버튼을 눌렀습니다. Going to ${FLOORS[npc.targetFloor]}F."`;
    }
    if (npc.state === 'exiting') {
      return `${npc.name}: "${FLOORS[npc.floor]}층에 도착했네요. 먼저 내리겠습니다! Excuse me, getting off at ${FLOORS[npc.floor]}F."`;
    }

    const line = npc.greetings[npc.dialogueIndex % npc.greetings.length];
    npc.dialogueIndex++;
    return `${npc.name}: "${line}"`;
  }
}
