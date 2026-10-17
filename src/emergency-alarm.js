export class EmergencyAlarm {
  constructor(createContext = () => new AudioContext()) {
    this.createContext = createContext;
    this.context = null;
    this.nodes = [];
    this.gainNode = null;
    this.depthNode = null;
    this.proximityGain = 1;
  }

  setProximityGain(gain) {
    const g = Number.isFinite(gain) ? Math.max(0, Math.min(1, gain)) : 1;
    this.proximityGain = g;
    if (this.gainNode && this.depthNode) {
      this.gainNode.gain.value = 0.09 * g;
      this.depthNode.gain.value = 0.08 * g;
    }
  }

  setEnabled(enabled) {
    this.stop();
    if (!enabled) return;
    try {
      this.context ??= this.createContext();
      this.context.resume().catch(() => {});
      const c = this.context;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      const pulse = c.createOscillator();
      const depth = c.createGain();

      osc.type = 'sine';
      osc.frequency.value = 880;
      pulse.type = 'sine';
      pulse.frequency.value = 2;
      depth.gain.value = 0.08 * this.proximityGain;
      gain.gain.value = 0.09 * this.proximityGain;

      pulse.connect(depth);
      depth.connect(gain.gain);
      osc.connect(gain);
      gain.connect(c.destination);

      osc.start(t);
      pulse.start(t);
      this.gainNode = gain;
      this.depthNode = depth;
      this.nodes = [osc, pulse, depth, gain];
    } catch {
      this.stop();
    }
  }

  stop() {
    for (const n of this.nodes) {
      try {
        n.stop?.();
      } catch {}
      n.disconnect();
    }
    this.nodes = [];
    this.gainNode = null;
    this.depthNode = null;
  }
}
