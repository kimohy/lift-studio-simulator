import { FLOORS, PITCH } from './controller.js';
import { ROOM } from './guest-room.js';

export const ROOM_SERVICE_MENU = [
  '그랜드 시그니처 커피 & 크루아상 세트',
  '클럽 샌드위치 & 스파클링 워터',
  '제철 과일 & 아티장 치즈 플래터',
  '트러플 프렌치 프라이 & 수제 에이드',
];

const PATROL_SPOTS = [
  { name: '그랜드 카페 픽업 존', x: 5.6, z: 16.2, yaw: -0.4 },
  { name: '그랜드 카페 테이블 구역', x: 3.4, z: 12.6, yaw: -1.5 },
  { name: '로비 중앙 홀', x: 0.0, z: 15.2, yaw: 0.0 },
  { name: '로비 라운지 소파 앞', x: -4.4, z: 13.5, yaw: 1.5 },
  { name: '리셉션 웰컴 존', x: -3.6, z: 19.2, yaw: -0.2 },
];

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export class ServiceRobot {
  constructor(room = null, { onNotify = null } = {}) {
    this.room = room;
    this.onNotify = onNotify;
    this.reset();
  }

  reset(controller = null) {
    if (controller) {
      controller.setObstruction(false, 'robot');
    }
    this.id = 'deli-bot';
    this.name = '서빙 로봇 · 딜리(DELI)';
    this.floor = 5;
    this.zone = 'lobby';
    this.x = 4.8;
    this.z = 15.8;
    this.y = 0;
    this.yaw = 0;
    this.speed = 1.65;
    this.moving = false;
    this.wheelPhase = 0;
    this.patrolIndex = 0;
    this.waitTimer = 2.0;
    this.transitTimer = 0;
    this.waypoints = [];
    this.orderState = 'none';
    this.orderItem = null;
    this.menuIndex = 0;
    this.carryingOrder = false;
    this.happyUntil = 0;
    this.planNextPatrol();
  }

  inDoorway() {
    return Math.abs(this.x) < 0.45 && this.z > 0.56 && this.z < 1.46;
  }

  blocksDoor(controller) {
    if (!controller.aligned() || controller.floor !== this.floor) return false;
    if (!['boarding_up', 'exiting_at_room_floor', 'boarding_down', 'exiting_to_lobby'].includes(this.orderState)) {
      return false;
    }
    if (this.transitTimer > 3.5) return false;
    return this.inDoorway();
  }

  planNextPatrol() {
    const spot = PATROL_SPOTS[this.patrolIndex % PATROL_SPOTS.length];
    this.patrolIndex++;
    this.activityName = spot.name;
    const waypoints = [];
    if (this.z < 8.4) {
      waypoints.push({ x: 0, z: 5.5 });
      waypoints.push({ x: 0.8, z: 9.5 });
    }
    waypoints.push({ x: spot.x, z: spot.z, yaw: spot.yaw });
    this.waypoints = waypoints;
  }

  statusLabel() {
    if (this.orderState === 'going_to_lift_up') return `룸서비스 배달 · 1층 승강장 이동 중 (${this.orderItem})`;
    if (this.orderState === 'waiting_for_lift_up') return `룸서비스 배달 · 1층 엘리베이터 대기 중`;
    if (this.orderState === 'boarding_up' || this.orderState === 'riding_up') {
      return `룸서비스 배달 · 3층 301호로 올라가는 중`;
    }
    if (this.orderState === 'exiting_at_room_floor') return `룸서비스 배달 · 3층 301호 문 앞 이동 중`;
    if (this.orderState === 'arrived_at_room') return `룸서비스 도착! · 클릭해 음식 수령`;
    if (
      ['going_to_lift_down', 'waiting_for_lift_down', 'boarding_down', 'riding_down', 'exiting_to_lobby'].includes(
        this.orderState
      )
    ) {
      return '배달 완료 · 1층 그랜드 카페로 복귀 중';
    }
    return `1층 ${this.activityName || '로비 순회 서빙 중'}`;
  }

  orderRoomService() {
    if (this.room?.foodItem) {
      return {
        ok: false,
        message: `이미 책상 위에 [${this.room.foodItem}] 트레이가 준비되어 있습니다! 트레이를 클릭해 식사를 즐겨 보세요.`,
      };
    }
    if (this.orderState !== 'none') {
      return {
        ok: false,
        message: `서빙 로봇 딜리가 현재 [${this.orderItem}] 배달 중입니다 · 상태: ${this.statusLabel()}`,
      };
    }

    const item = ROOM_SERVICE_MENU[this.menuIndex % ROOM_SERVICE_MENU.length];
    this.menuIndex++;
    this.orderItem = item;
    this.carryingOrder = true;
    this.speed = 2.15;

    if (this.floor === ROOM.floor && this.zone === 'lobby') {
      this.orderState = 'exiting_at_room_floor';
      this.waypoints = [{ x: -0.95, z: 2.85, yaw: -0.55 }];
    } else {
      this.floor = 5;
      this.zone = 'lobby';
      this.y = 0;
      if (this.z > 10.5) {
        this.x = 1.1;
        this.z = 9.2;
      }
      this.orderState = 'going_to_lift_up';
      this.waypoints = [
        { x: 0.0, z: 3.2 },
        { x: 0.0, z: 2.05, yaw: 0 },
      ];
    }

    return {
      ok: true,
      item,
      message: `🤖 룸서비스 [${item}] 주문이 접수되었습니다! 1층 그랜드 카페에서 서빙 로봇 딜리가 엘리베이터를 타고 301호로 출발합니다.`,
    };
  }

  completeDelivery(time = 0) {
    if (!this.orderItem) return null;
    const delivered = this.orderItem;
    this.room?.deliverFood(delivered);
    this.carryingOrder = false;
    this.happyUntil = time + 4.0;
    this.orderState = 'going_to_lift_down';
    this.transitTimer = 0;
    this.waypoints = [{ x: 0.65, z: 2.05, yaw: 0 }];
    return `🤖 서빙 로봇 딜리: "삐빅! 301호 고객님, 주문하신 [${delivered}] 전달 완료했습니다! 객실 책상 위 트레이를 클릭해 맛있게 드세요!"`;
  }

  interact(time = 0) {
    this.happyUntil = time + 3.5;
    if (this.orderState === 'arrived_at_room') {
      return this.completeDelivery(time);
    }
    if (this.orderState !== 'none') {
      return `🤖 서빙 로봇 딜리: "삐빅! 현재 3층 301호로 [${this.orderItem}] 룸서비스를 배달하고 있습니다! (${this.statusLabel()})"`;
    }
    const res = this.orderRoomService();
    if (res.ok) {
      return `🤖 서빙 로봇 딜리: "반갑습니다 고객님! [${res.item}] 룸서비스 주문을 접수하여 지금 바로 3층 301호로 배달해 드리겠습니다!"`;
    }
    return `🤖 서빙 로봇 딜리: "${res.message}"`;
  }

  stepWaypoints(dt) {
    if (!this.waypoints.length) {
      this.moving = false;
      return true;
    }
    const target = this.waypoints[0];
    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.05) {
      this.x = target.x;
      this.z = target.z;
      if (typeof target.yaw === 'number') this.yaw = target.yaw;
      this.waypoints.shift();
      if (!this.waypoints.length) {
        this.moving = false;
        return true;
      }
      return false;
    }

    const step = Math.min(dist, this.speed * dt);
    const ux = dx / dist;
    const uz = dz / dist;
    this.x += ux * step;
    this.z += uz * step;

    const desiredYaw = Math.atan2(-ux, -uz);
    const diff = wrapAngle(desiredYaw - this.yaw);
    this.yaw = wrapAngle(this.yaw + Math.sign(diff) * Math.min(Math.abs(diff), dt * 9));
    this.moving = true;
    this.wheelPhase += step * 5.0;
    return false;
  }

  update(dt, controller) {
    if (!controller || controller.paused || !Number.isFinite(dt) || dt <= 0) return;
    const clampedDt = Math.min(dt, 0.2);

    if (this.orderState === 'none') {
      this.speed = 1.55;
      this.zone = 'lobby';
      this.y = (this.floor - 5) * PITCH;
      const done = this.stepWaypoints(clampedDt);
      if (done) {
        this.waitTimer -= clampedDt;
        if (this.waitTimer <= 0) {
          this.waitTimer = 2.5 + (this.patrolIndex % 3) * 1.2;
          this.planNextPatrol();
        }
      }
    } else if (this.orderState === 'going_to_lift_up') {
      this.zone = 'lobby';
      this.y = 0;
      if (this.stepWaypoints(clampedDt)) {
        this.orderState = 'waiting_for_lift_up';
        this.yaw = 0;
      }
    } else if (this.orderState === 'waiting_for_lift_up') {
      this.moving = false;
      this.zone = 'lobby';
      this.y = 0;
      this.yaw = 0;
      const carAtFloor = controller.floor === 5 && controller.aligned();
      const doorReady =
        carAtFloor && (controller.state === 'open' || (controller.state === 'opening' && controller.door >= 0.85));
      const directionCompatible =
        controller.direction >= 0 || controller.ahead(controller.direction).length === 0;

      if (doorReady && directionCompatible) {
        this.orderState = 'boarding_up';
        this.transitTimer = 0;
        if (controller.state === 'open') controller.dwell = Math.max(controller.dwell, 2.2);
        this.waypoints = [
          { x: 0.0, z: 1.35 },
          { x: 0.0, z: 0.05, yaw: Math.PI },
        ];
      } else {
        const carBusyAtFloor = carAtFloor && controller.state !== 'idle';
        if (!controller.up.has(5) && !carBusyAtFloor) {
          controller.callHall(5, 1);
        }
      }
    } else if (this.orderState === 'boarding_up') {
      this.transitTimer += clampedDt;
      const canEnter =
        controller.floor === 5 &&
        controller.aligned() &&
        (controller.state === 'open' || controller.state === 'opening' || this.z < 1.45);
      if (!canEnter) {
        controller.setObstruction(false, 'robot');
        this.zone = 'lobby';
        this.orderState = 'waiting_for_lift_up';
        this.x = 0.0;
        this.z = 2.05;
        this.waypoints = [];
      } else {
        const done = this.stepWaypoints(clampedDt) || this.transitTimer > 3.2;
        if (this.z <= 0.66 || done) {
          this.zone = 'cabin';
          this.y = controller.position - 5 * PITCH;
        }
        if (done) {
          this.x = 0.0;
          this.z = 0.05;
          this.zone = 'cabin';
          this.yaw = Math.PI;
          this.moving = false;
          this.orderState = 'riding_up';
          this.transitTimer = 0;
          controller.setObstruction(false, 'robot');
          controller.callCar(ROOM.floor);
        }
      }
    } else if (this.orderState === 'riding_up') {
      this.moving = false;
      this.zone = 'cabin';
      this.floor = controller.floor;
      this.y = controller.position - 5 * PITCH;
      this.yaw = Math.PI;
      const arrived =
        controller.floor === ROOM.floor &&
        controller.aligned() &&
        (controller.state === 'open' || (controller.state === 'opening' && controller.door >= 0.85));
      if (arrived) {
        this.orderState = 'exiting_at_room_floor';
        this.transitTimer = 0;
        if (controller.state === 'open') controller.dwell = Math.max(controller.dwell, 2.2);
        this.waypoints = [
          { x: 0.0, z: 0.55 },
          { x: -0.2, z: 1.6 },
          { x: -0.95, z: 2.85, yaw: -0.55 },
        ];
      } else if (controller.floor !== ROOM.floor && !controller.car.has(ROOM.floor) && controller.state !== 'opening') {
        controller.callCar(ROOM.floor);
      }
    } else if (this.orderState === 'exiting_at_room_floor') {
      this.transitTimer += clampedDt;
      const done = this.stepWaypoints(clampedDt) || this.transitTimer > 3.2;
      if (this.z >= 1.4 || done) {
        this.zone = 'lobby';
        this.floor = ROOM.floor;
        this.y = (ROOM.floor - 5) * PITCH;
      } else {
        this.zone = 'cabin';
        this.y = controller.position - 5 * PITCH;
      }
      if (done) {
        this.x = -0.95;
        this.z = 2.85;
        this.yaw = -0.55;
        this.zone = 'lobby';
        this.floor = ROOM.floor;
        this.y = (ROOM.floor - 5) * PITCH;
        this.moving = false;
        this.transitTimer = 0;
        this.waitTimer = 25;
        this.orderState = 'arrived_at_room';
        controller.setObstruction(false, 'robot');
        // Deliver tray to desk immediately and notify guest at the door
        this.room?.deliverFood(this.orderItem);
        this.onNotify?.(
          `🔔 [띵동] 서빙 로봇 딜리가 ${FLOORS[ROOM.floor]}층 301호 앞에 [${this.orderItem}]을(를) 배달했습니다! 책상 위 트레이 또는 로봇을 클릭해 확인하세요.`
        );
      }
    } else if (this.orderState === 'arrived_at_room') {
      this.moving = false;
      this.zone = 'lobby';
      this.floor = ROOM.floor;
      this.y = (ROOM.floor - 5) * PITCH;
      this.waitTimer -= clampedDt;
      if (this.waitTimer <= 0 || (this.room && !this.room.foodItem)) {
        this.completeDelivery(controller.time);
      }
    } else if (this.orderState === 'going_to_lift_down') {
      this.zone = 'lobby';
      this.y = (ROOM.floor - 5) * PITCH;
      if (this.stepWaypoints(clampedDt)) {
        this.orderState = 'waiting_for_lift_down';
        this.yaw = 0;
      }
    } else if (this.orderState === 'waiting_for_lift_down') {
      this.moving = false;
      this.zone = 'lobby';
      this.y = (ROOM.floor - 5) * PITCH;
      this.yaw = 0;
      const carAtFloor = controller.floor === ROOM.floor && controller.aligned();
      const doorReady =
        carAtFloor && (controller.state === 'open' || (controller.state === 'opening' && controller.door >= 0.85));
      const directionCompatible =
        controller.direction <= 0 || controller.ahead(controller.direction).length === 0;

      if (doorReady && directionCompatible) {
        this.orderState = 'boarding_down';
        this.transitTimer = 0;
        if (controller.state === 'open') controller.dwell = Math.max(controller.dwell, 2.2);
        this.waypoints = [
          { x: 0.0, z: 1.35 },
          { x: 0.0, z: 0.05, yaw: Math.PI },
        ];
      } else {
        const carBusyAtFloor = carAtFloor && controller.state !== 'idle';
        if (!controller.down.has(ROOM.floor) && !carBusyAtFloor) {
          controller.callHall(ROOM.floor, -1);
        }
      }
    } else if (this.orderState === 'boarding_down') {
      this.transitTimer += clampedDt;
      const canEnter =
        controller.floor === ROOM.floor &&
        controller.aligned() &&
        (controller.state === 'open' || controller.state === 'opening' || this.z < 1.45);
      if (!canEnter) {
        controller.setObstruction(false, 'robot');
        this.zone = 'lobby';
        this.orderState = 'waiting_for_lift_down';
        this.x = 0.65;
        this.z = 2.05;
        this.waypoints = [];
      } else {
        const done = this.stepWaypoints(clampedDt) || this.transitTimer > 3.2;
        if (this.z <= 0.66 || done) {
          this.zone = 'cabin';
          this.y = controller.position - 5 * PITCH;
        }
        if (done) {
          this.x = 0.0;
          this.z = 0.05;
          this.zone = 'cabin';
          this.yaw = Math.PI;
          this.moving = false;
          this.orderState = 'riding_down';
          this.transitTimer = 0;
          controller.setObstruction(false, 'robot');
          controller.callCar(5);
        }
      }
    } else if (this.orderState === 'riding_down') {
      this.moving = false;
      this.zone = 'cabin';
      this.floor = controller.floor;
      this.y = controller.position - 5 * PITCH;
      this.yaw = Math.PI;
      const arrived =
        controller.floor === 5 &&
        controller.aligned() &&
        (controller.state === 'open' || (controller.state === 'opening' && controller.door >= 0.85));
      if (arrived) {
        this.orderState = 'exiting_to_lobby';
        this.transitTimer = 0;
        if (controller.state === 'open') controller.dwell = Math.max(controller.dwell, 2.2);
        this.waypoints = [
          { x: 0.0, z: 0.55 },
          { x: 0.0, z: 1.6 },
          { x: 0.8, z: 4.5 },
        ];
      } else if (controller.floor !== 5 && !controller.car.has(5) && controller.state !== 'opening') {
        controller.callCar(5);
      }
    } else if (this.orderState === 'exiting_to_lobby') {
      this.transitTimer += clampedDt;
      const done = this.stepWaypoints(clampedDt) || this.transitTimer > 3.2;
      if (this.z >= 1.4 || done) {
        this.zone = 'lobby';
        this.floor = 5;
        this.y = 0;
      } else {
        this.zone = 'cabin';
        this.y = controller.position - 5 * PITCH;
      }
      if (done) {
        this.zone = 'lobby';
        this.floor = 5;
        this.y = 0;
        this.orderState = 'none';
        this.orderItem = null;
        this.carryingOrder = false;
        this.transitTimer = 0;
        controller.setObstruction(false, 'robot');
        this.planNextPatrol();
      }
    }

    controller.setObstruction(this.blocksDoor(controller), 'robot');
  }
}
