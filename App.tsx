import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import SubtitleDisplay from './components/SubtitleDisplay';
import Loader from './components/Loader';
import TitleInput from './components/TitleInput';
import { translateSrtStream } from './services/geminiService';
import { isValidSrt, parseSrt, SubtitleBlock, stringifySrtFromBlocks } from './utils/srtParser';

export interface Movie {
  title: string;
  year: string;
  description: string;
  posterUrl: string;
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
  posterUrl: string; // Album art
}

export type ContextObject = Movie | Song;

export interface TranslationOptions {
    context: ContextObject;
    contextType: 'movie' | 'music';
    mode: 'all' | 'parts';
    chunkSize?: number;
}

type AppState = 'IDLE' | 'FILE_SELECTED' | 'TRANSLATING' | 'EDITING' | 'ERROR';

const LOCAL_STORAGE_KEY = 'srtTranslatorProgress';

const FileSummary: React.FC<{ fileName: string; onReset: () => void }> = ({ fileName, onReset }) => (
  <div className="p-6 bg-gray-900/50 glass-effect rounded-2xl border border-white/10 w-full animate-fade-in">
    <h3 className="text-xl font-bold text-gray-300 mb-4">Arquivo Selecionado</h3>
    <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-md text-white truncate font-mono" title={fileName}>{fileName.replace('_pt-br.srt', '.srt')}</p>
    </div>
    <button
      onClick={onReset}
      className="w-full mt-6 px-4 py-2 bg-red-600/80 text-white font-semibold rounded-lg hover:bg-red-700 transition-all transform hover:scale-105"
    >
      Escolher Outro Arquivo
    </button>
  </div>
);

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [originalSrt, setOriginalSrt] = useState<string>('');
  const [subtitles, setSubtitles] = useState<SubtitleBlock[]>([]);
  const [context, setContext] = useState<ContextObject | null>(null);
  const [contextType, setContextType] = useState<'movie' | 'music'>('movie');
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [fileEncoding, setFileEncoding] = useState('UTF-8');
  
  // State for chunked translation
  const [translationMode, setTranslationMode] = useState<'all' | 'parts'>('all');
  const [chunkSize, setChunkSize] = useState(100);
  const [nextBlockToTranslate, setNextBlockToTranslate] = useState(0);

  // Check for saved progress on initial load
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedProgress) {
        setHasSavedProgress(true);
      }
    } catch (e) {
      console.error("Falha ao ler do localStorage", e);
    }
  }, []);

  // Save progress whenever it changes
  useEffect(() => {
    // Don't save if we are in the initial state or have nothing to save
    if (appState === 'IDLE' || !originalSrt) {
      return;
    }
    try {
      const progressToSave = {
        appState,
        originalSrt,
        subtitles,
        context,
        contextType,
        posterUrl,
        fileName,
        progress,
        translationMode,
        chunkSize,
        nextBlockToTranslate,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progressToSave));
    } catch (e) {
      console.error("Falha ao salvar o progresso no localStorage", e);
    }
  }, [appState, subtitles, context, contextType, posterUrl, fileName, progress, originalSrt, translationMode, chunkSize, nextBlockToTranslate]);

  const cleanFileNameForQuery = (name: string): string => {
    let cleanedName = name.replace(/\.srt$/i, '');
    const yearMatch = cleanedName.match(/\b(19|20)\d{2}\b/);
    if (yearMatch && yearMatch.index) {
        cleanedName = cleanedName.substring(0, yearMatch.index);
    }
    cleanedName = cleanedName.replace(/[\._]/g, ' ');
    const tags = [
        '1080p', '720p', '480p', 'dvdrip', 'x264', 'x265', 'h264', 'h265',
        'web-dl', 'web dl', 'webrip', 'hdrip', 'brrip', 'bdrip', 'hdtv', 'bluray',
        'aac', 'ac3', 'dts', 'extended', 'unrated', 'remastered', 'directors cut', "director's cut",
        's\\d{1,2}e\\d{1,2}', 'eng', 'en', 'pt-br', 'ptbr',
        'official video', 'lyrics', 'lyric video', 'official music video'
    ];
    const tagsRegex = new RegExp(`\\b(${tags.join('|')})\\b`, 'gi');
    cleanedName = cleanedName.replace(tagsRegex, '');
    cleanedName = cleanedName.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, ''); // remove brackets and parentheses
    return cleanedName.replace(/[_-]$/g, '').replace(/\s+/g, ' ').trim();
  };
  
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setError('Não foi possível ler o conteúdo do arquivo.');
        setAppState('ERROR');
        return;
      }
      if (!isValidSrt(content)) {
        setError('Formato de arquivo SRT inválido. Por favor, envie um arquivo .srt válido.');
        setAppState('ERROR');
        return;
      }
      setOriginalSrt(content);
      setFileName(`${file.name.replace(/\.srt$/, '')}_pt-br.srt`);
      const cleanedTitle = cleanFileNameForQuery(file.name);
      
      // We set a temporary context object here to pass the title to TitleInput
      setContext({ title: cleanedTitle, year: '', description: '', posterUrl: '', director: '', genre: '' });

      setAppState('FILE_SELECTED');
    };
    reader.onerror = () => {
      setError('Erro ao ler o arquivo.');
      setAppState('ERROR');
    };
    reader.readAsText(file, fileEncoding);
  }, [fileEncoding]);
  
  const startTranslation = async (options: TranslationOptions) => {
    setError(null);
    setContext(options.context);
    setContextType(options.contextType);
    setPosterUrl(options.context.posterUrl);
    setTranslationMode(options.mode);
    setChunkSize(options.chunkSize || 100);

    const allBlocks = parseSrt(originalSrt);
    setSubtitles(allBlocks);
    setProgress({ current: 0, total: allBlocks.length });
    
    if (options.mode === 'all') {
      await translateContent(originalSrt, options.context, options.contextType, 0);
    } else {
      setNextBlockToTranslate(0);
      setAppState('EDITING'); // Go directly to editing screen for parts mode
    }
  };

  const translateContent = async (srtToTranslate: string, currentContext: ContextObject, type: 'movie' | 'music', translatedCountOffset: number) => {
    setAppState('TRANSLATING');
    try {
      const stream = translateSrtStream(srtToTranslate, currentContext, type);
      for await (const srtBlockText of stream) {
        const tempParsed = parseSrt(srtBlockText);
        if (tempParsed.length > 0) {
            const translatedBlock = tempParsed[0];
            setSubtitles(prevSubs => 
                prevSubs.map(sub => 
                    sub.index === translatedBlock.index 
                    ? { ...sub, translatedText: translatedBlock.originalText }
                    : sub
                )
            );
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
      }
      setAppState('EDITING');
    } catch (err) {
      console.error(err);
      setError('Falha ao traduzir a legenda. O modelo de IA pode estar sobrecarregado. Você pode tentar continuar a tradução.');
      setAppState('ERROR');
    }
  };
  
  const handleTranslateNextChunk = async () => {
    if (!context) return;
    const blocksToTranslate = subtitles.slice(nextBlockToTranslate, nextBlockToTranslate + chunkSize);
    if (blocksToTranslate.length === 0) return;

    const srtChunk = stringifySrtFromBlocks(blocksToTranslate);
    const alreadyTranslatedCount = subtitles.filter(s => !!s.translatedText).length;
    await translateContent(srtChunk, context, contextType, alreadyTranslatedCount);
    setNextBlockToTranslate(nextBlockToTranslate + chunkSize);
  }

  const handleResumeTranslation = async () => {
    if (!context || subtitles.length === 0) {
        handleReset();
        return;
    }
    const untranslatedBlocks = subtitles.filter(s => !s.translatedText);
    if (untranslatedBlocks.length === 0) {
        setAppState('EDITING');
        return;
    }
    const srtToResume = stringifySrtFromBlocks(untranslatedBlocks);
    const alreadyTranslatedCount = subtitles.length - untranslatedBlocks.length;
    await translateContent(srtToResume, context, contextType, alreadyTranslatedCount);
  };

  const handleContinue = useCallback(() => {
    try {
        const savedProgressJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedProgressJSON) {
            const savedProgress = JSON.parse(savedProgressJSON);
            setAppState(savedProgress.appState || 'EDITING');
            setOriginalSrt(savedProgress.originalSrt || '');
            setSubtitles(savedProgress.subtitles || []);
            setContext(savedProgress.context || null);
            setContextType(savedProgress.contextType || 'movie');
            setPosterUrl(savedProgress.posterUrl || null);
            setFileName(savedProgress.fileName || '');
            setProgress(savedProgress.progress || { current: 0, total: 0 });
            setTranslationMode(savedProgress.translationMode || 'all');
            setChunkSize(savedProgress.chunkSize || 100);
            setNextBlockToTranslate(savedProgress.nextBlockToTranslate || 0);
            setHasSavedProgress(false); 
        } else {
            setError("Não foi possível encontrar o progresso salvo.");
            setAppState('ERROR');
        }
    } catch (e) {
        console.error("Falha ao carregar ou analisar o progresso salvo", e);
        setError("O progresso salvo está corrompido e não pôde ser carregado. Começando do zero.");
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setHasSavedProgress(false);
        setAppState('IDLE');
    }
  }, []);

  const handleSubtitleChange = useCallback((index: number, newText: string) => {
    setSubtitles(prev => 
        prev.map(sub => sub.index === index ? { ...sub, translatedText: newText } : sub)
    );
  }, []);

  const handleReset = () => {
    setAppState('IDLE');
    setOriginalSrt('');
    setSubtitles([]);
    setContext(null);
    setPosterUrl(null);
    setError(null);
    setFileName('');
    setProgress({ current: 0, total: 0 });
    setNextBlockToTranslate(0);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setHasSavedProgress(false);
    } catch (e) {
      console.error("Falha ao limpar o localStorage", e);
    }
  };

  const renderContent = () => {
    switch (appState) {
      case 'IDLE':
        return <FileUpload 
                  onFileSelect={handleFileSelect} 
                  disabled={false} 
                  hasSavedProgress={hasSavedProgress} 
                  onContinue={handleContinue} 
                  fileEncoding={fileEncoding}
                  onEncodingChange={setFileEncoding}
                />;
      case 'FILE_SELECTED':
        return context && (
            <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-start animate-fade-in">
                <div className="lg:w-1/3 w-full">
                    <FileSummary fileName={fileName} onReset={handleReset} />
                </div>
                <div className="lg:w-2/3 w-full">
                    <TitleInput
                        initialQuery={context.title}
                        onStartTranslation={startTranslation}
                    />
                </div>
            </div>
        );
      case 'TRANSLATING':
        return (
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <Loader contextTitle={context?.title} progress={progress} posterUrl={posterUrl} />
            <SubtitleDisplay
              subtitles={subtitles}
              fileName={fileName}
              onReset={handleReset}
              onSubtitleChange={handleSubtitleChange}
              isTranslating={true}
              posterUrl={posterUrl}
              translationMode={translationMode}
              onTranslateNextChunk={handleTranslateNextChunk}
              nextChunkSize={chunkSize}
              hasMoreToTranslate={nextBlockToTranslate < subtitles.length}
            />
          </div>
        );
      case 'EDITING':
        return (
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
            <SubtitleDisplay
              subtitles={subtitles}
              fileName={fileName}
              onReset={handleReset}
              onSubtitleChange={handleSubtitleChange}
              isTranslating={false}
              posterUrl={posterUrl}
              translationMode={translationMode}
              onTranslateNextChunk={handleTranslateNextChunk}
              nextChunkSize={chunkSize}
              hasMoreToTranslate={nextBlockToTranslate < subtitles.length && subtitles.some(s => !s.translatedText)}
            />
          </div>
        );
      case 'ERROR':
        const canResume = subtitles.length > 0 && !!context;
        return (
          <div className="text-center p-8 glass-effect rounded-lg animate-fade-in">
            <p className="text-red-400 font-semibold text-xl">Ocorreu um Erro</p>
            <p className="text-red-300 mt-2 max-w-xl mx-auto">{error}</p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
              {canResume && (
                 <button
                    onClick={handleResumeTranslation}
                    className="px-4 py-2 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-700 transition-transform transform hover:scale-105"
                  >
                    Continuar Tradução
                  </button>
              )}
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-transform transform hover:scale-105"
              >
                {canResume ? 'Começar do Zero' : 'Tentar Novamente'}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen text-gray-200 font-sans flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="flex justify-center items-center h-full">
          {renderContent()}
        </div>
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
        <p>Desenvolvido com Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;