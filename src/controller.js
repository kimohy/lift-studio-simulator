export const FLOORS = ['B5', 'B4', 'B3', 'B2', 'B1', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
export const PITCH = 3.5;

export const CABIN_LIGHT_MODES = [
  { id: 'warm', label: '웜 샴페인 골드', color: 0xffe8c5, led: 0xffe2b3, intensity: 16 },
  { id: 'daylight', label: '크리스탈 데이라이트', color: 0xeaf6ff, led: 0xd8f0ff, intensity: 20 },
  { id: 'lounge', label: '스카이 라운지 앰비언트', color: 0xc2b8ff, led: 0x9888ff, intensity: 12 },
  { id: 'night', label: '나이트 무드 디밍', color: 0xffb36b, led: 0xd98a4c, intensity: 8 },
];

export const CABIN_FAN_MODES = [
  { id: 'auto', label: '자동 청정 환기 (AUTO)', speed: 1, aqi: '좋음 8 µg/m³' },
  { id: 'turbo', label: '터보 쾌속 환기 (TURBO)', speed: 2.8, aqi: '매우 좋음 5 µg/m³' },
  { id: 'eco', label: '저소음 정숙 환기 (QUIET)', speed: 0.45, aqi: '좋음 9 µg/m³' },
  { id: 'off', label: '환기 팬 대기 (OFF)', speed: 0, aqi: '보통 14 µg/m³' },
];

export const CABIN_MUSIC_TRACKS = [
  { id: 'chanson', label: 'Grand Hotel Lounge Piano 🎹', playing: true },
  { id: 'bossa', label: 'Classic Bossa Nova Elevator 🎷', playing: true },
  { id: 'strings', label: 'Vivaldi Four Seasons Strings 🎻', playing: true },
  { id: 'off', label: '배경음악 끔 (MUTE)', playing: false },
];

export const CABIN_INTERCOM_RESPONSES = [
  '방재센터: "그랜드 호텔 24시간 엘리베이터 관제실입니다. 현재 엘리베이터는 모든 안전 센서가 정상 작동 중입니다." 🎙️',
  '컨시어지 데스크: "객실 301호는 3층, 루프탑 인피니티 풀은 10층, 그랜드 카페는 1층 로비에 위치해 있습니다." ✨',
  '기술지원팀: "로프 장력·비상 브레이크·도어 광전센서 실시간 원격 모니터링 결과 이상 없습니다. 편안한 탑승 되세요." 🛡️',
];

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
    this.vipMode = false;
    this.accessibleMode = false;
    this.accessibleTripDone = false;
    this.paused = false;
    this.cabinLightIndex = 0;
    this.cabinFanIndex = 0;
    this.cabinMusicIndex = 0;
    this.intercomIndex = 0;
    this.intercomActiveUntil = 0;
    this.tenKeyBuffer = '';
    this.tenKeyTimer = 0;
    this.tenKeyDisplay = 'READY';
    this.tenKeyLastOneCommitAt = -99;
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

  get effectiveDwellSeconds() {
    // Additive so it still extends when voice guidance has already raised the base dwell (3s → 9s).
    return this.accessibleMode ? this.doorDwellSeconds + 4.5 : this.doorDwellSeconds;
  }

  get effectiveCloseSeconds() {
    return this.accessibleMode ? Math.round((this.doorCloseSeconds + 1.1) * 100) / 100 : this.doorCloseSeconds;
  }

  get cabinLightMode() {
    return CABIN_LIGHT_MODES[this.cabinLightIndex % CABIN_LIGHT_MODES.length];
  }

  get cabinFanMode() {
    return CABIN_FAN_MODES[this.cabinFanIndex % CABIN_FAN_MODES.length];
  }

  get cabinMusicTrack() {
    return CABIN_MUSIC_TRACKS[this.cabinMusicIndex % CABIN_MUSIC_TRACKS.length];
  }

  log(message, type = 'info') {
    this.events.unshift({ time: this.time, message, type });
    if (this.events.length > 40) this.events.length = 40;
  }

  pending() {
    if (this.vipMode) {
      return [...this.car].sort((a, b) => a - b);
    }
    return [...new Set([...this.car, ...this.up, ...this.down])].sort((a, b) => a - b);
  }

  ahead(dir = this.direction) {
    return this.pending().filter((n) => (n * PITCH - this.position) * dir > 0.02);
  }

  callCar(n) {
    if (!valid(n)) return false;
    return this.add(this.car, n, '내부');
  }

  cancelCar(n) {
    if (!valid(n) || !this.car.has(n)) return false;
    if (this.state === 'moving' && this.target === n) {
      const braking = (this.velocity * this.velocity) / (2 * this.accel) + 0.08;
      if (Math.abs(n * PITCH - this.position) <= braking) {
        return false;
      }
      this.car.delete(n);
      this.log(`${FLOORS[n]}층 · 내부 호출 취소`);
      const next = this.chooseTarget();
      if (next !== null && (next - this.position / PITCH) * this.direction > 0) {
        this.target = next;
        this.planMotion();
      }
      return true;
    }
    this.car.delete(n);
    this.log(`${FLOORS[n]}층 · 내부 호출 취소`);
    if (this.state === 'idle' && this.pending().length === 0) {
      this.direction = 0;
      this.target = null;
    }
    return true;
  }

  toggleCar(n, { allowCancel = false } = {}) {
    if (!valid(n)) return { ok: false, action: 'invalid', floor: n };
    if (allowCancel && this.car.has(n)) {
      const cancelled = this.cancelCar(n);
      return {
        ok: cancelled,
        action: cancelled ? 'cancelled' : 'locked',
        floor: n,
      };
    }
    const added = this.callCar(n);
    return {
      ok: added,
      action: added ? 'added' : 'exists',
      floor: n,
    };
  }

  clearCarCalls() {
    let cleared = 0;
    for (const n of [...this.car]) {
      if (this.cancelCar(n)) cleared++;
    }
    return cleared;
  }

  commitTenKeyFloor(floorIndex) {
    if (!valid(floorIndex)) {
      this.tenKeyBuffer = '';
      this.tenKeyTimer = 0;
      this.tenKeyDisplay = 'ERR';
      return {
        ok: false,
        action: 'invalid',
        display: 'ERR',
        message: '🔢 [10키 조작반] 유효하지 않은 층 번호입니다.',
      };
    }
    this.tenKeyBuffer = '';
    this.tenKeyTimer = 0;
    const res = this.toggleCar(floorIndex, { allowCancel: true });
    const label = FLOORS[floorIndex];
    if (floorIndex === 5 && res.action === 'added') {
      this.tenKeyLastOneCommitAt = this.time;
    }
    this.tenKeyDisplay =
      res.action === 'cancelled'
        ? `${label}F 취소`
        : res.action === 'locked'
          ? `${label}F LOCK`
          : `${label}F OK`;
    const eta = this.etaToFloor(floorIndex);
    const etaStr = eta ? ` (약 ${eta}초)` : '';
    const message =
      res.action === 'cancelled'
        ? `🔢 [10키 조작반] ${label}층 목적지 선택을 취소했습니다.`
        : res.action === 'locked'
          ? `🔢 [10키 조작반] ${label}층은 이미 감속 구간에 진입해 취소할 수 없습니다.`
          : `🔢 [10키 조작반] ${label}층 목적지가 등록되었습니다.${etaStr}`;
    return {
      ok: res.ok,
      action: res.action,
      floor: floorIndex,
      floorLabel: label,
      display: this.tenKeyDisplay,
      message,
    };
  }

  pressTenKey(rawKey) {
    const key = String(rawKey ?? '').trim().toUpperCase();
    if (key === 'CLR' || key === 'C' || key === 'CLEAR') {
      if (this.tenKeyBuffer) {
        this.tenKeyBuffer = '';
        this.tenKeyTimer = 0;
        this.tenKeyDisplay = 'READY';
        return {
          ok: true,
          action: 'cleared_buffer',
          display: 'READY',
          message: '🔢 [10키 조작반] 입력 중인 번호를 초기화했습니다.',
        };
      }
      const cleared = this.clearCarCalls();
      this.tenKeyDisplay = cleared > 0 ? 'ALL CLR' : 'READY';
      return {
        ok: true,
        action: 'cleared_calls',
        cleared,
        display: this.tenKeyDisplay,
        message:
          cleared > 0
            ? `🔢 [10키 조작반] 등록된 목적층 호출 ${cleared}건을 모두 취소했습니다.`
            : '🔢 [10키 조작반] 취소할 목적층 호출이 없습니다.',
      };
    }

    if (key === 'B' || key === '*' || key === '-') {
      if (this.tenKeyBuffer === '1') {
        this.commitTenKeyFloor(5);
      }
      this.tenKeyBuffer = 'B';
      this.tenKeyTimer = 4.0;
      this.tenKeyDisplay = 'B-';
      return {
        ok: true,
        action: 'buffer',
        buffer: 'B',
        display: 'B-',
        message: '🔢 [10키 조작반] 지하(B) 선택 · 이어서 1~5 키를 눌러 지하 층(B1~B5)을 선택하세요.',
      };
    }

    if (key === 'ENT' || key === '#' || key === 'OK' || key === 'ENTER') {
      if (this.tenKeyBuffer === '1') {
        return this.commitTenKeyFloor(5);
      }
      if (this.tenKeyBuffer === 'B') {
        this.tenKeyBuffer = '';
        this.tenKeyTimer = 0;
        this.tenKeyDisplay = 'ERR';
        return {
          ok: false,
          action: 'invalid',
          display: 'ERR',
          message: '🔢 [10키 조작반] 지하 층 번호(B1~B5)를 함께 입력해 주세요.',
        };
      }
      return {
        ok: true,
        action: 'noop',
        display: this.tenKeyDisplay,
        message: '🔢 [10키 조작반] 층 번호(1~9, 1→0=10층, B→1~5=지하층)를 입력하세요.',
      };
    }

    if (/^[0-9]$/.test(key)) {
      const digit = Number(key);
      if (this.tenKeyBuffer === 'B') {
        if (digit >= 1 && digit <= 5) {
          return this.commitTenKeyFloor(5 - digit);
        }
        this.tenKeyBuffer = '';
        this.tenKeyTimer = 0;
        this.tenKeyDisplay = 'ERR';
        return {
          ok: false,
          action: 'invalid',
          display: 'ERR',
          message: `🔢 [10키 조작반] 지하 B${digit}층은 존재하지 않습니다. (B1~B5만 가능)`,
        };
      }

      if (this.tenKeyBuffer === '1') {
        if (digit === 0) {
          return this.commitTenKeyFloor(14); // 10F
        }
        if (digit === 1) {
          return this.commitTenKeyFloor(5); // 1F confirmed immediately
        }
        // Commit buffered 1F and then commit the new floor (2F..9F)
        this.commitTenKeyFloor(5);
        return this.commitTenKeyFloor(digit + 4);
      }

      if (digit === 1) {
        this.tenKeyBuffer = '1';
        this.tenKeyTimer = 1.05;
        this.tenKeyDisplay = '1_';
        return {
          ok: true,
          action: 'buffer',
          buffer: '1',
          display: '1_',
          message: '🔢 [10키 조작반] 1 입력 · 0을 이어 누르면 10층, ↵(ENT) 또는 잠시 대기 시 1층이 등록됩니다.',
        };
      }

      if (digit === 0) {
        // If 1F was just auto-committed within 1.8s, upgrade it to 10F seamlessly
        if (this.time - this.tenKeyLastOneCommitAt <= 1.8 && this.car.has(5)) {
          this.cancelCar(5);
          this.tenKeyLastOneCommitAt = -99;
        }
        return this.commitTenKeyFloor(14);
      }

      // Digits 2..9 are unambiguous (2F..9F -> floorIndex 6..13)
      return this.commitTenKeyFloor(digit + 4);
    }

    return {
      ok: false,
      action: 'unknown',
      display: this.tenKeyDisplay,
      message: '🔢 [10키 조작반] 알 수 없는 키 입력입니다.',
    };
  }

  toggleAccessibleMode(force) {
    this.accessibleMode = typeof force === 'boolean' ? force : !this.accessibleMode;
    this.accessibleTripDone = false;
    if (this.accessibleMode && ['open', 'opening'].includes(this.state)) {
      this.dwell = Math.max(this.dwell, this.effectiveDwellSeconds);
    }
    const dwell = this.effectiveDwellSeconds;
    this.log(
      this.accessibleMode
        ? `♿ 장애인 배려 운전 활성화 · 문 열림 대기(${dwell}초) 및 저속 안전 닫힘 연장`
        : '♿ 장애인 배려 운전 해제 · 표준 도어 타이밍 복귀',
      'info'
    );
    return {
      ok: true,
      accessibleMode: this.accessibleMode,
      message: this.accessibleMode
        ? `♿ 우측 가로형 장애인용 조작반(배려 모드)이 활성화되었습니다. 문 열림 유지 시간(${dwell}초)과 닫힘 속도가 여유 있게 연장되며, 목적층 도착 후 자동 해제됩니다.`
        : '♿ 장애인 배려 운전 모드를 해제하고 일반 도어 개폐 시간으로 복귀했습니다.',
    };
  }

  cycleCabinLight() {
    this.cabinLightIndex = (this.cabinLightIndex + 1) % CABIN_LIGHT_MODES.length;
    const mode = this.cabinLightMode;
    this.log(`카 내부 조명 · ${mode.label}`);
    return {
      ok: true,
      mode,
      message: `💡 엘리베이터 내부 천장 조명을 [${mode.label}] 모드로 변경했습니다.`,
    };
  }

  cycleCabinFan() {
    this.cabinFanIndex = (this.cabinFanIndex + 1) % CABIN_FAN_MODES.length;
    const mode = this.cabinFanMode;
    this.log(`카 공기청정 환기 · ${mode.label}`);
    return {
      ok: true,
      mode,
      message: `🌀 엘리베이터 공기청정 환기 시스템을 [${mode.label} · 미세먼지 ${mode.aqi}]로 설정했습니다.`,
    };
  }

  cycleCabinMusic() {
    this.cabinMusicIndex = (this.cabinMusicIndex + 1) % CABIN_MUSIC_TRACKS.length;
    const track = this.cabinMusicTrack;
    this.log(`카 배경음악 · ${track.label}`);
    return {
      ok: true,
      track,
      message: track.playing
        ? `🎵 엘리베이터 라운지 스피커에서 [${track.label}] 선율이 흐릅니다.`
        : '🔇 엘리베이터 내부 배경음악을 음소거했습니다.',
    };
  }

  callIntercom() {
    const reply = CABIN_INTERCOM_RESPONSES[this.intercomIndex % CABIN_INTERCOM_RESPONSES.length];
    this.intercomIndex++;
    this.intercomActiveUntil = this.time + 5;
    this.log('비상 인터폰 통화 연결', 'info');
    return {
      ok: true,
      message: reply,
    };
  }

  travelSeconds(distance) {
    if (distance < 0.02) return 0;
    const a = this.accel;
    const v = this.maxSpeed;
    const rampDist = (v * v) / a; // accelerate + decelerate
    return distance >= rampDist ? distance / v + v / a : 2 * Math.sqrt(distance / a);
  }

  etaToFloor(floorIndex = this.target) {
    if (!valid(floorIndex)) return null;
    const goal = floorIndex * PITCH;
    if (Math.abs(goal - this.position) < 0.02) return 0;
    const dir = Math.sign(goal - this.position);
    const doorCycle = this.doorOpenSeconds + this.effectiveDwellSeconds + this.effectiveCloseSeconds;
    // Remaining door time if the car is currently stopped with doors in motion/open.
    let t = 0;
    if (this.state === 'opening') t += (1 - this.door) * this.doorOpenSeconds + this.effectiveDwellSeconds + this.effectiveCloseSeconds;
    else if (this.state === 'open') t += Math.max(0, this.dwell) + this.effectiveCloseSeconds;
    else if (this.state === 'closing') t += this.door * this.effectiveCloseSeconds;
    // Intermediate stops strictly between here and the goal in the travel direction.
    const stops = this.pending()
      .filter((n) => n !== floorIndex)
      .map((n) => n * PITCH)
      .filter((y) => (y - this.position) * dir > 0.02 && (goal - y) * dir > 0.02)
      .sort((p, q) => (p - q) * dir);
    let from = this.position;
    for (const y of stops) {
      t += this.travelSeconds(Math.abs(y - from)) + doorCycle;
      from = y;
    }
    t += this.travelSeconds(Math.abs(goal - from));
    return Math.max(1, Math.round(t));
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
    if (wasEmpty && this.state === 'idle' && (!this.vipMode || set === this.car)) {
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
    if (this.vipMode) {
      return this.car.has(this.floor);
    }
    return (
      this.car.has(this.floor) ||
      (this.direction >= 0 && this.up.has(this.floor)) ||
      (this.direction <= 0 && this.down.has(this.floor)) ||
      (this.ahead().length === 0 && this.pending().includes(this.floor))
    );
  }

  serveHere() {
    this.car.delete(this.floor);
    if (this.vipMode) return;
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
      (n) => this.car.has(n) || (!this.vipMode && (this.direction === 1 ? this.up : this.down).has(n))
    );
    return eligible.length ? eligible[0] : ahead.at(-1);
  }

  openDoor() {
    if (!this.aligned() || this.state === 'moving') return false;
    this.dwell = this.effectiveDwellSeconds;
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
      this.dwell = this.effectiveDwellSeconds;
      this.log('감지선 작동 · 문 다시 열림', 'warn');
    }
    if (!active && this.state === 'open') {
      this.dwell = this.effectiveDwellSeconds;
    }
  }

  toggleAlarm() {
    this.alarm = !this.alarm;
    this.log(this.alarm ? '비상 호출 신호 · 시뮬레이션' : '비상 호출 해제', this.alarm ? 'warn' : 'info');
  }

  toggleVipMode() {
    this.vipMode = !this.vipMode;
    this.log(
      this.vipMode ? 'VIP 직통 운전 활성화 · 외부 호출 보류' : 'VIP 직통 운전 해제 · 정상 운행',
      this.vipMode ? 'warn' : 'info'
    );
    return this.vipMode;
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
    if (this.tenKeyTimer > 0) {
      this.tenKeyTimer = Math.max(0, this.tenKeyTimer - dt);
      if (this.tenKeyTimer === 0 && this.tenKeyBuffer) {
        if (this.tenKeyBuffer === '1') {
          this.commitTenKeyFloor(5);
        } else {
          this.tenKeyBuffer = '';
          this.tenKeyDisplay = 'READY';
        }
      }
    }
    if (this.state === 'opening') {
      this.door = Math.min(1, this.door + dt / this.doorOpenSeconds);
      if (this.door >= 1) {
        this.state = 'open';
        this.dwell = this.effectiveDwellSeconds;
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
      this.door = Math.max(0, this.door - dt / this.effectiveCloseSeconds);
      if (this.door <= 0) {
        this.state = 'idle';
        this.log('도어 잠금 확인');
        if (this.accessibleMode && this.accessibleTripDone && this.car.size === 0) {
          this.accessibleMode = false;
          this.accessibleTripDone = false;
          this.log('♿ 장애인 배려 운전 자동 해제 · 운행 완료');
        }
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
          (this.car.has(n) || (!this.vipMode && (this.direction === 1 ? this.up : this.down).has(n))) &&
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
        if (this.accessibleMode) this.accessibleTripDone = true;
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
      (!this.vipMode ? opposite.has(this.floor) || this.ahead(-this.direction).length > 0 : this.ahead(-this.direction).length > 0);
    // Clear the arrival's served calls in the incoming direction before
    // committing the departure direction; otherwise turnaround calls stay lit.
    // A matching hall pickup keeps its direction while passengers choose a floor.
    this.serveHere();
    if (reverse) this.direction *= -1;
    this.stops.push(this.floor);
    this.log(`${FLOORS[this.floor]}층 도착`, 'arrival');
    this.target = null;
    this.state = 'opening';
    this.dwell = this.effectiveDwellSeconds;
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
      vipMode: this.vipMode,
      accessibleMode: this.accessibleMode,
      paused: this.paused,
      pending: this.pending(),
      stops: [...this.stops],
    };
  }
}

export function computeCabinLoad({ gameActive = false, player = null, npcs = null, robot = null } = {}) {
  const playerInCabin = Boolean(gameActive && player?.zone === 'cabin');
  const npcRiders = npcs?.npcs ? npcs.npcs.filter((n) => n.zone === 'cabin').length : 0;
  const robotInCabin = Boolean(robot?.zone === 'cabin');
  const passengers = (playerInCabin ? 1 : 0) + npcRiders;
  const weightKg = (playerInCabin ? 70 : 0) + npcRiders * 68 + (robotInCabin ? 45 : 0);
  const percent = Math.min(100, Math.round((weightKg / 1000) * 100));
  return {
    passengers,
    robotInCabin,
    weightKg,
    percent,
    summary:
      weightKg === 0
        ? '공차 · 0 kg'
        : `${passengers}명${robotInCabin ? ' + 로봇' : ''} · ${weightKg} kg (${percent}%)`,
  };
}

