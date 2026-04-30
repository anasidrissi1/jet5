import React, { createContext, useContext, useRef, useState } from 'react';

// Audio context helper to maximize compatibility across browsers
const audioContextRef = { current: null };
const resumeListenerAttachedRef = { current: false };

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContextRef.current) {
    audioContextRef.current = new Ctor();
  }
  if (audioContextRef.current.state === 'suspended') {
    audioContextRef.current.resume().catch(() => {});
  }
  // Attach a one-time user-gesture resume to satisfy autoplay policies
  if (!resumeListenerAttachedRef.current) {
    const resumeCtx = () => {
      audioContextRef.current?.resume().catch(() => {});
      window.removeEventListener('click', resumeCtx, true);
      window.removeEventListener('touchstart', resumeCtx, true);
    };
    window.addEventListener('click', resumeCtx, true);
    window.addEventListener('touchstart', resumeCtx, true);
    resumeListenerAttachedRef.current = true;
  }
  return audioContextRef.current;
};

const NotificationContext = createContext();

// Cache d'éléments audio (pour éviter de recharger le fichier)
const audioElementCache = {};

const getAudioElement = (path) => {
  if (!path) return null;
  if (!audioElementCache[path]) {
    audioElementCache[path] = new Audio(path);
  }
  return audioElementCache[path];
};

// Fonction pour jouer un son selon le type de notification
const playNotificationSound = (type, options = {}) => {
  try {
    const { audioPath, longTone, urgent, soundVariant } = options;

    // Essayer un fichier audio dédié si fourni
    if (audioPath) {
      const audio = getAudioElement(audioPath);
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
    }

    const audioContext = getAudioContext();
    if (!audioContext) {
      return;
    }

    const playTone = (frequency, start, duration, gain = 0.25) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + start);
      gainNode.gain.setValueAtTime(gain, audioContext.currentTime + start);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + start + duration);
      oscillator.start(audioContext.currentTime + start);
      oscillator.stop(audioContext.currentTime + start + duration);
    };

    if (soundVariant === 'online_reservation') {
      playTone(880, 0, 0.16, 0.24);
      playTone(1174.66, 0.18, 0.18, 0.22);
      playTone(987.77, 0.4, 0.28, 0.2);
      return;
    }

    const isAlert = urgent || longTone || type === 'error' || type === 'warning';

    if (isAlert) {
      // Tonalité plus longue pour alertes / urgences
      playTone(780, 0, 0.35, 0.35);
      playTone(660, 0.35, 0.35, 0.28);
      playTone(520, 0.7, 0.25, 0.22);
    } else if (type === 'success') {
      // Son agréable pour succès (2 notes montantes)
      playTone(523.25, 0, 0.18, 0.28);
      playTone(659.25, 0.18, 0.18, 0.24);
    } else {
      // Son neutre pour info
      playTone(440, 0, 0.22, 0.2);
    }
  } catch (err) {
    console.warn('Audio playback not supported:', err);
  }
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const firstInteractionRef = useRef(false);

  // Marquer une interaction utilisateur pour aider certains navigateurs à autoriser l'audio
  React.useEffect(() => {
    const handler = () => {
      firstInteractionRef.current = true;
    };
    window.addEventListener('pointerdown', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, []);

  const addNotification = (message, type = 'info', options = {}) => {
    const id = Date.now();
    const DEFAULT_DURATION = 5000;

    let payload = {
      id,
      message: '',
      type,
      duration: options.duration ?? DEFAULT_DURATION,
      urgent: Boolean(options.urgent),
    };

    if (message && typeof message === 'object' && !Array.isArray(message)) {
      const rawMessage = message.message ?? message.text ?? message.title ?? '';
      payload = {
        id,
        message: rawMessage ? String(rawMessage) : JSON.stringify(message),
        type: message.type ?? type ?? 'info',
        duration: typeof message.duration === 'number'
          ? (Number.isFinite(message.duration) ? message.duration : DEFAULT_DURATION)
          : (message.duration === null ? null : options.duration ?? DEFAULT_DURATION),
        urgent: Boolean(message.urgent || message.priorite === 'urgent' || message.urgence || options.urgent),
      };
    } else {
      payload = {
        id,
        message: String(message ?? ''),
        type,
        duration: options.duration ?? DEFAULT_DURATION,
        urgent: Boolean(options.urgent),
      };
    }

    setNotifications(prev => [...prev, payload]);

    // Jouer le son de notification si demandé
    const shouldPlaySound = options.playSound !== false;
    if (shouldPlaySound && firstInteractionRef.current) {
      playNotificationSound(payload.type, {
        audioPath: options.audioPath,
        urgent: payload.urgent,
        longTone: options.longTone,
        soundVariant: options.soundVariant,
      });
    }

    if (payload.duration && Number.isFinite(payload.duration)) {
      setTimeout(() => {
        removeNotification(id);
      }, payload.duration);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
