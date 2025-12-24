
import React from 'react';

const MovieIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
  </svg>
);

const InfoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
     <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
  </svg>
);

interface HeaderProps {
  onShowHowItWorks?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShowHowItWorks }) => {
  return (
    <header className="sticky top-0 z-50 bg-gray-900/50 backdrop-blur-lg border-b border-white/10 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.7)]">
                <MovieIcon className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>
              Tradutor SRT <span className="text-teal-400">Pro</span>
            </h1>
        </div>
        
        {onShowHowItWorks && (
            <button 
                onClick={onShowHowItWorks}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-teal-300 rounded-lg transition-colors text-sm font-semibold border border-white/5"
                title="Como funciona?"
            >
                <InfoIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Como Funciona</span>
            </button>
        )}
      </div>
    </header>
  );
};

export default Header;
