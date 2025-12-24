
import React, { useState, useEffect, useRef } from 'react';

interface LoaderProps {
  contextTitle?: string;
  progress: {
    current: number;
    total: number;
  };
  isFallback?: boolean;
  onStop?: () => void;
}

const StopIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z"/>
    </svg>
);

const Loader: React.FC<LoaderProps> = ({ contextTitle, progress, isFallback, onStop }) => {
  const [eta, setEta] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const { current, total } = progress;

  useEffect(() => {
    // Define a hora de início quando a tradução começa
    if (total > 0 && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }

    // Calcula o ETA após alguns blocos para maior precisão
    if (current > 5 && total > 0 && startTimeRef.current) { 
      const elapsedTime = Date.now() - startTimeRef.current; // em ms
      const avgTimePerBlock = elapsedTime / current;
      const remainingBlocks = total - current;
      const remainingTime = remainingBlocks * avgTimePerBlock; // em ms

      if (remainingTime > 1000) {
        const totalSeconds = Math.round(remainingTime / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setEta(`~${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} restantes`);
      } else {
        setEta(null);
      }
    }
    
    // Limpa quando o processo termina ou é reiniciado
    if (current === total && total > 0) {
        setEta("Finalizando...");
        setTimeout(() => {
          startTimeRef.current = null;
          setEta(null);
        }, 3000);
    }
    
    if (total === 0) {
        startTimeRef.current = null;
        setEta(null);
    }

  }, [current, total]);

  const percentage = total > 0 
    ? Math.round((current / total) * 100)
    : 0;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center glass-effect rounded-2xl w-full max-w-3xl pulsing-glow relative">
        <div className="flex flex-col items-center text-center w-full max-w-md">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-teal-400"></div>
            <h2 className="text-2xl font-semibold mt-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-300">Traduzindo Legendas...</h2>
            <p className="text-gray-400 mt-2">
                {contextTitle 
                ? `A IA está usando "${contextTitle}" como contexto.`
                : 'A IA está analisando o contexto.'
                }
            </p>
            
            {progress.current === 0 && progress.total > 0 && !isFallback && (
                <p className="text-yellow-300 mt-4 text-sm font-semibold animate-pulse">
                    Preparando a tradução... Isso pode levar alguns segundos.
                </p>
            )}

            {isFallback && (
                <p className="text-yellow-300 mt-4 text-sm font-semibold animate-pulse">
                    O modelo principal está ocupado. Tentando com um modelo alternativo...
                </p>
            )}

            <div className="w-full mt-6">
                {progress.total > 0 ? (
                    <>
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm font-medium text-teal-300">Progresso</span>
                            <span className="text-sm font-bold text-white">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden border border-white/10">
                            <div 
                                className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(45,212,191,0.8)]" 
                                style={{ width: `${percentage}%` }}>
                            </div>
                        </div>
                        <div className="flex justify-between items-baseline mt-1">
                            <span className="font-mono text-xs text-gray-400">{`${current} / ${total} blocos`}</span>
                            {eta && <span className="font-mono text-xs text-gray-400">{eta}</span>}
                        </div>
                    </>
                ) : (
                    <p className="font-mono text-teal-300 mt-4">Iniciando tradução...</p>
                )}
            </div>
            
            {onStop && (
                <button 
                    onClick={onStop}
                    className="mt-6 flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/50 rounded-lg hover:bg-red-500/40 transition-colors text-sm font-semibold"
                >
                    <StopIcon className="w-4 h-4" />
                    Pausar / Parar Agora
                </button>
            )}
        </div>
    </div>
  );
};

export default Loader;
