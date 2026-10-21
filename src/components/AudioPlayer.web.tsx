// Web: play with an audio element directly
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface AudioPlayerHandle {
  play: (url: string) => void;
}

interface Props {
  onFinished: (url: string) => void;
}

const AudioPlayer = forwardRef<AudioPlayerHandle, Props>(({ onFinished }, ref) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  useImperativeHandle(ref, () => ({
    play: (url) => {
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      const finish = () => onFinished(url);
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    },
  }));

  return null;
});

AudioPlayer.displayName = 'AudioPlayer';
export default AudioPlayer;
