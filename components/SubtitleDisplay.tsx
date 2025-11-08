import React, { useCallback } from 'react';
import { SubtitleBlock, stringifySrt } from '../utils/srtParser';

interface SubtitleDisplayProps {
  subtitles: SubtitleBlock[];
  fileName: string;
  onReset: () => void;
  onSubtitleChange: (index: number, newText: string) => void;
  isTranslating: boolean;
  posterUrl: string | null;
  translationMode: 'all' | 'parts';
  onTranslateNextChunk: () => void;
  nextChunkSize: number;
  hasMoreToTranslate: boolean;
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

const SubtitleItem: React.FC<{
    block: SubtitleBlock;
    onTextChange: (index: number, newText: string) => void;
}> = React.memo(({ block, onTextChange }) => {
    
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onTextChange(block.index, e.target.value);
    };

    const originalLineCount = block.originalText.split('\n').length;
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/30 p-4 rounded-lg border border-white/10 min-h-[80px]">
            <div>
                <p className="font-mono text-sm text-gray-400">{block.timestamp}</p>
                <p className="mt-2 text-gray-300 whitespace-pre-wrap">{block.originalText}</p>
            </div>
            <div>
                 <textarea
                    value={block.translatedText || ''}
                    onChange={handleInputChange}
                    placeholder={!block.translatedText ? 'Ainda não traduzido...' : ''}
                    className={`w-full h-full p-2 bg-gray-800/70 border rounded-md text-teal-200 font-mono text-sm focus:ring-2 focus:outline-none resize-none transition-colors ${borderColorClass}`}
                    rows={Math.max(originalLineCount, translatedLines.length, 1)}
                />
                <div className="text-right text-xs mt-1 font-mono flex justify-end items-center gap-3">
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
    );
});

const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ 
    subtitles, fileName, onReset, onSubtitleChange, isTranslating, posterUrl, 
    translationMode, onTranslateNextChunk, nextChunkSize, hasMoreToTranslate 
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

  return (
    <div className="w-full flex flex-col gap-6 glass-effect p-6 rounded-2xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            {posterUrl && <img src={posterUrl} alt="Pôster do Filme" className="w-24 h-auto rounded-md object-cover shadow-lg border-2 border-gray-600" />}
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
            <h3 className="text-lg font-semibold text-gray-400">Original (Inglês)</h3>
            <h3 className="text-lg font-semibold text-teal-300">Traduzido (PT-BR) - Editável</h3>
        </div>
        <div className="flex flex-col gap-3">
            {subtitles.map(block => (
                <SubtitleItem key={block.index} block={block} onTextChange={handleTextChange} />
            ))}
        </div>
      </div>
    </div>
  );
};

export default SubtitleDisplay;
