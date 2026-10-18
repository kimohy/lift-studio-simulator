export const POOL_FLOOR = 14; // 10F

export const POOL_LIGHT_MODES = [
  { id: 'aqua', label: '아쿠아 오션 블루 & 분수 가동', color: 0x2fd9f7, fountain: true },
  { id: 'sunset', label: '선셋 골드 앰비언스 & 분수 가동', color: 0xffad52, fountain: true },
  { id: 'violet', label: '네온 나이트 바이올렛 & 분수 가동', color: 0xb968ff, fountain: true },
  { id: 'calm', label: '차분한 에메랄드 수면 (분수 정지)', color: 0x3bc4b2, fountain: false },
];

export const POOL_BAR_MENU = [
  '트로피컬 선셋 시그니처 칵테일 🍹',
  '프레시 애플민트 버진 모히또 🥂',
  '리조트 아이스 코코넛 워터 🥥',
  '유자 & 시트러스 스파클링 에이드 🍋',
];

const within = (v, a, b) => v >= a - 1e-7 && v <= b + 1e-7;

export class RooftopPool {
  constructor() {
    this.obstacles = [];
    this.reset();
  }

  reset() {
    this.lightIndex = 0;
    this.jacuzziOn = true;
    this.drinkIndex = 0;
    this.lastDrink = null;
  }

  get lightMode() {
    return POOL_LIGHT_MODES[this.lightIndex];
  }

  get fountainOn() {
    return POOL_LIGHT_MODES[this.lightIndex].fountain;
  }

  addObstacle(minX, maxX, minZ, maxZ) {
    this.obstacles.push({ minX, maxX, minZ, maxZ });
  }

  inGateway(x, z) {
    return within(x, -0.92, 0.92) && within(z, 3.42, 4.25);
  }

  inCorridor(x, z) {
    return within(x, -2.18, 2.18) && within(z, 4.05, 8.25);
  }

  inDeck(x, z) {
    return within(x, -11.2, 11.0) && within(z, 8.0, 25.2);
  }

  inPool(x, z) {
    return within(x, -5.85, 5.85) && within(z, 14.75, 22.85);
  }

  inJacuzzi(x, z) {
    return Math.hypot(x - 8.5, z - 17.5) <= 1.42;
  }

  isWater(x, z, floor = POOL_FLOOR) {
    return floor === POOL_FLOOR && (this.inPool(x, z) || this.inJacuzzi(x, z));
  }

  contains(x, z, floor) {
    return floor === POOL_FLOOR && (this.inGateway(x, z) || this.inCorridor(x, z) || this.inDeck(x, z));
  }

  canOccupy(x, z, player, controller) {
    if (!this.contains(x, z, player.floor)) return false;
    const base = (POOL_FLOOR - 5) * 3.5;
    if (Math.abs(player.groundY(controller) - base) > 0.08) return false;
    if (
      this.obstacles.some(
        (o) => within(x, o.minX - 0.18, o.maxX + 0.18) && within(z, o.minZ - 0.18, o.maxZ + 0.18)
      )
    ) {
      return false;
    }
    return true;
  }

  canExit(x, z, player) {
    return within(x, -0.92, 0.92) && within(z, 1.4, 3.42) && player.z <= 3.7;
  }

  toggleSwim(player) {
    if (!player || player.floor !== POOL_FLOOR) {
      return { ok: false, swimming: false, message: '10층 루프탑 수영장에서 이용할 수 있습니다.' };
    }
    if (this.inPool(player.x, player.z)) {
      player.x = 0.0;
      player.z = 13.7;
      player.yaw = Math.PI;
      player.pitch = -0.05;
      player.zone = 'pool';
      return {
        ok: true,
        swimming: false,
        message: '인피니티 풀에서 나와 따뜻한 티크 우드 데크 위로 올라왔습니다.',
      };
    }
    player.x = 0.0;
    player.z = 18.6;
    player.yaw = Math.PI;
    player.pitch = -0.02;
    player.zone = 'pool';
    return {
      ok: true,
      swimming: true,
      message: '🏊 10층 루프탑 온수 인피니티 풀에 입수했습니다! WASD로 물속을 헤엄치며 탁 트인 시티뷰를 감상해 보세요.',
    };
  }

  toggleJacuzzi(player) {
    if (player && player.floor === POOL_FLOOR && !this.inJacuzzi(player.x, player.z)) {
      this.jacuzziOn = true;
      player.x = 8.5;
      player.z = 17.5;
      player.yaw = 0.6;
      player.pitch = -0.04;
      player.zone = 'pool';
      return {
        ok: true,
        on: this.jacuzziOn,
        message: '♨️ 루프탑 온수 자쿠지 스파에 들어왔습니다! 따뜻한 버블 제트가 피로를 풀어줍니다. (다시 클릭하면 버블 제어/이동)',
      };
    }
    this.jacuzziOn = !this.jacuzziOn;
    return {
      ok: true,
      on: this.jacuzziOn,
      message: this.jacuzziOn
        ? '♨️ 자쿠지 월풀 버블 제트를 가동했습니다. 따뜻한 기포가 보글보글 올라옵니다.'
        : '자쿠지 월풀 버블 제트를 정지했습니다.',
    };
  }

  cyclePoolLight() {
    this.lightIndex = (this.lightIndex + 1) % POOL_LIGHT_MODES.length;
    const mode = POOL_LIGHT_MODES[this.lightIndex];
    return {
      mode: mode.id,
      fountain: mode.fountain,
      message: `✨ 루프탑 인피니티 풀 수중 조명·분수를 [${mode.label}] 모드로 변경했습니다.`,
    };
  }

  restOnSunbed(player, targetX = -4.2, targetZ = 12.85) {
    if (player && player.floor === POOL_FLOOR) {
      player.x = targetX;
      player.z = targetZ;
      player.yaw = Math.PI;
      player.pitch = -0.04;
      player.zone = 'pool';
    }
    return {
      ok: true,
      message: '🏖️ 풀사이드 선베드에 편안히 누워 루프탑 인피니티 풀과 도시 스카이라인을 감상합니다. (WASD로 언제든 이동 가능)',
    };
  }

  orderPoolDrink() {
    const drink = POOL_BAR_MENU[this.drinkIndex % POOL_BAR_MENU.length];
    this.drinkIndex++;
    this.lastDrink = drink;
    return {
      ok: true,
      drink,
      message: `🍸 루프탑 스카이 바 바텐더 레오: "시원한 [${drink}] 준비해 드렸습니다! 인피니티 풀에서 여유로운 시간 보내세요!"`,
    };
  }
}
