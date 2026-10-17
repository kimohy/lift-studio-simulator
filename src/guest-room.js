export const ROOM = {
  floor: 7,
  number: '301',
  doorX: -1.38,
  entry: [-1.75, -1.01],
  bounds: [-2.28, 2.28, 4.05, 13.65],
};

export const ROOM_TV_CHANNELS = [
  { id: 'welcome', label: '호텔 웰컴 채널', title: 'GRAND HOTEL', subtitle: 'Welcome · Room 301' },
  { id: 'cinema', label: '시네마 채널', title: 'HOTEL CINEMA', subtitle: 'Midnight in Grand Budapest' },
  { id: 'lounge', label: '라운지 뮤직 채널', title: 'JAZZ LOUNGE', subtitle: 'Smooth Night Ambience ♬' },
  { id: 'off', label: '꺼짐', title: '', subtitle: '' },
];

export const ROOM_LIGHT_MODES = [
  { id: 'bright', label: '전체 밝은 조명' },
  { id: 'warm', label: '은은한 무드 조명' },
  { id: 'night', label: '취침 수면등 모드' },
];

const within = (v, a, b) => v >= a - 1e-7 && v <= b + 1e-7;

export class GuestRoom {
  constructor(stay) {
    this.stay = stay;
    this.obstacles = [];
    this.reset();
  }

  reset() {
    this.open = 0;
    this.target = 0;
    this.tvIndex = 0;
    this.lightIndex = 0;
    this.curtainOpen = 1;
    this.curtainTarget = 1;
    this.showerOn = false;
    this.foodItem = null;
  }

  get tvMode() {
    return ROOM_TV_CHANNELS[this.tvIndex].id;
  }

  get lightMode() {
    return ROOM_LIGHT_MODES[this.lightIndex].id;
  }

  addObstacle(minX, maxX, minZ, maxZ) {
    this.obstacles.push({ minX, maxX, minZ, maxZ });
  }

  inGateway(x, z) {
    return within(x, ...ROOM.entry) && within(z, 3.42, 4.13);
  }

  inside(x, z) {
    return within(x, ROOM.bounds[0], ROOM.bounds[1]) && within(z, ROOM.bounds[2], ROOM.bounds[3]);
  }

  contains(x, z, floor) {
    return floor === ROOM.floor && (this.inGateway(x, z) || this.inside(x, z));
  }

  occupied(p) {
    return p?.floor === ROOM.floor && within(p.x, -2.05, -0.6) && within(p.z, 3.25, 4.75);
  }

  toggle(p) {
    if (this.target && this.occupied(p)) {
      return { ok: false, message: '문에서 조금 떨어진 뒤 닫아 주세요.' };
    }
    if (!this.target && p?.zone !== 'room' && !this.stay.canAccess(ROOM.number)) {
      return { ok: false, message: '301호 키카드가 필요합니다. 1층 리셉션에서 체크인해 주세요.' };
    }
    this.target = this.target ? 0 : 1;
    return {
      ok: true,
      message: this.target ? '301호 문을 엽니다. WASD로 들어가세요.' : '301호 문을 닫고 잠급니다.',
    };
  }

  cycleTV() {
    this.tvIndex = (this.tvIndex + 1) % ROOM_TV_CHANNELS.length;
    const ch = ROOM_TV_CHANNELS[this.tvIndex];
    return {
      mode: ch.id,
      message: ch.id === 'off' ? '객실 스마트 TV를 껐습니다.' : `스마트 TV · [${ch.label}]로 전환했습니다.`,
    };
  }

  cycleLight() {
    this.lightIndex = (this.lightIndex + 1) % ROOM_LIGHT_MODES.length;
    const mode = ROOM_LIGHT_MODES[this.lightIndex];
    return {
      mode: mode.id,
      message: `객실 조명을 [${mode.label}](으)로 변경했습니다.`,
    };
  }

  toggleCurtain() {
    this.curtainTarget = this.curtainTarget ? 0 : 1;
    return {
      open: Boolean(this.curtainTarget),
      message: this.curtainTarget
        ? '전동 커튼을 열어 시티뷰 파노라마 창문을 개방합니다.'
        : '전동 커튼을 닫아 아늑한 객실 분위기를 만듭니다.',
    };
  }

  toggleShower() {
    this.showerOn = !this.showerOn;
    return {
      on: this.showerOn,
      message: this.showerOn
        ? '레인 샤워기에서 따뜻한 물이 쏟아집니다. 상쾌한 물소리가 울립니다.'
        : '레인 샤워기 수전을 잠갔습니다.',
    };
  }

  restOnBed(player) {
    if (player && player.floor === ROOM.floor && player.zone === 'room') {
      player.x = 0.25;
      player.z = 10.2;
      player.yaw = 0.85;
      player.pitch = -0.05;
    }
    return {
      message: '푹신한 킹사이즈 침대에 기대어 잠시 휴식을 취합니다. 호텔 스카이라인이 한눈에 들어옵니다.',
    };
  }

  deliverFood(item) {
    this.foodItem = item;
  }

  consumeFood() {
    if (!this.foodItem) {
      return { ok: false, message: '아직 도착한 룸서비스 음식이 없습니다. 책상 위 태블릿으로 주문해 보세요.' };
    }
    const item = this.foodItem;
    this.foodItem = null;
    return {
      ok: true,
      item,
      message: `룸서비스로 배달된 [${item}]을(를) 맛있게 즐겼습니다! 기분이 한결 상쾌해집니다. ☕🥐`,
    };
  }

  update(dt, p) {
    if (!this.target && this.open > 0 && this.occupied(p)) {
      this.target = 1;
    }
    const clamped = Math.min(Math.max(dt, 0), 0.1);
    const d = clamped / 0.8;
    this.open = this.target ? Math.min(1, this.open + d) : Math.max(0, this.open - d);

    const cd = clamped / 1.1;
    this.curtainOpen = this.curtainTarget
      ? Math.min(1, this.curtainOpen + cd)
      : Math.max(0, this.curtainOpen - cd);
  }

  canOccupy(x, z, p, c) {
    if (!this.contains(x, z, p.floor) || Math.abs(p.groundY(c) - 7) > 0.04) return false;
    if (this.inGateway(x, z) && this.open < 0.95) return false;
    if (p.zone !== 'room' && !(this.inGateway(p.x, p.z) || this.inGateway(x, z))) return false;
    if (this.open >= 0.95 && within(x, -2.08, -1.72) && within(z, 3.55, 4.69)) return false;
    if (this.obstacles.some((o) => within(x, o.minX - 0.17, o.maxX + 0.17) && within(z, o.minZ - 0.17, o.maxZ + 0.17))) {
      return false;
    }
    return true;
  }

  canExit(x, z, p) {
    return within(x, ...ROOM.entry) && within(z, 1.4, 3.42) && p.z <= 3.6;
  }
}
