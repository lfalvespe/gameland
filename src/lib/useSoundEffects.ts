import { useState, useEffect, useRef } from 'react';

export type SoundType = 'move' | 'capture' | 'win' | 'lose' | 'draw' | 'correct' | 'wrong' | 'king' | 'dice' | 'finish' | 'exit' | 'reset';

const SOUND_URLS: Record<SoundType, string> = {
  move: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
  capture: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Short board game piece tap
  win: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  lose: 'https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3',
  draw: 'https://assets.mixkit.co/active_storage/sfx/134/134-preview.mp3',
  correct: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', // Pop
  wrong: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Using pop sfx instead of dull thud
  king: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Success bell
  dice: 'https://assets.mixkit.co/active_storage/sfx/2381/2381-preview.mp3',
  finish: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  exit: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  reset: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
};

export const useSoundEffects = (isMuted: boolean) => {
  const [audioError, setAudioError] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const audioPool = useRef<Record<string, HTMLAudioElement>>({});
  const activeSounds = useRef<HTMLAudioElement[]>([]);

  useEffect(() => {
    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.loop = false;
      audio.onerror = () => setAudioError(true);
      audioPool.current[key] = audio;
    });

    const unlock = () => {
      setIsAudioUnlocked(true);
      Object.values(audioPool.current).forEach(a => {
        a.play().then(() => {
          a.pause();
          a.currentTime = 0;
        }).catch(() => {});
      });
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('click', unlock);

    return () => {
      window.removeEventListener('click', unlock);
      activeSounds.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      activeSounds.current = [];
    };
  }, []);

  const playSound = (type: SoundType) => {
    if (isMuted) return;
    const sfx = audioPool.current[type];
    if (sfx) {
      try {
        const playInstance = sfx.cloneNode() as HTMLAudioElement;
        // Lower volume for aggressive sounds
        const volumes: Record<string, number> = {
          move: 0.5,
          dice: 0.5,
          correct: 0.5,
          capture: 0.45, // Adjusted for clarity without being aggressive
          wrong: 0.6,   // Standard pop volume
          win: 0.7,
          lose: 0.6,
          draw: 0.6,
          king: 0.7,
          finish: 0.7,
          exit: 0.5,
          reset: 0.5
        };
        
        playInstance.volume = volumes[type] || 0.5;
        playInstance.loop = false;
        
        activeSounds.current.push(playInstance);
        
        const safetyTimeout = setTimeout(() => {
          if (playInstance) {
            playInstance.pause();
            playInstance.src = '';
            activeSounds.current = activeSounds.current.filter(a => a !== playInstance);
          }
        }, 4000);

        playInstance.onended = () => {
          clearTimeout(safetyTimeout);
          activeSounds.current = activeSounds.current.filter(a => a !== playInstance);
          playInstance.src = '';
        };

        const playPromise = playInstance.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            clearTimeout(safetyTimeout);
            activeSounds.current = activeSounds.current.filter(a => a !== playInstance);
            if (e.name === 'NotAllowedError') setAudioError(true);
          });
        }
      } catch (err) {
        console.error("Sound play error", err);
      }
    }
  };

  return { playSound, audioError };
};
