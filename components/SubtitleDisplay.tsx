
import React, { useCallback } from 'react';
import { SubtitleBlock, stringifySrt } from '../utils/srtParser';

interface SubtitleDisplayProps {
  subtitles: SubtitleBlock[];
  fileName: string;
  onReset: () => void;
  onSubtitleChange: (index: number, newText: string) => void;
  isTranslating: boolean;
  translationMode: 'all' | 'parts';
  onTranslateNextChunk: () => void;
  onResumeTranslation: () => void;
  nextChunkSize: number;
  hasMoreToTranslate: boolean;
  onRetranslateBlock: (index: number) => void;
  onReformatBlock: (index: number) => void;
}

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2-H5z"/>
    </svg>
);

const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
    </svg>
);

const MagicWandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.41 4.59a2.02 2.02 0 0 0-2.83 0l-4.17 4.17-2.12-2.12a2.02 2.02 0 0 0-2.83 0l-5 5a2.02 2.02 0 0 0 0 2.83l2.12 2.12-4.17 4.17a2.02 2.02 0 0 0 2.83 2.83l4.17-4.17 2.12 2.12a2.02 2.02 0 0 0 2.83 0l5-5a2.02 2.02 0 0 0 0-2.83l-2.12-2.12 4.17-4.17a2.02 2.02 0 0 0 0-2.83zM6.59 13.59l-2.12-2.12 3.54-3.54 2.12 2.12-3.54 3.54zm10.83-3.42l-5 5-2.12-2.12 5-5 2.12 2.12z"/>
    </svg>
);

const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg className="animate-spin" {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const SubtitleItem: React.FC<{
    block: SubtitleBlock;
    onTextChange: (index: number, newText: string) => void;
    onRetranslateBlock: (index: number) => void;
    onReformatBlock: (index: number) => void;
}> = React.memo(({ block, onTextChange, onRetranslateBlock, onReformatBlock }) => {
    
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onTextChange(block.index, e.target.value);
    };

    const translatedLines = (block.translatedText || '').split('\n');
    const lineCounts = translatedLines.map(line => line.length);

    const hasTooManyLines = translatedLines.length > 2;
    const hasLineTooLong = lineCounts.some(count => count > 42);

    let borderColorClass = "border-gray-700 focus:ring-teal-500 focus:border-teal-500";
    if (hasTooManyLines) {
        borderColorClass = "border-yellow-500/50 focus:ring-yellow-500 focus:border-yellow-500";
    }
    if (hasLineTooLong) { // Red takes precedence
        borderColorClass = "border-red-500/50 focus:ring-red-500 focus:border-red-500";
    }
    const isUpdating = block.isUpdating;

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/30 p-4 rounded-lg border border-white/10 min-h-[80px] transition-opacity ${isUpdating ? 'opacity-50 animate-pulse' : 'opacity-100'}`}>
            <div>
                <p className="font-mono text-sm text-gray-400">{block.timestamp}</p>
                <p className="mt-2 text-gray-300 whitespace-pre-wrap">{block.originalText}</p>
            </div>
            <div className="flex flex-col">
                 <textarea
                    value={block.translatedText || ''}
                    onChange={handleInputChange}
                    placeholder={!block.translatedText ? 'Ainda não traduzido...' : ''}
                    className={`w-full flex-grow p-2 bg-gray-800/70 border rounded-md text-teal-200 font-mono text-sm focus:ring-2 focus:outline-none resize-none transition-colors ${borderColorClass}`}
                    rows={Math.max(block.originalText.split('\n').length, translatedLines.length, 1)}
                    disabled={isUpdating}
                />
                <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => onRetranslateBlock(block.index)} 
                            disabled={isUpdating || !block.originalText}
                            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-wait transition-colors rounded-full hover:bg-gray-700"
                            title="Retraduzir este bloco"
                        >
                            {isUpdating ? <SpinnerIcon className="w-4 h-4" /> : <RefreshIcon className="w-4 h-4"/>}
                        </button>
                         <button 
                            onClick={() => onReformatBlock(block.index)} 
                            disabled={isUpdating || !block.translatedText}
                            className="p-1.5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-wait transition-colors rounded-full hover:bg-gray-700"
                            title="Corrigir formatação (2 linhas, 42 caracteres)"
                        >
                            {isUpdating ? <SpinnerIcon className="w-4 h-4" /> : <MagicWandIcon className="w-4 h-4"/>}
                        </button>
                    </div>
                    <div className="text-right text-xs font-mono flex items-center gap-3">
                        {hasTooManyLines && <span className="text-yellow-400 font-bold bg-yellow-900/50 px-2 py-0.5 rounded">Aviso: {translatedLines.length} linhas</span>}
                        <div>
                        {lineCounts.map((count, index) => (
                            <span key={index} className={`ml-2 ${count > 42 ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                            L{index + 1}: {count}
                            </span>
                        ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ 
    subtitles, fileName, onReset, onSubtitleChange, isTranslating, 
    translationMode, onTranslateNextChunk, onResumeTranslation, nextChunkSize, hasMoreToTranslate,
    onRetranslateBlock, onReformatBlock
}) => {
  
  const handleTextChange = useCallback((index: number, newText: string) => {
    onSubtitleChange(index, newText);
  }, [onSubtitleChange]);

  const handleDownload = () => {
    const finalSrtContent = stringifySrt(subtitles);
    const blob = new Blob([finalSrtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const translatedCount = subtitles.filter(s => !!s.translatedText).length;
  const untranslatedCount = subtitles.length - translatedCount;
  const isIncomplete = untranslatedCount > 0;

  return (
    <div className="w-full flex flex-col gap-6 glass-effect p-6 rounded-2xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-center sm:text-left text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-300">Revise e Edite</h2>
        </div>
        <div className="flex items-center gap-4">
            <button
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all transform hover:scale-105"
                disabled={isTranslating}
            >
                <RefreshIcon className="w-5 h-5"/>
                Outro Arquivo
            </button>
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-2 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 transition-all transform hover:scale-105 shadow-lg shadow-teal-500/20 disabled:bg-gray-500 disabled:cursor-not-allowed"
                disabled={isTranslating}
            >
                <DownloadIcon className="w-5 h-5"/>
                {isTranslating ? 'Traduzindo...' : 'Baixar .srt'}
            </button>
        </div>
      </div>
      
      {/* Resume Banner for 'all' mode or interrupted sessions */}
      {isIncomplete && !isTranslating && translationMode === 'all' && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="text-center sm:text-left">
                <p className="text-yellow-200 font-semibold text-lg">Tradução Incompleta</p>
                <p className="text-yellow-400/80 text-sm">Faltam {untranslatedCount} blocos para traduzir.</p>
            </div>
            <button
                onClick={onResumeTranslation}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-700 transition-all transform hover:scale-105 shadow-lg"
            >
                <PlayIcon className="w-5 h-5"/>
                Continuar Tradução Restante
            </button>
        </div>
      )}
      
      {/* Next Chunk Banner for 'parts' mode */}
      {translationMode === 'parts' && hasMoreToTranslate && (
        <div className="bg-gray-800/50 p-4 rounded-lg text-center border border-white/10">
            <button
                onClick={onTranslateNextChunk}
                disabled={isTranslating}
                className="px-6 py-3 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isTranslating ? 'Traduzindo...' : `Traduzir os próximos ${Math.min(nextChunkSize, subtitles.length - translatedCount)} blocos`}
            </button>
            <p className="text-sm text-gray-400 mt-2">{translatedCount} de {subtitles.length} blocos traduzidos.</p>
        </div>
      )}

      <div className="w-full bg-gray-900/50 p-4 rounded-xl border border-white/10 max-h-[65vh] overflow-y-auto">
        <div className="sticky top-0 z-10 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/50 backdrop-blur-sm py-3 mb-3 border-b border-gray-600">
            <h3 className="text-lg font-semibold text-gray-400">Original</h3>
            <h3 className="text-lg font-semibold text-teal-300">Traduzido (PT-BR) - Editável</h3>
        </div>
        <div className="flex flex-col gap-3">
            {subtitles.map(block => (
                <SubtitleItem 
                    key={block.index} 
                    block={block} 
                    onTextChange={handleTextChange} 
                    onRetranslateBlock={onRetranslateBlock}
                    onReformatBlock={onReformatBlock}
                />
            ))}
        </div>
      </div>
    </div>
  );
};

export default SubtitleDisplay;
