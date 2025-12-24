
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import SubtitleDisplay from './components/SubtitleDisplay';
import Loader from './components/Loader';
import TitleInput from './components/TitleInput';
import HowItWorks from './components/HowItWorks';
import { translateSrtBatch, retranslateBlock, reformatBlock } from './services/geminiService';
import { isValidSrt, parseSrt, SubtitleBlock, stringifySrtFromBlocks } from './utils/srtParser';

export interface Movie {
  title: string;
  year: string;
  description: string;
  director: string;
  genre: string;
}

export interface Song {
  title: string;
  artist: string;
  album: string;
  year: string;
  genre: string;
  meaning: string;
}

export type ContextObject = Movie | Song;

export interface TranslationOptions {
    context: ContextObject;
    contextType: 'movie' | 'music';
    mode: 'all' | 'parts';
    sourceLanguage: 'en' | 'es';
    chunkSize?: number;
}

type AppState = 'IDLE' | 'FILE_SELECTED' | 'TRANSLATING' | 'EDITING' | 'ERROR';

const LOCAL_STORAGE_KEY = 'srtTranslatorProgress_v3';
const BATCH_SIZE = 30; // Traduzir de 30 em 30 legendas para estabilidade

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [originalSrt, setOriginalSrt] = useState<string>('');
  const [subtitles, setSubtitles] = useState<SubtitleBlock[]>([]);
  const [context, setContext] = useState<ContextObject | null>(null);
  const [contextType, setContextType] = useState<'movie' | 'music'>('movie');
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [fileEncoding, setFileEncoding] = useState('UTF-8');
  const [sourceLanguage, setSourceLanguage] = useState<'en' | 'es'>('en');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  
  const stopTranslationRef = useRef(false);

  useEffect(() => {
    const savedProgress = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedProgress) setHasSavedProgress(true);
  }, []);

  useEffect(() => {
    if (appState === 'IDLE' || !originalSrt) return;
    const subtitlesToSave = subtitles.map(({ isUpdating, ...rest }) => rest);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      appState: appState === 'TRANSLATING' ? 'EDITING' : appState,
      originalSrt, subtitles: subtitlesToSave, context, contextType, fileName, progress, sourceLanguage
    }));
  }, [appState, subtitles, context, contextType, fileName, progress, originalSrt, sourceLanguage]);

  const handleFileSelect = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!isValidSrt(content)) {
        setError('Arquivo SRT inválido.');
        setAppState('ERROR');
        return;
      }
      setOriginalSrt(content);
      setSubtitles(parseSrt(content));
      setFileName(`${file.name.replace(/\.srt$/, '')}_pt-br.srt`);
      
      const cleanName = file.name.replace(/\.srt$/i, '').replace(/[\._]/g, ' ').replace(/\d{4}.*/, '').trim();
      setContext({ title: cleanName, year: '', description: '', director: '', genre: '' });
      setAppState('FILE_SELECTED');
    };
    reader.readAsText(file, fileEncoding);
  }, [fileEncoding]);

  const startTranslation = async (options: TranslationOptions) => {
    setError(null);
    setContext(options.context);
    setContextType(options.contextType);
    setSourceLanguage(options.sourceLanguage);
    stopTranslationRef.current = false;
    
    const allBlocks = subtitles.length > 0 ? subtitles : parseSrt(originalSrt);
    setProgress({ current: 0, total: allBlocks.length });
    
    await translateInChunks(allBlocks, options.context, options.contextType, options.sourceLanguage);
  };

  const translateInChunks = async (allBlocks: SubtitleBlock[], currentContext: ContextObject, type: 'movie' | 'music', language: 'en' | 'es') => {
    setAppState('TRANSLATING');
    
    try {
        for (let i = 0; i < allBlocks.length; i += BATCH_SIZE) {
            if (stopTranslationRef.current) break;

            const chunk = allBlocks.slice(i, i + BATCH_SIZE);
            const chunkSrt = stringifySrtFromBlocks(chunk);
            
            const translatedChunkText = await translateSrtBatch(chunkSrt, currentContext, type, language);
            const parsedTranslatedChunk = parseSrt(translatedChunkText);

            setSubtitles(prev => {
                const newSubs = [...prev];
                parsedTranslatedChunk.forEach(tBlock => {
                    const indexInOriginal = newSubs.findIndex(s => s.index === tBlock.index);
                    if (indexInOriginal !== -1) {
                        newSubs[indexInOriginal] = { 
                            ...newSubs[indexInOriginal], 
                            translatedText: tBlock.originalText // parseSrt coloca o texto em originalText
                        };
                    }
                });
                return newSubs;
            });

            setProgress(prev => ({ ...prev, current: Math.min(prev.total, i + BATCH_SIZE) }));
            
            // Pequeno delay para evitar rate limiting agressivo entre lotes
            if (i + BATCH_SIZE < allBlocks.length) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        setAppState('EDITING');
    } catch (err: any) {
        console.error(err);
        setError(`Falha ao traduzir lote: ${err.message}. Tente continuar.`);
        setAppState('ERROR');
    }
  };

  const handleSubtitleChange = useCallback((index: number, newText: string) => {
    setSubtitles(prev => prev.map(sub => sub.index === index ? { ...sub, translatedText: newText } : sub));
  }, []);

  const handleReset = () => {
    setAppState('IDLE');
    setSubtitles([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return (
    <div className="min-h-screen text-gray-200 font-sans flex flex-col bg-gray-950">
      <Header onShowHowItWorks={() => setShowHowItWorks(true)} />
      {showHowItWorks && <HowItWorks onClose={() => setShowHowItWorks(false)} />}
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-full">
          {appState === 'IDLE' && (
            <FileUpload 
              onFileSelect={handleFileSelect} 
              disabled={false} 
              hasSavedProgress={hasSavedProgress} 
              onContinue={() => {
                const saved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)!);
                setAppState(saved.appState);
                setSubtitles(saved.subtitles);
                setOriginalSrt(saved.originalSrt);
                setContext(saved.context);
                setFileName(saved.fileName);
                setProgress(saved.progress);
              }} 
              fileEncoding={fileEncoding}
              onEncodingChange={setFileEncoding}
              sourceLanguage={sourceLanguage}
              onSourceLanguageChange={setSourceLanguage}
            />
          )}
          {appState === 'FILE_SELECTED' && context && (
            <div className="w-full max-w-4xl mx-auto animate-fade-in">
                <TitleInput initialQuery={context.title} onStartTranslation={startTranslation} sourceLanguage={sourceLanguage} />
                <button onClick={handleReset} className="mt-4 text-gray-500 hover:text-white block mx-auto text-sm">Escolher outro arquivo</button>
            </div>
          )}
          {appState === 'TRANSLATING' && (
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
                <Loader progress={progress} onStop={() => stopTranslationRef.current = true} />
                <div className="mt-8 w-full">
                    <SubtitleDisplay 
                        subtitles={subtitles} 
                        fileName={fileName} 
                        onReset={handleReset} 
                        onSubtitleChange={handleSubtitleChange} 
                        isTranslating={true} 
                        translationMode="all" 
                        onTranslateNextChunk={() => {}} 
                        onResumeTranslation={() => {}} 
                        nextChunkSize={0} 
                        hasMoreToTranslate={false} 
                        onRetranslateBlock={() => {}} 
                        onReformatBlock={() => {}} 
                    />
                </div>
            </div>
          )}
          {appState === 'EDITING' && (
            <SubtitleDisplay 
                subtitles={subtitles} 
                fileName={fileName} 
                onReset={handleReset} 
                onSubtitleChange={handleSubtitleChange} 
                isTranslating={false} 
                translationMode="all" 
                onTranslateNextChunk={() => {}} 
                onResumeTranslation={() => {
                    const remaining = subtitles.filter(s => !s.translatedText);
                    if (remaining.length > 0 && context) {
                        translateInChunks(subtitles, context, contextType, sourceLanguage);
                    }
                }} 
                nextChunkSize={0} 
                hasMoreToTranslate={subtitles.some(s => !s.translatedText)} 
                onRetranslateBlock={async (idx) => {
                    const block = subtitles.find(s => s.index === idx);
                    if (!block || !context) return;
                    setSubtitles(prev => prev.map(s => s.index === idx ? {...s, isUpdating: true} : s));
                    const res = await retranslateBlock(block.originalText, context, contextType, sourceLanguage);
                    setSubtitles(prev => prev.map(s => s.index === idx ? {...s, translatedText: res, isUpdating: false} : s));
                }} 
                onReformatBlock={async (idx) => {
                    const block = subtitles.find(s => s.index === idx);
                    if (!block || !context) return;
                    setSubtitles(prev => prev.map(s => s.index === idx ? {...s, isUpdating: true} : s));
                    const res = await reformatBlock(block.translatedText || '', context, contextType);
                    setSubtitles(prev => prev.map(s => s.index === idx ? {...s, translatedText: res, isUpdating: false} : s));
                }} 
            />
          )}
          {appState === 'ERROR' && (
            <div className="text-center p-10 glass-effect rounded-2xl">
                <h3 className="text-2xl font-bold text-red-400 mb-2">Ops! Ocorreu um erro</h3>
                <p className="text-gray-400 mb-6">{error}</p>
                <div className="flex gap-4 justify-center">
                    <button onClick={() => {
                        if (context) translateInChunks(subtitles, context, contextType, sourceLanguage);
                    }} className="px-6 py-2 bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors">Tentar de onde parou</button>
                    <button onClick={handleReset} className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">Recomeçar</button>
                </div>
            </div>
          )}
        </div>
      </main>
      <footer className="py-4 text-center text-gray-600 text-xs border-t border-white/5">
        Tradutor SRT Pro • Chunked Processing v3.0
      </footer>
    </div>
  );
};

export default App;
