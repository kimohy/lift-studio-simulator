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

export const ROOM_ESPRESSO_CAPSULES = [
  '콜롬비아 수프리모 에스프레소 ☕',
  '에티오피아 예가체프 아메리카노 ☕',
  '스위스 디카페인 벨벳 룽고 ☕',
  '마다가스카르 바닐라 카페라떼 ☕',
];

export const ROOM_MINIBAR_ITEMS = [
  '이탈리아 산펠레그리노 스파클링 워터 🥂',
  '프랑스 보르도 하프 보틀 레드 와인 🍷',
  '벨기에 수제 프랄린 초콜릿 박스 🍫',
  '유기농 제주 감귤 착즙 주스 🍊',
];

export const ROOM_AC_MODES = [
  { temp: 22, mode: '쾌적 냉방', display: '22°C · COOL' },
  { temp: 24, mode: '에코 오토', display: '24°C · AUTO' },
  { temp: 26, mode: '포근 난방', display: '26°C · WARM' },
  { temp: 20, mode: '파워 쿨링', display: '20°C · TURBO' },
];

export const ROOM_AUDIO_TRACKS = [
  { id: 'off', label: '대기 중 (OFF)', playing: false },
  { id: 'jazz', label: 'Late Night Hotel Jazz Trio 🎷', playing: true },
  { id: 'bossa', label: 'Sunset Bossa Nova Lounge 🎸', playing: true },
  { id: 'classic', label: 'Debussy Clair de Lune Piano 🎹', playing: true },
];

export const ROOM_PHONE_SERVICES = [
  '프런트 데스크: "301호 고객님, 레이트 체크아웃(14:00) 요청을 무료로 등록해 드렸습니다." 📞',
  '하우스키핑: "구스다운 추가 베개와 호텔 시그니처 배스 어메니티 세트를 곧 준비해 드리겠습니다." 🛏️',
  '컨시어지 데스크: "루프탑 인피니티 풀(10F)은 현재 쾌적하게 운영 중이며 수건이 비치되어 있습니다." 🏊',
  '모닝콜 서비스: "내일 아침 07:30 부드러운 재즈 해피콜 알람이 설정되었습니다." ⏰',
];

export const ROOM_DIFFUSER_SCENTS = [
  { id: 'off', label: '꺼짐 (OFF)', active: false, color: 0x3b4d54 },
  { id: 'cedar', label: '그랜드 시그니처 화이트 시더 & 베르가못 🌿', active: true, color: 0x76e8c7 },
  { id: 'lavender', label: '프로방스 프렌치 라벤더 수면 테라피 💜', active: true, color: 0xc28cff },
  { id: 'fig', label: '지중해 무화과 & 앰버 우드 🕯️', active: true, color: 0xffb86b },
];

export const ROOM_PRIVACY_MODES = [
  { id: 'normal', label: '일반 대기', badge: 'ROOM 301', sub: 'WELCOME', color: 0x3b4d54 },
  { id: 'dnd', label: '방해 금지 (Do Not Disturb)', badge: 'DO NOT DISTURB', sub: '방해 금지 🔕', color: 0xe05a47 },
  { id: 'makeup', label: '객실 정비 요청 (Make Up Room)', badge: 'MAKE UP ROOM', sub: '객실 청소 요청 🧹', color: 0x4cc990 },
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
    this.coffeeIndex = 0;
    this.coffeeBrewed = false;
    this.minibarOpen = 0;
    this.minibarTarget = 0;
    this.minibarIndex = 0;
    this.safeOpen = 0;
    this.safeTarget = 0;
    this.acIndex = 0;
    this.audioIndex = 0;
    this.wearingRobe = false;
    this.mirrorLit = true;
    this.toiletFlushing = 0;
    this.phoneIndex = 0;
    this.diffuserIndex = 0;
    this.suitcaseOpen = 0;
    this.suitcaseTarget = 0;
    this.privacyIndex = 0;
    this.workLaptopOn = true;
  }

  get tvMode() {
    return ROOM_TV_CHANNELS[this.tvIndex].id;
  }

  get lightMode() {
    return ROOM_LIGHT_MODES[this.lightIndex].id;
  }

  get acMode() {
    return ROOM_AC_MODES[this.acIndex];
  }

  get audioTrack() {
    return ROOM_AUDIO_TRACKS[this.audioIndex];
  }

  get diffuserScent() {
    return ROOM_DIFFUSER_SCENTS[this.diffuserIndex];
  }

  get privacyMode() {
    return ROOM_PRIVACY_MODES[this.privacyIndex];
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

  sitArmchair(player) {
    if (player && player.floor === ROOM.floor && player.zone === 'room') {
      player.x = 0.65;
      player.z = 11.75;
      player.yaw = Math.PI;
      player.pitch = -0.04;
    }
    return {
      ok: true,
      message: '🪑 창가 라운지 암체어에 앉아 파노라마 시티뷰와 함께 여유로운 독서·휴식 시간을 즐깁니다.',
    };
  }

  sitDesk(player) {
    if (player && player.floor === ROOM.floor && player.zone === 'room') {
      player.x = 0.68;
      player.z = 8.6;
      player.yaw = -Math.PI / 2;
      player.pitch = -0.08;
    }
    this.workLaptopOn = !this.workLaptopOn;
    return {
      ok: true,
      laptopOn: this.workLaptopOn,
      message: this.workLaptopOn
        ? '💻 워크 데스크에 앉아 초고속 호텔 Wi-Fi로 노트북 워크스테이션을 켰습니다. (WASD로 언제든 이동 가능)'
        : '💻 데스크에 앉아 노트북을 슬립 모드로 전환하고 잠시 눈의 피로를 풉니다.',
    };
  }

  brewCoffee() {
    const capsule = ROOM_ESPRESSO_CAPSULES[this.coffeeIndex % ROOM_ESPRESSO_CAPSULES.length];
    this.coffeeIndex++;
    this.coffeeBrewed = true;
    return {
      ok: true,
      capsule,
      message: `☕ 캡슐 커피 머신에서 [${capsule}]를 막 추출했습니다! 객실 가득 진한 크레마 향기가 퍼집니다.`,
    };
  }

  useMinibar() {
    if (!this.minibarTarget) {
      this.minibarTarget = 1;
      const item = ROOM_MINIBAR_ITEMS[this.minibarIndex % ROOM_MINIBAR_ITEMS.length];
      this.minibarIndex++;
      return {
        ok: true,
        open: true,
        item,
        message: `🥂 미니바 냉장고를 열어 시원한 [${item}]를 꺼내 즐깁니다. (다시 클릭하면 도어 닫기)`,
      };
    }
    this.minibarTarget = 0;
    return {
      ok: true,
      open: false,
      message: '미니바 냉장고 문을 닫았습니다.',
    };
  }

  toggleSafe() {
    this.safeTarget = this.safeTarget ? 0 : 1;
    return {
      ok: true,
      open: Boolean(this.safeTarget),
      message: this.safeTarget
        ? '🔐 디지털 금고 잠금을 해제하고 문을 열었습니다. 여권과 귀중품을 안전하게 보관할 수 있습니다.'
        : '🔒 디지털 금고 문을 닫고 보안 잠금을 설정했습니다.',
    };
  }

  cycleThermostat() {
    this.acIndex = (this.acIndex + 1) % ROOM_AC_MODES.length;
    const ac = this.acMode;
    return {
      ok: true,
      temp: ac.temp,
      mode: ac.mode,
      message: `🌡️ 객실 스마트 온도조절기를 [${ac.temp}°C · ${ac.mode}] 모드로 설정했습니다.`,
    };
  }

  cycleAudio() {
    this.audioIndex = (this.audioIndex + 1) % ROOM_AUDIO_TRACKS.length;
    const track = this.audioTrack;
    return {
      ok: true,
      track: track.id,
      playing: track.playing,
      message: track.playing
        ? `🎵 블루투스 스피커에서 [${track.label}] 음악이 은은하게 흘러나옵니다.`
        : '블루투스 스피커 음악 재생을 정지했습니다.',
    };
  }

  toggleWardrobe() {
    this.wearingRobe = !this.wearingRobe;
    return {
      ok: true,
      wearingRobe: this.wearingRobe,
      message: this.wearingRobe
        ? '🥼 오픈 옷장에서 구김 없는 순면 호텔 배스로브(가운)와 슬리퍼로 갈아입었습니다. 한결 편안합니다!'
        : '👔 호텔 배스로브를 옷장에 걸어두고 외출 복장으로 갈아입었습니다.',
    };
  }

  toggleVanityMirror() {
    this.mirrorLit = !this.mirrorLit;
    return {
      ok: true,
      mirrorLit: this.mirrorLit,
      message: this.mirrorLit
        ? '🪞 욕실 스마트 터치 거울의 김서림 방지(Anti-Fog) 및 할로 LED 메이크업 조명을 켰습니다.'
        : '🪞 욕실 스마트 터치 거울의 할로 LED 조명을 껐습니다.',
    };
  }

  flushToilet() {
    this.toiletFlushing = 1.6;
    return {
      ok: true,
      flushing: true,
      message: '🚽 스마트 비데 양변기의 자동 물내림 및 UV 살균 클리닝 기능이 작동합니다.',
    };
  }

  callConciergePhone() {
    const msg = ROOM_PHONE_SERVICES[this.phoneIndex % ROOM_PHONE_SERVICES.length];
    this.phoneIndex++;
    return {
      ok: true,
      message: msg,
    };
  }

  cycleDiffuser() {
    this.diffuserIndex = (this.diffuserIndex + 1) % ROOM_DIFFUSER_SCENTS.length;
    const scent = this.diffuserScent;
    return {
      ok: true,
      scent: scent.id,
      active: scent.active,
      message: scent.active
        ? `🌿 아로마 스톤 디퓨저에서 [${scent.label}] 향기 미스트가 은은하게 피어오릅니다.`
        : '아로마 디퓨저 미스트 분사를 정지했습니다.',
    };
  }

  toggleSuitcase() {
    this.suitcaseTarget = this.suitcaseTarget ? 0 : 1;
    return {
      ok: true,
      open: Boolean(this.suitcaseTarget),
      message: this.suitcaseTarget
        ? '🧳 러기지 랙 위의 여행용 하드 캐리어를 열어 짐과 카메라, 여권 파우치를 정리합니다.'
        : '🧳 여행용 하드 캐리어를 깔끔하게 닫았습니다.',
    };
  }

  cyclePrivacySign() {
    this.privacyIndex = (this.privacyIndex + 1) % ROOM_PRIVACY_MODES.length;
    const mode = this.privacyMode;
    return {
      ok: true,
      mode: mode.id,
      message: `🔔 객실 도어 프라이버시 패널을 [${mode.label}] 상태로 전환했습니다. 복도 외부 표시등에 즉시 반영됩니다.`,
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

    const md = clamped / 0.5;
    this.minibarOpen = this.minibarTarget
      ? Math.min(1, this.minibarOpen + md)
      : Math.max(0, this.minibarOpen - md);
    this.safeOpen = this.safeTarget
      ? Math.min(1, this.safeOpen + md)
      : Math.max(0, this.safeOpen - md);
    this.suitcaseOpen = this.suitcaseTarget
      ? Math.min(1, this.suitcaseOpen + md)
      : Math.max(0, this.suitcaseOpen - md);

    if (this.toiletFlushing > 0) {
      this.toiletFlushing = Math.max(0, this.toiletFlushing - clamped);
    }
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
