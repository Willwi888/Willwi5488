import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TimedLyric } from '../types';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import PrevIcon from './icons/PrevIcon';
import Loader from './Loader';
import KaraokeLyric from './KaraokeLyric';
import ExportIcon from './icons/ExportIcon';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

// Declare FFmpeg for TypeScript since it's loaded from a script tag
declare const FFmpeg: any;

interface VideoPlayerProps {
  timedLyrics: TimedLyric[];
  audioUrl: string;
  imageUrl: string;
  songTitle: string;
  artistName: string;
  onBack: () => void;
}

const fontOptions = [
  { name: '現代無襯線', value: 'sans-serif' },
  { name: '經典襯線', value: 'serif' },
  { name: '手寫體', value: 'cursive' },
  { name: '打字機', value: 'monospace' },
  { name: '日文黑體', value: "'Noto Sans JP', sans-serif" },
  { name: '韓文黑體', value: "'Noto Sans KR', sans-serif" },
];

const fontWeights = [
  { name: '細體 (300)', value: '300' },
  { name: '正常 (400)', value: '400' },
  { name: '中等 (500)', value: '500' },
  { name: '半粗體 (600)', value: '600' },
  { name: '粗體 (700)', value: '700' },
  { name: '特粗體 (800)', value: '800' },
  { name: '極粗體 (900)', value: '900' },
];

const resolutions: { [key: string]: { width: number; height: number } } = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
};

const colorThemes: { [key: string]: { name: string; active: string; inactive1: string; inactive2: string; info: string; subInfo: string; } } = {
  light: {
    name: '明亮',
    active: '#FFFFFF',
    inactive1: '#E5E7EB',
    inactive2: '#D1D5DB',
    info: '#FFFFFF',
    subInfo: '#E5E7EB',
  },
  dark: {
    name: '暗黑',
    active: '#1F2937',
    inactive1: '#374151',
    inactive2: '#4B5563',
    info: '#1F2937',
    subInfo: '#374151',
  },
};

const secondsToSrtTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds)) timeInSeconds = 0;
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.round((timeInSeconds - Math.floor(timeInSeconds)) * 1000);

  const pad = (num: number, length: number = 2) => num.toString().padStart(length, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ timedLyrics, audioUrl, imageUrl, songTitle, artistName, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [loadingState, setLoadingState] = useState<{ message: string, progress?: number, details?: string } | null>(null);

  // Style states
  const [fontFamily, setFontFamily] = useState(fontOptions[0].value);
  const [fontWeight, setFontWeight] = useState(fontWeights[4].value);
  const [fontSize, setFontSize] = useState(48);
  const [fontColor, setFontColor] = useState(colorThemes.light.active);
  const [inactiveFontColor1, setInactiveFontColor1] = useState(colorThemes.light.inactive1);
  const [inactiveFontColor2, setInactiveFontColor2] = useState(colorThemes.light.inactive2);
  const [lyricPosition, setLyricPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [albumArtPosition, setAlbumArtPosition] = useState<'left' | 'right' | 'hidden'>('left');
  const [albumArtSize, setAlbumArtSize] = useState(150);
  const [backgroundBlur, setBackgroundBlur] = useState(8);
  const [showSongInfo, setShowSongInfo] = useState(true);
  const [resolution, setResolution] = useState('720p');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoPreviewRef = useRef<HTMLDivElement>(null);
  const ffmpegRef = useRef<any>(null);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => setCurrentTime(audio.currentTime);
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    return () => {
      audio.removeEventListener('timeupdate', update);
    };
  }, []);

  useEffect(() => {
    let newIndex = -1;
    for (let i = timedLyrics.length - 1; i >= 0; i--) {
        if (currentTime >= timedLyrics[i].startTime) {
            newIndex = i;
            break;
        }
    }
    if (newIndex !== -1 && currentTime > timedLyrics[newIndex].endTime) {
      newIndex = -1; // It's between lyrics
    }
    setCurrentLyricIndex(newIndex);
  }, [currentTime, timedLyrics]);

  const handlePlayPause = () => {
    if (audioRef.current?.paused) {
      audioRef.current?.play();
    } else {
      audioRef.current?.pause();
    }
  };

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return isNaN(minutes) || isNaN(secs) ? '0:00' : `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const currentLyric = useMemo(() => currentLyricIndex > -1 ? timedLyrics[currentLyricIndex] : null, [currentLyricIndex, timedLyrics]);
  
  const handleColorThemeChange = (themeKey: string) => {
    const theme = colorThemes[themeKey];
    if (theme) {
      setFontColor(theme.active);
      setInactiveFontColor1(theme.inactive1);
      setInactiveFontColor2(theme.inactive2);
    }
  };

  const handleExport = async () => {
      if (!ffmpegRef.current) {
          ffmpegRef.current = FFmpeg.createFFmpeg({ 
              log: true,
              corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg-core@0.11.0/dist/ffmpeg-core.js',
          });
      }
      const ffmpeg = ffmpegRef.current;
      
      try {
          setLoadingState({ message: '正在載入 FFmpeg 核心...' });
          if (!ffmpeg.isLoaded()) {
              await ffmpeg.load();
          }

          setLoadingState({ message: '正在讀取媒體檔案...' });
          const audioBlob = await fetch(audioUrl).then(r => r.blob());
          const imageBlob = await fetch(imageUrl).then(r => r.blob());
          
          ffmpeg.FS('writeFile', 'audio.mp3', new Uint8Array(await audioBlob.arrayBuffer()));
          ffmpeg.FS('writeFile', 'background.jpg', new Uint8Array(await imageBlob.arrayBuffer()));

          const canvas = document.createElement('canvas');
          const { width, height } = resolutions[resolution];
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;

          const frameRate = 30;
          const totalFrames = Math.floor(duration * frameRate);

          const bgImage = new Image();
          bgImage.src = URL.createObjectURL(imageBlob);
          await new Promise(r => bgImage.onload = r);

          setLoadingState({ message: '正在渲染影片影格...', progress: 0, details: '這可能需要幾分鐘...' });

          for (let i = 0; i < totalFrames; i++) {
              const frameTime = i / frameRate;

              // Clear canvas
              ctx.clearRect(0, 0, width, height);
              ctx.fillStyle = '#111827';
              ctx.fillRect(0, 0, width, height);

              // Draw background
              ctx.save();
              ctx.filter = `blur(${backgroundBlur}px)`;
              ctx.drawImage(bgImage, 0, 0, width, height);
              ctx.restore();
              
              // Draw dimming overlay
              ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
              ctx.fillRect(0, 0, width, height);
              
              if (albumArtPosition !== 'hidden') {
                const artSize = (albumArtSize / 150) * (height * 0.25);
                const artX = albumArtPosition === 'left' ? width * 0.05 : width * 0.95 - artSize;
                const artY = height * 0.05;
                ctx.drawImage(bgImage, artX, artY, artSize, artSize);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 2;
                ctx.strokeRect(artX, artY, artSize, artSize);
              }
              
              // Find active lyric for this frame
              let frameLyricIndex = -1;
              for (let j = 0; j < timedLyrics.length; j++) {
                  if (frameTime >= timedLyrics[j].startTime && frameTime <= timedLyrics[j].endTime) {
                      frameLyricIndex = j;
                      break;
                  }
              }

              // Draw lyrics
              ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
              ctx.textAlign = textAlignment;
              ctx.textBaseline = 'middle';
              
              const lyricX = textAlignment === 'center' ? width / 2 : (textAlignment === 'left' ? width * 0.05 : width * 0.95);
              const lyricYRatio = lyricPosition === 'top' ? 0.25 : lyricPosition === 'center' ? 0.5 : 0.8;
              
              // Draw Fading Lyric
              if (frameLyricIndex > -1) {
                  const lyric = timedLyrics[frameLyricIndex];
                  const lyricDuration = lyric.endTime - lyric.startTime;
                  const timeIntoLyric = frameTime - lyric.startTime;
                  const FADE_DURATION_S = 0.4; // 400ms in seconds

                  let opacity = 1.0;
                  let yOffset = 0;
                  const yOffsetAmount = 10; // Corresponds to translateY

                  if (lyricDuration > FADE_DURATION_S * 2) {
                    if (timeIntoLyric < FADE_DURATION_S) {
                        // Fading in
                        opacity = timeIntoLyric / FADE_DURATION_S;
                        yOffset = yOffsetAmount * (1 - opacity);
                    } else if (lyricDuration - timeIntoLyric < FADE_DURATION_S) {
                        // Fading out
                        opacity = (lyricDuration - timeIntoLyric) / FADE_DURATION_S;
                        yOffset = -yOffsetAmount * (1 - opacity);
                    }
                  } else {
                    // For short lyrics, just fade in and out over the whole duration
                    const halfDuration = lyricDuration / 2;
                    if (timeIntoLyric < halfDuration) {
                      opacity = timeIntoLyric / halfDuration;
                    } else {
                      opacity = (lyricDuration - timeIntoLyric) / halfDuration;
                    }
                  }


                  ctx.globalAlpha = opacity;
                  ctx.fillStyle = fontColor;
                  ctx.fillText(lyric.text, lyricX, height * lyricYRatio + yOffset);
                  ctx.globalAlpha = 1; // Reset alpha
              }
              
              if (showSongInfo) {
                  ctx.textAlign = 'center';
                  ctx.fillStyle = colorThemes.light.info;
                  ctx.font = `700 ${height * 0.04}px ${fontFamily}`;
                  ctx.fillText(songTitle, width / 2, height * 0.92);
                  
                  ctx.fillStyle = colorThemes.light.subInfo;
                  ctx.font = `400 ${height * 0.025}px ${fontFamily}`;
                  ctx.fillText(artistName, width / 2, height * 0.97);
              }


              const frameData = ctx.getImageData(0, 0, width, height).data;
              // Fix: The complex one-liner for fetching and converting the canvas image caused a
              // TypeScript type inference error. Storing the buffer in a variable first resolves it.
              const buffer = await fetch(canvas.toDataURL('image/png')).then(res => res.arrayBuffer());
              ffmpeg.FS('writeFile', `frame${i.toString().padStart(4, '0')}.png`, new Uint8Array(buffer));
              
              setLoadingState(prev => ({ ...prev, progress: (i / totalFrames) * 100, details: `渲染影格 ${i+1} / ${totalFrames}` }));
          }

          setLoadingState({ message: '正在將影格與音訊合併...', progress: 99, details: '最後一步！' });
          await ffmpeg.run('-framerate', String(frameRate), '-i', 'frame%04d.png', '-i', 'audio.mp3', '-c:v', 'libx264', '-c:a', 'aac', '-shortest', '-pix_fmt', 'yuv420p', 'output.mp4');

          setLoadingState({ message: '匯出完成！正在準備下載...' });
          const data = ffmpeg.FS('readFile', 'output.mp4');
          const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
          const url = URL.createObjectURL(videoBlob);

          const a = document.createElement('a');
          a.href = url;
          a.download = `${songTitle.replace(/ /g, '_')}_lyrics_video.mp4`;
          a.click();
          URL.revokeObjectURL(url);
          
          setLoadingState(null);
      } catch (error) {
          console.error(error);
          setLoadingState(null);
          alert('匯出影片時發生錯誤。請檢查主控台以獲取詳細資訊。');
      }
  };
  
  const handleExportSrt = useCallback(() => {
    if (!timedLyrics.length) {
      alert('沒有可匯出的歌詞時間。');
      return;
    }

    const srtContent = timedLyrics
      .map((lyric, index) => {
        const startTime = secondsToSrtTime(lyric.startTime);
        const endTime = secondsToSrtTime(lyric.endTime);
        return `${index + 1}\r\n${startTime} --> ${endTime}\r\n${lyric.text}`;
      })
      .join('\r\n\r\n');

    const blob = new Blob([srtContent], { type: 'application/srt;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${songTitle.replace(/ /g, '_') || 'lyrics'}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [timedLyrics, songTitle]);

  const lyricContainerStyle: React.CSSProperties = {
    top: lyricPosition === 'top' ? '25%' : lyricPosition === 'center' ? '50%' : '80%',
    transform: 'translateY(-50%)',
    textAlign: textAlignment,
  };

  const lyricStyle: React.CSSProperties = {
    fontFamily: fontFamily,
    fontWeight: fontWeight,
    fontSize: `${fontSize}px`,
  };

  return (
    <>
      {loadingState && <Loader {...loadingState} />}
      <div className="w-full max-w-7xl mx-auto h-[90vh] flex flex-col lg:flex-row gap-4">
        {/* Main Content: Video Preview & Controls */}
        <div className="flex-grow flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
              <PrevIcon className="w-6 h-6" />
              返回並編輯
            </button>
          </div>

          <div ref={videoPreviewRef} id="capture-area" className="w-full flex-grow bg-gray-800 rounded-lg shadow-2xl overflow-hidden relative isolate">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              <img src={imageUrl} alt="Background" className="w-full h-full object-cover" style={{ filter: `blur(${backgroundBlur}px)` }} />
              <div className="absolute inset-0 bg-black/40"></div>
            </div>

            {/* Album Art */}
            {albumArtPosition !== 'hidden' && (
              <div 
                className="absolute top-4 z-10 p-1 bg-white/10 rounded-md shadow-lg"
                style={{ 
                  width: `${albumArtSize}px`, 
                  height: `${albumArtSize}px`,
                  left: albumArtPosition === 'left' ? '1rem' : 'auto',
                  right: albumArtPosition === 'right' ? '1rem' : 'auto'
                }}
              >
                <img src={imageUrl} alt="Album Art" className="w-full h-full object-cover rounded" />
              </div>
            )}
            
            {/* Song Info */}
            {showSongInfo && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center z-20 w-full px-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md" style={{fontFamily}}>{songTitle}</h2>
                  <p className="text-md md:text-lg text-gray-200 drop-shadow-md" style={{fontFamily}}>{artistName}</p>
              </div>
            )}

            {/* Lyrics Container */}
            <div className="absolute w-full px-8 z-20" style={lyricContainerStyle}>
                {currentLyric && (
                    <KaraokeLyric
                        key={currentLyricIndex}
                        {...currentLyric}
                        currentTime={currentTime}
                        isPlaying={isPlaying}
                        style={lyricStyle}
                        activeColor={fontColor}
                        inactiveColor={inactiveFontColor1}
                    />
                )}
            </div>
          </div>

          {/* Audio Controls */}
          <div className="flex-shrink-0 mt-2 bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 space-y-2 border border-gray-700">
            <audio ref={audioRef} src={audioUrl} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 font-mono w-12 text-center">{formatTime(currentTime)}</span>
              <input type="range" min={0} max={duration || 0} step="0.01" value={currentTime} onChange={handleTimelineChange} className="w-full h-1.5 bg-gray-600 rounded-full appearance-none cursor-pointer accent-[#a6a6a6]" />
              <span className="text-sm text-gray-400 font-mono w-12 text-center">{formatTime(duration)}</span>
            </div>
            <div className="flex justify-center">
              <button onClick={handlePlayPause} className="bg-white text-gray-900 rounded-full p-3 transform hover:scale-110 transition-transform">
                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Customization Controls */}
        <div className="w-full lg:w-80 flex-shrink-0 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4 h-full overflow-y-auto custom-scrollbar">
          <h3 className="text-xl font-bold mb-4 text-white">自訂外觀</h3>
          <div className="space-y-6">
            {/* Lyrics Style */}
            <div>
              <h4 className="font-semibold text-gray-300 mb-2">歌詞</h4>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-gray-400">字體</span>
                  <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:ring-gray-500 focus:border-gray-500 text-sm">
                    {fontOptions.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                  </select>
                </label>
                 <label className="block">
                  <span className="text-sm text-gray-400">字重</span>
                  <select value={fontWeight} onChange={e => setFontWeight(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:ring-gray-500 focus:border-gray-500 text-sm">
                    {fontWeights.map(w => <option key={w.value} value={w.value}>{w.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm text-gray-400">字體大小 ({fontSize}px)</span>
                  <input type="range" min="24" max="96" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#a6a6a6]" />
                </label>
                <div className="flex items-center gap-2">
                   <select onChange={(e) => handleColorThemeChange(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:ring-gray-500 focus:border-gray-500 text-sm">
                    {Object.entries(colorThemes).map(([key, theme]) => <option key={key} value={key}>{theme.name}</option>)}
                  </select>
                  <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)} className="w-10 h-9 p-0 bg-transparent border-none rounded cursor-pointer" title="目前歌詞顏色" />
                </div>
              </div>
            </div>
            {/* Layout */}
            <div>
              <h4 className="font-semibold text-gray-300 mb-2">排版</h4>
               <div className="space-y-3">
                <label className="block text-sm text-gray-400">歌詞位置</label>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setLyricPosition('top')} className={`p-2 rounded text-sm ${lyricPosition === 'top' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600/80'}`}>頂部</button>
                    <button onClick={() => setLyricPosition('center')} className={`p-2 rounded text-sm ${lyricPosition === 'center' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600/80'}`}>中間</button>
                    <button onClick={() => setLyricPosition('bottom')} className={`p-2 rounded text-sm ${lyricPosition === 'bottom' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600/80'}`}>底部</button>
                </div>
                 <label className="block text-sm text-gray-400">對齊方式</label>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setTextAlignment('left')} className={`p-2 rounded text-sm ${textAlignment === 'left' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600/80'}`}>靠左</button>
                    <button onClick={() => setTextAlignment('center')} className={`p-2 rounded text-sm ${textAlignment === 'center' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600/80'}`}>置中</button>
                    <button onClick={() => setTextAlignment('right')} className={`p-2 rounded text-sm ${textAlignment === 'right' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600/80'}`}>靠右</button>
                </div>
              </div>
            </div>
             {/* Album Art */}
            <div>
              <h4 className="font-semibold text-gray-300 mb-2">專輯封面</h4>
              <div className="space-y-3">
                 <label className="block text-sm text-gray-400">位置</label>
                 <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setAlbumArtPosition('left')} className={`p-2 rounded text-sm ${albumArtPosition === 'left' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600/80'}`}>靠左</button>
                    <button onClick={() => setAlbumArtPosition('right')} className={`p-2 rounded text-sm ${albumArtPosition === 'right' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600/80'}`}>靠右</button>
                    <button onClick={() => setAlbumArtPosition('hidden')} className={`p-2 rounded text-sm ${albumArtPosition === 'hidden' ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600/80'}`}>隱藏</button>
                </div>
                <label className="block">
                  <span className="text-sm text-gray-400">大小 ({albumArtSize}px)</span>
                  <input type="range" min="100" max="250" value={albumArtSize} onChange={e => setAlbumArtSize(parseInt(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#a6a6a6]" disabled={albumArtPosition === 'hidden'} />
                </label>
              </div>
            </div>
            {/* Background */}
             <div>
              <h4 className="font-semibold text-gray-300 mb-2">背景與資訊</h4>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-gray-400">背景模糊度 ({backgroundBlur}px)</span>
                  <input type="range" min="0" max="24" value={backgroundBlur} onChange={e => setBackgroundBlur(parseInt(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#a6a6a6]" />
                </label>
                <button onClick={() => setShowSongInfo(!showSongInfo)} className="w-full flex justify-between items-center text-sm text-gray-400">
                    <span>顯示歌曲資訊</span>
                    {showSongInfo ? <EyeIcon className="w-5 h-5 text-gray-300"/> : <EyeSlashIcon className="w-5 h-5 text-gray-500"/>}
                </button>
              </div>
            </div>
            {/* Export */}
            <div className="pt-4 border-t border-gray-700">
              <h4 className="font-semibold text-gray-300 mb-2">匯出</h4>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-gray-400">解析度</span>
                  <select value={resolution} onChange={e => setResolution(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:ring-gray-500 focus:border-gray-500 text-sm">
                    {Object.keys(resolutions).map(r => <option key={r} value={r}>{r} ({resolutions[r].width}x{resolutions[r].height})</option>)}
                  </select>
                </label>
                <button 
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-white/50 rounded-md shadow-sm text-sm font-bold text-gray-900 bg-[#a6a6a6] hover:bg-[#999999] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-400 transition-all"
                >
                  <ExportIcon className="w-5 h-5" />
                  匯出影片
                </button>
                <button 
                  onClick={handleExportSrt}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-semibold text-gray-300 bg-gray-700/80 hover:bg-gray-600/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition-all"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  匯出 SRT 檔案
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
       <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #6b7280; border-radius: 4px; }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 0.25rem; }
      `}</style>
    </>
  );
};

export default VideoPlayer;