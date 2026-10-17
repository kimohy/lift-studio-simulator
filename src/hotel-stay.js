export class HotelStay {
  constructor() {
    this.keycard = null;
  }

  canAccess(room) {
    return this.keycard?.room === String(room);
  }

  checkIn(staffId) {
    if (!/^reception-/.test(staffId ?? '')) return null;
    this.keycard ??= { room: '301', floor: '3', hotel: 'GRAND HOTEL' };
    return this.keycard;
  }
}
