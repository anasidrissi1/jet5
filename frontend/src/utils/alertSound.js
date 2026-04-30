let sharedAudioContext = null;

const getAudioContext = () => {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }
  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new AudioContextConstructor();
    } catch (error) {
      console.error('Impossible d\'initialiser AudioContext:', error);
      return null;
    }
  }
  return sharedAudioContext;
};

const scheduleTone = (context, frequency, startOffset) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  const startTime = context.currentTime + startOffset;
  const stopTime = startTime + 0.5;

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, stopTime);

  oscillator.start(startTime);
  oscillator.stop(stopTime);
};

// Génère le motif sonore d'alerte sur une instance AudioContext existante
export const playAlertSound = (context = getAudioContext()) => {
  if (!context || context.state !== 'running') {
    return;
  }
  try {
    scheduleTone(context, 880, 0);
    scheduleTone(context, 1046, 0.6);
  } catch (error) {
    console.error('Erreur lors de la lecture du son:', error);
  }
};

const registerUnlockHandlers = (context, onUnlocked) => {
  if (!context) {
    return () => {};
  }

  const events = ['pointerdown', 'touchstart', 'keydown'];

  const tryResume = async () => {
    try {
      await context.resume();
    } catch (error) {
      return;
    }

    if (context.state === 'running') {
      events.forEach(event => window.removeEventListener(event, tryResume));
      onUnlocked();
    }
  };

  events.forEach(event => window.addEventListener(event, tryResume));

  return () => {
    events.forEach(event => window.removeEventListener(event, tryResume));
  };
};

// Répète le son jusqu'à ce qu'il soit arrêté
export class AlertSoundPlayer {
  constructor() {
    this.intervalId = null;
    this.isPlaying = false;
    this.awaitingUnlock = false;
    this.removeUnlockHandlers = null;
  }

  ensureContextReady() {
    const context = getAudioContext();
    if (!context) {
      return null;
    }

    if (context.state === 'running') {
      return context;
    }

    if (this.awaitingUnlock) {
      return null;
    }

    this.awaitingUnlock = true;

    this.removeUnlockHandlers = registerUnlockHandlers(context, () => {
      this.awaitingUnlock = false;
      this.removeUnlockHandlers = null;
      if (!this.isPlaying) {
        this.start();
      }
    });

    return null;
  }

  start() {
    if (this.isPlaying) {
      return;
    }

    const context = this.ensureContextReady();
    if (!context) {
      return;
    }

    this.isPlaying = true;
    playAlertSound(context);

    this.intervalId = setInterval(() => {
      const ctx = getAudioContext();
      if (!this.isPlaying || !ctx) {
        return;
      }
      if (ctx.state !== 'running') {
        this.stop();
        this.start();
        return;
      }
      playAlertSound(ctx);
    }, 3000);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.removeUnlockHandlers) {
      this.removeUnlockHandlers();
      this.removeUnlockHandlers = null;
      this.awaitingUnlock = false;
    }
  }
}

export default playAlertSound;
