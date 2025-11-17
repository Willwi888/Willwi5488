import React, { useState, useEffect } from 'react';
import Loader from './Loader';
import ImageIcon from './icons/ImageIcon';
import PrevIcon from './icons/PrevIcon';
import { initializeGenAI } from '../services/geminiService';

const ImageGenerator: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [loadingState, setLoadingState] = useState<{ message: string; details?: string } | null>(null);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [isKeyCheckComplete, setIsKeyCheckComplete] = useState(false);

    useEffect(() => {
        const checkApiKey = async () => {
            if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                try {
                    const hasKey = await window.aistudio.hasSelectedApiKey();
                    setHasApiKey(hasKey);
                } catch (e) {
                    console.error("Error checking for API key:", e);
                }
            }
            setIsKeyCheckComplete(true);
        };
        checkApiKey();
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            setHasApiKey(true);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            alert('請輸入提示文字。');
            return;
        }

        setLoadingState({ message: '正在初始化...' });
        setGeneratedImageUrl(null);

        try {
            const ai = initializeGenAI();
            
            setLoadingState({ message: '正在向 AI 發送請求...', details: '這可能需要一點時間...' });
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio,
                },
            });

            setLoadingState({ message: '正在處理生成的圖片...' });
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            setGeneratedImageUrl(imageUrl);

        } catch (error: any) {
            console.error('圖片生成失敗:', error);
            alert(`圖片生成失敗: ${error.message}`);
             if (error.message && error.message.includes('API key not valid')) {
                setHasApiKey(false);
                alert('API 金鑰錯誤。請重新選擇您的 API 金鑰。');
            }
        } finally {
            setLoadingState(null);
        }
    };

    if (!isKeyCheckComplete) {
        return <Loader message="正在檢查 API 金鑰設定..." />;
    }

    if (!hasApiKey) {
        return (
            <div className="w-full max-w-lg p-8 space-y-6 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 text-white text-center">
                <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
                <h2 className="text-2xl font-bold">需要 API 金鑰</h2>
                <p className="text-gray-300">
                    若要使用 AI 圖像生成器，您需要選擇一個 Gemini API 金鑰。
                    圖像生成是一項計費功能。
                </p>
                <p className="text-sm text-gray-400">
                    更多詳情，請參閱{' '}
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                        計費文件
                    </a>。
                </p>
                <div className="flex items-center justify-center gap-4 pt-4">
                    <button onClick={onBack} className="px-6 py-2 text-gray-300 font-semibold bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                        返回
                    </button>
                    <button
                        onClick={handleSelectKey}
                        className="px-6 py-2 bg-[#a6a6a6] text-gray-900 font-bold rounded-lg border border-white/50 hover:bg-[#999999] transition-all"
                    >
                        選擇 API 金鑰
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <>
            {loadingState && <Loader message={loadingState.message} details={loadingState.details} />}
            <div className="w-full max-w-4xl p-8 space-y-6 bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700">
                 <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <ImageIcon className="w-10 h-10 text-gray-400 flex-shrink-0" />
                      <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">
                          AI 圖像生成器
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                          輸入您的想法，讓 AI 為您創造獨一無二的圖像。
                        </p>
                      </div>
                    </div>
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm flex-shrink-0 ml-4">
                      <PrevIcon className="w-6 h-6" />
                      返回
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {/* Left Column: Inputs */}
                  <div className="space-y-6">
                    <div>
                       <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                          提示文字
                       </label>
                      <textarea
                        id="prompt"
                        rows={6}
                        className="block w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm text-white"
                        placeholder="例如：一隻穿著太空衣的貓在月球上騎著滑板..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        required
                      />
                    </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-300 mb-2">
                          長寬比
                       </label>
                       <div className="grid grid-cols-5 gap-2 text-sm">
                           {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map(ratio => (
                              <label key={ratio} className={`p-2 border rounded-md cursor-pointer text-center transition-colors ${aspectRatio === ratio ? 'border-gray-400 bg-gray-700' : 'border-gray-600 hover:bg-gray-700/50'}`}>
                                  <input type="radio" name="aspectRatio" value={ratio} checked={aspectRatio === ratio} onChange={() => setAspectRatio(ratio)} className="sr-only" />
                                  <span>{ratio}</span>
                              </label>
                           ))}
                       </div>
                    </div>
                     <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || !!loadingState}
                        className="w-full flex justify-center py-3 px-4 border border-white/50 rounded-md shadow-sm text-sm font-bold text-gray-900 bg-[#a6a6a6] hover:bg-[#999999] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {loadingState ? '生成中...' : '生成圖像'}
                      </button>
                  </div>
                  {/* Right Column: Preview */}
                  <div className="flex flex-col items-center justify-center bg-gray-900/50 border border-gray-600 rounded-md p-4 min-h-[300px] md:min-h-full">
                      {generatedImageUrl ? (
                          <img src={generatedImageUrl} alt="Generated" className="w-full h-full object-contain rounded-md" />
                      ) : (
                          <div className="text-center text-gray-500">
                            <ImageIcon className="mx-auto h-16 w-16" />
                            <p className="mt-2">生成的圖像將顯示在此處</p>
                          </div>
                      )}
                  </div>
                </div>
            </div>
        </>
    );
};
export default ImageGenerator;