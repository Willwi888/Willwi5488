import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import LyricsTiming from './components/LyricsTiming';
import VideoPlayer from './components/VideoPlayer';
import MusicIcon from './components/icons/MusicIcon';
import ImageIcon from './components/icons/ImageIcon';
import { TimedLyric } from './types';
import Loader from './components/Loader';
import VideoGenerator from './components/VideoGenerator';
import ImageGenerator from './components/ImageGenerator';
import VideoIcon from './components/icons/VideoIcon';
import LockIcon from './components/icons/LockIcon';
import FeedbackModal from './components/FeedbackModal';
import PrevIcon from './components/icons/PrevIcon';
import NextIconCombined from './components/icons/NextIcon';


type AppState = 'CHOOSER' | 'FORM' | 'TIMING' | 'PREVIEW' | 'VIDEO_GENERATOR' | 'IMAGE_GENERATOR';
type InputMethod = 'upload' | 'link';

const DEFAULT_BG_IMAGE = 'https://storage.googleapis.com/aistudio-hosting/workspace-template-assets/lyric-video-maker/default_bg.jpg';

const feedbackMessages = [
  "太精準了，您是對時的藝術家！",
  "傳說中的高手出現！節奏感無人能敵！",
  "實力水準高於80%，非常出色！",
  "精準度一流！音樂在您的指尖跳動。",
  "完成度極高，可以出道了！",
  "不錯喔！繼續保持這個感覺。",
  "威威說下一次請加油～開玩笑的，您做得很棒！"
];

// Helper function to convert SRT time format (HH:MM:SS,ms) to seconds
const srtTimeToSeconds = (time: string): number => {
  const parts = time.split(/[:,]/);
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  const milliseconds = parseInt(parts[3], 10);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

// New parser for SRT content that extracts timing information
const parseSrtWithTimestamps = (srtContent: string): TimedLyric[] => {
  const blocks = srtContent.trim().replace(/\r/g, '').split('\n\n');
  const timedLyrics: TimedLyric[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    const timeLine = lines[1];
    if (timeLine && timeLine.includes('-->')) {
      try {
        const [startTimeStr, endTimeStr] = timeLine.split(' --> ');
        const text = lines.slice(2).join('\n');
        
        timedLyrics.push({
          text,
          startTime: srtTimeToSeconds(startTimeStr),
          endTime: srtTimeToSeconds(endTimeStr),
        });
      } catch (error) {
        console.error("Failed to parse SRT time block:", block, error);
        // Skip malformed blocks
      }
    }
  }
  return timedLyrics;
};

const convertGoogleDriveLink = (url: string): string | null => {
    const regex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
    return null;
};


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('CHOOSER');
  const [lyricsText, setLyricsText] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioInputMethod, setAudioInputMethod] = useState<InputMethod>('upload');
  const [audioUrlInput, setAudioUrlInput] = useState('');

  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [imageInputMethod, setImageInputMethod] = useState<InputMethod>('upload');
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [timedLyrics, setTimedLyrics] = useState<TimedLyric[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const srtInputRef = useRef<HTMLInputElement>(null);

  const [isAiGeneratorUnlocked, setIsAiGeneratorUnlocked] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const audioUrl = useMemo(() => {
      if (audioInputMethod === 'upload' && audioFile) {
          return URL.createObjectURL(audioFile);
      }
      if (audioInputMethod === 'link' && audioUrlInput) {
          return convertGoogleDriveLink(audioUrlInput) || '';
      }
      return '';
  }, [audioFile, audioInputMethod, audioUrlInput]);

  const backgroundImageUrl = useMemo(() => {
      if (imageInputMethod === 'upload' && backgroundImage) {
          return URL.createObjectURL(backgroundImage);
      }
      if (imageInputMethod === 'link' && imageUrlInput) {
          const convertedUrl = convertGoogleDriveLink(imageUrlInput);
          if (convertedUrl) return convertedUrl;
      }
      return DEFAULT_BG_IMAGE;
  }, [backgroundImage, imageInputMethod, imageUrlInput]);


  const handleStartTiming = (e: React.FormEvent) => {
    e.preventDefault();
    if (lyricsText && audioUrl && songTitle && artistName) {
      if (timedLyrics.length > 0) {
        setAppState('PREVIEW');
      } else {
        setAppState('TIMING');
      }
    } else {
      alert('請填寫所有必填欄位並提供有效的音訊來源！');
    }
  };

  const handleTimingComplete = useCallback((lyrics: TimedLyric[]) => {
    setTimedLyrics(lyrics);
    const randomIndex = Math.floor(Math.random() * feedbackMessages.length);
    setFeedbackMessage(feedbackMessages[randomIndex]);
  }, []);

  const handleBackToForm = useCallback(() => {
    setAppState('FORM');
  }, []);
  
  const handleBackToTiming = useCallback(() => {
    setAppState('TIMING');
  }, []);

  const handleBackToChooser = useCallback(() => {
    setAppState('CHOOSER');
  }, []);
  
  const handleImportSrtClick = () => {
    srtInputRef.current?.click();
  };

  const parseSrtTextOnly = (srtContent: string): string => {
    const lines = srtContent.replace(/\r/g, '').split('\n');
    const lyricLines = lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed === '') return false;
      if (/^\d+$/.test(trimmed)) return false;
      if (trimmed.includes('-->')) return false;
      return true;
    });
    return lyricLines.join('\n');
  };

  const handleSrtFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputElement = e.target;
    if (!file) return;

    const processFile = () => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const srtContent = event.target?.result as string;
        if (srtContent) {
          const parsedTimedLyrics = parseSrtWithTimestamps(srtContent);
          if (parsedTimedLyrics.length > 0) {
            setTimedLyrics(parsedTimedLyrics);
            const plainLyrics = parsedTimedLyrics.map(l => l.text).join('\n');
            setLyricsText(plainLyrics);
            alert('SRT 檔案已成功匯入並對時！請點擊「開始對時」按鈕直接進入預覽。');
          } else {
            const parsedLyrics = parseSrtTextOnly(srtContent);
            setLyricsText(parsedLyrics);
            setTimedLyrics([]);
          }
        }
        if (inputElement) inputElement.value = ''; // Reset after processing
      };
      reader.onerror = () => {
        alert('讀取 SRT 檔案時發生錯誤。');
        if (inputElement) inputElement.value = ''; // Reset on error too
      };
      reader.readAsText(file);
    };

    if (timedLyrics.length > 0) {
      if (window.confirm('匯入新的 SRT 檔案將會覆蓋您目前的對時進度。您確定要繼續嗎？')) {
        processFile();
      } else {
        if (inputElement) inputElement.value = ''; // Reset if user cancels
      }
    } else {
      processFile();
    }
  };
  
  const handleLyricsTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (timedLyrics.length > 0 && newText !== lyricsText) {
      if (window.confirm('編輯歌詞將會清除所有已設定的時間點。您確定要繼續嗎？')) {
        setLyricsText(newText);
        setTimedLyrics([]);
      }
      // If user cancels, we do nothing and the controlled component will revert the change.
    } else {
      setLyricsText(newText);
    }
  };
  
  const isFormValid = useMemo(() => {
    const isAudioReady = audioInputMethod === 'upload' ? !!audioFile : !!convertGoogleDriveLink(audioUrlInput);
    return !!(lyricsText && isAudioReady && songTitle && artistName);
  }, [lyricsText, audioInputMethod, audioFile, audioUrlInput, songTitle, artistName]);

  const handleUnlockAiGenerator = () => {
    if (isAiGeneratorUnlocked) return;
    const password = prompt('請輸入密碼以解鎖 AI 功能：');
    if (password === '0000') {
      setIsAiGeneratorUnlocked(true);
      alert('AI 功能已解鎖！');
    } else if (password !== null) { // User didn't click cancel
      alert('密碼錯誤！');
    }
  };


  const renderContent = () => {
    switch (appState) {
      case 'CHOOSER':
        const containerWidth = isAiGeneratorUnlocked ? 'max-w-5xl' : 'max-w-2xl';
        const gridCols = isAiGeneratorUnlocked ? 'md:grid-cols-3' : 'md:grid-cols-1';
        return (
          <div className={`w-full ${containerWidth} p-8 space-y-8 relative transition-all duration-500`}>
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Creative Suite</h1>
                <p className="mt-3 text-lg text-gray-400">Choose a tool to start your creation.</p>
            </div>
            <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
                <div 
                    onClick={() => setAppState('FORM')} 
                    className="group relative p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700 hover:border-gray-500 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
                >
                    <MusicIcon className="w-16 h-16 text-gray-400 group-hover:text-white transition-colors"/>
                    <h3 className="mt-4 text-xl font-bold text-white">Lyric Video Maker</h3>
                    <p className="mt-2 text-sm text-gray-400">Create dynamic lyric videos synced with your music and background art.</p>
                </div>

                {isAiGeneratorUnlocked && (
                  <>
                    <div 
                        onClick={() => setAppState('IMAGE_GENERATOR')}
                        className="group relative p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700 hover:border-gray-500 transition-all duration-300 cursor-pointer flex flex-col items-center text-center animate-fade-in"
                    >
                        <ImageIcon className="w-16 h-16 text-gray-400 group-hover:text-white transition-colors"/>
                        <h3 className="mt-4 text-xl font-bold text-white">Generate images with a prompt</h3>
                        <p className="mt-2 text-sm text-gray-400">Create a unique image from a text description using AI.</p>
                    </div>
                    <div 
                        onClick={() => setAppState('VIDEO_GENERATOR')}
                        className="group relative p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700 hover:border-gray-500 transition-all duration-300 cursor-pointer flex flex-col items-center text-center animate-fade-in"
                    >
                        <VideoIcon className="w-16 h-16 text-gray-400 group-hover:text-white transition-colors"/>
                        <h3 className="mt-4 text-xl font-bold text-white">Animate images with Veo</h3>
                        <p className="mt-2 text-sm text-gray-400">Generate a short video from an image and a text prompt using Veo.</p>
                    </div>
                  </>
                )}
            </div>
            {!isAiGeneratorUnlocked && (
              <div className="absolute bottom-0 right-0 p-2">
                <button 
                  onClick={handleUnlockAiGenerator} 
                  title="天選之桶"
                  className="p-2 rounded-full hover:bg-gray-700/50 transition-colors"
                >
                  <LockIcon className="w-6 h-6 text-gray-500 hover:text-white" />
                </button>
              </div>
            )}
            <style>{`
              @keyframes fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
              .animate-fade-in {
                animation: fade-in 0.5s ease-out forwards;
              }
            `}</style>
          </div>
        );
      case 'IMAGE_GENERATOR':
        return <ImageGenerator onBack={handleBackToChooser} />;
      case 'VIDEO_GENERATOR':
        return <VideoGenerator onBack={handleBackToChooser} />;
      case 'TIMING':
        return (
          <LyricsTiming
            lyricsText={lyricsText}
            audioUrl={audioUrl}
            backgroundImageUrl={backgroundImageUrl}
            onComplete={handleTimingComplete}
            onBack={handleBackToForm}
          />
        );
      case 'PREVIEW':
        return (
          <VideoPlayer
            timedLyrics={timedLyrics}
            audioUrl={audioUrl}
            imageUrl={backgroundImageUrl}
            onBack={timedLyrics.length > 0 ? handleBackToForm : handleBackToTiming}
            songTitle={songTitle}
            artistName={artistName}
          />
        );
      case 'FORM':
      default:
        const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
          <button
              type="button"
              onClick={onClick}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                  active
                      ? 'text-white border-b-2 border-gray-400'
                      : 'text-gray-400 hover:text-white'
              }`}
          >
              {children}
          </button>
        );

        return (
          <div className="w-full max-w-lg p-8 space-y-6 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 text-white relative">
            <button onClick={handleBackToChooser} className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors">
              <PrevIcon className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Lyric Video Maker
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Fill in the details to start creating your video.
              </p>
            </div>

            <form onSubmit={handleStartTiming} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="song-title" className="block text-sm font-medium text-gray-300">
                    歌曲名稱 <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="song-title"
                    type="text"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="artist-name" className="block text-sm font-medium text-gray-300">
                    演出者 <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="artist-name"
                    type="text"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lyrics" className="flex justify-between items-center text-sm font-medium text-gray-300">
                  <span>歌詞 <span className="text-red-400">*</span></span>
                  <button type="button" onClick={handleImportSrtClick} className="text-sm text-gray-400 hover:text-white underline">
                    匯入 SRT
                  </button>
                  <input type="file" ref={srtInputRef} onChange={handleSrtFileChange} accept=".srt" className="hidden" />
                </label>
                <textarea
                  id="lyrics"
                  rows={8}
                  value={lyricsText}
                  onChange={handleLyricsTextChange}
                  className="mt-1 block w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm custom-scrollbar"
                  placeholder="請在此處輸入或貼上您的歌詞..."
                  required
                />
              </div>

              {/* Audio Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300">音訊來源 <span className="text-red-400">*</span></label>
                <div className="mt-1 flex border border-gray-600 rounded-md overflow-hidden">
                  <TabButton active={audioInputMethod === 'upload'} onClick={() => setAudioInputMethod('upload')}>上傳檔案</TabButton>
                  <TabButton active={audioInputMethod === 'link'} onClick={() => setAudioInputMethod('link')}>使用連結</TabButton>
                </div>
                <div className="mt-2">
                  {audioInputMethod === 'upload' ? (
                    <input type="file" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} accept="audio/*" className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600" />
                  ) : (
                    <input type="url" value={audioUrlInput} onChange={(e) => setAudioUrlInput(e.target.value)} placeholder="Google Drive 連結" className="block w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm" />
                  )}
                </div>
              </div>

              {/* Background Image Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300">背景圖片 (選填)</label>
                <div className="mt-1 flex border border-gray-600 rounded-md overflow-hidden">
                  <TabButton active={imageInputMethod === 'upload'} onClick={() => setImageInputMethod('upload')}>上傳檔案</TabButton>
                  <TabButton active={imageInputMethod === 'link'} onClick={() => setImageInputMethod('link')}>使用連結</TabButton>
                </div>
                <div className="mt-2">
                  {imageInputMethod === 'upload' ? (
                    <input type="file" onChange={(e) => setBackgroundImage(e.target.files?.[0] || null)} accept="image/*" className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600" />
                  ) : (
                    <input type="url" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder="Google Drive 或圖片連結" className="block w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm" />
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-gray-900 bg-[#a6a6a6] hover:bg-[#999999] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {timedLyrics.length > 0 ? '預覽影片' : '開始對時'}
                  <NextIconCombined className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        );
    }
  };

  const handleFeedbackClose = () => {
    setFeedbackMessage(null);
    setAppState('PREVIEW');
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gray-900 text-white font-[sans-serif]">
        {isMounted && (
            <div className="relative w-full h-full flex items-center justify-center">
                {renderContent()}
            </div>
        )}
        {feedbackMessage && <FeedbackModal message={feedbackMessage} onClose={handleFeedbackClose} />}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #6b7280; border-radius: 4px; }
        `}</style>
    </main>
  );
};

export default App;