import React, { useState, useCallback, useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
  hasSavedProgress: boolean;
  onContinue: () => void;
  fileEncoding: string;
  onEncodingChange: (encoding: string) => void;
}

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);


const ResumeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 0 1 7-7 7 7 0 0 1 7 7 7 7 0 0 1-7 7v2a9 9 0 0 0 9-9 9 9 0 0 0-9-9z"/>
        <path d="M12 8v5l4.25 2.52.75-1.23-3.5-2.07V8z"/>
    </svg>
);

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled, hasSavedProgress, onContinue, fileEncoding, onEncodingChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (e.dataTransfer.files[0].name.endsWith('.srt')) {
        onFileSelect(e.dataTransfer.files[0]);
      } else {
        alert('Por favor, envie um arquivo .srt válido');
      }
    }
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       if (e.target.files[0].name.endsWith('.srt')) {
        onFileSelect(e.target.files[0]);
      } else {
        alert('Por favor, envie um arquivo .srt válido');
      }
    }
  };

  const handleAreaClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const dropzoneClasses = `relative w-full p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-300 group ${
    isDragging 
      ? 'border-teal-400 bg-teal-500/10 scale-105 shadow-[0_0_30px_rgba(45,212,191,0.5)]' 
      : 'border-gray-600 hover:border-teal-400 hover:bg-gray-800/50'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;


  return (
    <div className="flex flex-col items-center justify-center p-8 w-full max-w-4xl glass-effect rounded-2xl animate-fade-in">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/noisy-grid.png')] opacity-5 z-0"></div>
        <div className="relative z-10 flex flex-col items-center w-full">
            <h2 className="text-4xl font-bold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-white to-teal-300">Traduza Suas Legendas</h2>
            <p className="text-lg text-gray-400 mb-8 text-center max-w-2xl">
                Arraste um arquivo <code className="bg-gray-700 text-teal-300 px-1.5 py-0.5 rounded">.srt</code> para traduzir instantaneamente com o poder da IA.
            </p>
            <div className="w-full max-w-2xl">
                <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={handleAreaClick}
                    onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleAreaClick(); } }}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label="Área de upload de arquivo. Clique ou arraste um arquivo .srt aqui."
                    className={dropzoneClasses}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".srt"
                        onChange={handleFileChange}
                        disabled={disabled}
                        tabIndex={-1}
                    />
                    <div className="flex flex-col items-center justify-center text-gray-400 transition-transform duration-300 group-hover:scale-110 pointer-events-none">
                        <UploadIcon className="w-16 h-16 mb-4 text-gray-500 group-hover:text-teal-400 transition-colors" />
                        <p className="text-xl font-semibold">
                        <span className="text-teal-400">Clique para enviar</span> ou arraste e solte
                        </p>
                        <p className="mt-2 text-sm text-gray-500">Apenas arquivos .SRT</p>
                    </div>
                </div>

                <div className="mt-6 text-center">
                  <label htmlFor="encoding-select" className="text-sm text-gray-400 mr-2 font-medium">Codificação do Arquivo:</label>
                  <select
                    id="encoding-select"
                    value={fileEncoding}
                    onChange={(e) => onEncodingChange(e.target.value)}
                    disabled={disabled}
                    className="bg-gray-700/80 text-white rounded px-3 py-1.5 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                    aria-label="Selecionar codificação do arquivo de legenda"
                  >
                    <option value="UTF-8">UTF-8 (Padrão)</option>
                    <option value="ISO-8859-1">ISO-8859-1 / Windows-1252 (Ocidental)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">Se vir caracteres estranhos como '�', tente a opção 'Ocidental'.</p>
                </div>

                {hasSavedProgress && (
                  <div className="mt-8 text-center">
                      <div className="relative">
                          <div className="absolute inset-0 flex items-center" aria-hidden="true">
                              <div className="w-full border-t border-gray-700" />
                          </div>
                          <div className="relative flex justify-center">
                              <span className="bg-gray-800/50 backdrop-blur-sm px-3 text-sm font-medium text-gray-400 rounded-full">OU</span>
                          </div>
                      </div>
                      <div className="mt-6 flex justify-center">
                          <button
                              onClick={onContinue}
                              className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition-transform transform shadow-lg shadow-sky-500/20 overflow-hidden"
                          >
                              <span className="absolute w-0 h-0 transition-all duration-300 ease-out bg-white rounded-full group-hover:w-32 group-hover:h-32 opacity-10"></span>
                              <ResumeIcon className="w-6 h-6"/>
                              Continuar Salvo
                          </button>
                      </div>
                  </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default FileUpload;