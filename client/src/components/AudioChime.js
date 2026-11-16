class SoundController {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.speechEnabled = true;
    this.unlocked = false;
    this.speechTimer = null;
  }

  unlock() {
    this.unlocked = true;
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  getAudioContext() {
    if (typeof window === 'undefined' || !this.unlocked) return null;
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      try {
        this.audioCtx = new AudioContext();
      } catch {
        return null;
      }
    }
    return this.audioCtx;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.stopSpeech();
    return this.isMuted;
  }

  toggleSpeech() {
    this.speechEnabled = !this.speechEnabled;
    if (!this.speechEnabled) this.stopSpeech();
    return this.speechEnabled;
  }

  stopSpeech() {
    clearTimeout(this.speechTimer);
    this.speechTimer = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
  }

  playTone(ctx, frequency, start, peak, attack, release) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, start + release);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + release + 0.05);
  }

  playChime() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    try {
      const now = ctx.currentTime;
      this.playTone(ctx, 587.33, now, 0.3, 0.05, 0.6);
      this.playTone(ctx, 880, now + 0.25, 0.35, 0.05, 0.95);
    } catch {
      /* audio unavailable, stay silent */
    }
  }

  announceToken(displayToken, doctorName, roomNumber) {
    if (this.isMuted) return;
    this.playChime();

    if (
      !this.speechEnabled ||
      typeof window === 'undefined' ||
      !window.speechSynthesis ||
      typeof window.SpeechSynthesisUtterance !== 'function'
    ) {
      return;
    }

    clearTimeout(this.speechTimer);
    this.speechTimer = setTimeout(() => {
      this.speechTimer = null;
      try {
        const where = [roomNumber, doctorName].filter(Boolean).join(', ');
        const utterance = new SpeechSynthesisUtterance(
          `Token number ${displayToken}.${where ? ` Please proceed to ${where}.` : ''}`
        );
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } catch {
        /* speech unavailable */
      }
    }, 600);
  }
}

export const soundController = new SoundController();
