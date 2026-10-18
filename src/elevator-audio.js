import { PITCH } from './controller.js';

/**
 * Computes the spatial audio gain (0.0 to 1.0) for elevator-related sounds
 * (voice announcements, arrival chimes, emergency alarm) based on the listener's
 * current mode, zone, horizontal distance to the shaft entrance, and vertical
 * distance to the elevator cabin.
 */
export function computeElevatorAudioGain({ gameActive = false, player = null, view = 'lobby', stairs = null } = {}, controller) {
  if (!controller) return 1;

  // Observer mode: audible when inspecting the elevator, silent in far exterior view
  if (!gameActive || !player) {
    if (view === 'exterior') return 0;
    return 1;
  }

  // Inside the elevator cabin or standing in the doorway threshold: 100% audible
  if (player.zone === 'cabin' || player.inDoorway?.()) {
    return 1;
  }

  // Inside an enclosed guest room or far on the vehicle ramp: completely silent
  if (player.zone === 'room' || player.zone === 'ramp') {
    return 0;
  }

  // Inside the stairwell: if the stairwell door on the player's floor is closed, block sound
  if (player.zone === 'stairs' && stairs) {
    const door = stairs.doors?.[player.floor];
    if (door && door.open < 0.2) return 0;
  }

  // Horizontal distance from player (x, z) to elevator landing doorway (0, 1.4)
  const dx = player.x;
  const dz = Math.max(0, player.z - 1.4);
  const dist2D = Math.hypot(dx, dz);

  // Beyond the connecting corridor (z > 8.8 or dist2D >= 7.5m), elevator sound does not reach
  const fullRange = 2.6;
  const maxRange = 7.5;
  if (dist2D >= maxRange || Math.abs(dx) > 4.2) {
    return 0;
  }

  const horizontalGain =
    dist2D <= fullRange ? 1 : Math.max(0, 1 - (dist2D - fullRange) / (maxRange - fullRange));

  // Vertical distance between the player's floor level and the elevator cabin
  const playerY = typeof player.groundY === 'function' ? player.groundY(controller) : (player.floor - 5) * PITCH;
  const cabinY = (controller.position ?? 5 * PITCH) - 5 * PITCH;
  const dy = Math.abs(playerY - cabinY);

  // Full vertical gain when cabin is on the same floor, attenuated within ~2 floors, silent beyond 2 floors
  const maxVerticalRange = PITCH * 2;
  if (dy >= maxVerticalRange) {
    return 0;
  }
  const verticalGain = dy <= 0.35 ? 1 : Math.max(0, 1 - (dy - 0.35) / (maxVerticalRange - 0.35));

  // Smooth quadratic falloff feels natural for indoor acoustics
  const combined = horizontalGain * verticalGain;
  return Math.round(combined * combined * 1000) / 1000;
}

/**
 * Lightweight procedural sound effects synthesizer using Web Audio API.
 * Requires zero external audio assets and degrades gracefully in headless/test environments.
 */
export class HotelSoundEffects {
  constructor(getContext = () => null, getVolume = () => 0.65, isEnabled = () => false) {
    this.getContext = getContext;
    this.getVolume = getVolume;
    this.isEnabled = isEnabled;
  }

  tone(freq, duration = 0.08, { type = 'sine', delay = 0, gainScale = 0.08, endFreq = null } = {}) {
    if (!this.isEnabled?.()) return false;
    const ctx = this.getContext?.();
    const vol = Number(this.getVolume?.() ?? 0.65);
    if (!ctx || vol <= 0.001) return false;
    try {
      const t = (ctx.currentTime ?? 0) + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime?.(freq, t);
      if (endFreq && osc.frequency.exponentialRampToValueAtTime) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
      } else {
        osc.frequency.value = freq;
      }
      const peak = Math.max(0.001, gainScale * vol);
      gain.gain.setValueAtTime?.(0.0001, t);
      gain.gain.linearRampToValueAtTime?.(peak, t + 0.01);
      gain.gain.exponentialRampToValueAtTime?.(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.01);
      return true;
    } catch {
      return false;
    }
  }

  playButton() {
    return this.tone(1046.5, 0.055, { type: 'sine', gainScale: 0.06, endFreq: 1318.5 });
  }

  playKeycard() {
    const a = this.tone(987.77, 0.075, { type: 'triangle', gainScale: 0.075 });
    const b = this.tone(1479.98, 0.12, { type: 'triangle', delay: 0.085, gainScale: 0.085 });
    return a || b;
  }

  playRobot() {
    const a = this.tone(783.99, 0.065, { type: 'sine', gainScale: 0.065 });
    const b = this.tone(1174.66, 0.075, { type: 'sine', delay: 0.07, gainScale: 0.07 });
    const c = this.tone(1567.98, 0.11, { type: 'sine', delay: 0.145, gainScale: 0.075 });
    return a || b || c;
  }

  playWater() {
    const a = this.tone(320, 0.14, { type: 'sine', gainScale: 0.055, endFreq: 580 });
    const b = this.tone(480, 0.16, { type: 'sine', delay: 0.06, gainScale: 0.05, endFreq: 260 });
    return a || b;
  }
}

