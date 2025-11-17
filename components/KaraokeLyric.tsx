import React from 'react';

interface KaraokeLyricProps {
  text: string;
  startTime: number;
  endTime: number;
  currentTime: number;
  isPlaying: boolean;
  style?: React.CSSProperties;
  activeColor?: string;
  inactiveColor?: string; // No longer used, but kept for prop compatibility
}

const KaraokeLyric: React.FC<KaraokeLyricProps> = ({ 
  text, 
  startTime, 
  endTime, 
  currentTime, 
  isPlaying, 
  style,
  activeColor = '#FFFFFF',
}) => {
  const duration = (endTime - startTime) * 1000;
  // Negative delay makes the animation jump to the correct progress if we start mid-lyric
  const delay = (startTime - currentTime) * 1000;

  // Use a percentage for fade duration to make it adaptive to lyric length
  const FADE_DURATION_PERCENT = 15;
  const fadeInEnd = FADE_DURATION_PERCENT;
  const fadeOutStart = 100 - FADE_DURATION_PERCENT;

  const animationStyle: React.CSSProperties = {
    ...style,
    color: activeColor,
    animationName: 'elegant-fade',
    animationDuration: `${Math.max(0, duration)}ms`,
    animationTimingFunction: 'ease-in-out',
    animationDelay: `${delay}ms`,
    animationFillMode: 'forwards',
    animationPlayState: isPlaying ? 'running' : 'paused',
    opacity: 0, // Initial state for animation
  };

  // CSS keyframes for the fade-in and fade-out animation
  const keyframes = `
    @keyframes elegant-fade {
      0% {
        opacity: 0;
        transform: translateY(10px);
      }
      ${fadeInEnd}% {
        opacity: 1;
        transform: translateY(0);
      }
      ${fadeOutStart}% {
        opacity: 1;
        transform: translateY(0);
      }
      100% {
        opacity: 0;
        transform: translateY(-10px);
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <p style={animationStyle} className="font-bold drop-shadow-lg tracking-wide">
        {text}
      </p>
    </>
  );
};

export default KaraokeLyric;
