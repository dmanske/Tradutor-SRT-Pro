import React from 'react';

const TranslateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
  </svg>
);

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-gray-900/50 backdrop-blur-lg border-b border-white/10 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <div className="text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.7)]">
            <TranslateIcon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>
          Tradutor SRT <span className="text-teal-400">Pro</span>
        </h1>
      </div>
    </header>
  );
};

export default Header;
