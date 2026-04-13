// Notification sound utility
// Note: Add actual notification.mp3 file to public/sounds/

let audio: HTMLAudioElement | null = null;

export const playNotificationSound = (volume: number = 0.5): void => {
  try {
    // Reuse audio element if it exists
    if (!audio) {
      audio = new Audio('/sounds/notification.mp3');
      audio.volume = volume;
    }
    
    // Reset to start if already playing
    audio.currentTime = 0;
    audio.volume = volume;
    
    // Play the sound
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          logger.debug('🔔 Notification sound played');
        })
        .catch((error) => {
          console.warn('Could not play notification sound:', error);
          // User interaction may be required for autoplay
        });
    }
  } catch (error) {
    console.warn('Error playing notification sound:', error);
  }
};

export const preloadNotificationSound = (): void => {
  try {
    audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0;
    audio.play().then(() => {
      audio?.pause();
      if (audio) audio.currentTime = 0;
      logger.debug('✅ Notification sound preloaded');
    }).catch(() => {
      // Silent fail - user interaction needed
    });
  } catch (error) {
    console.warn('Could not preload notification sound:', error);
  }
};

