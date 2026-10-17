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
