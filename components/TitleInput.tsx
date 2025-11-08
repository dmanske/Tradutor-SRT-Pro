import React, { useState } from 'react';
import { searchMovie, searchSong } from '../services/geminiService';
import type { Movie, Song, ContextObject, TranslationOptions } from '../App';

interface TitleInputProps {
  initialQuery: string;
  onStartTranslation: (options: TranslationOptions) => void;
}

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const MovieIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>
);

const MusicIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
);


const TitleInput: React.FC<TitleInputProps> = ({ initialQuery, onStartTranslation }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ContextObject[]>([]);
  const [contentType, setContentType] = useState<'movie' | 'music' | null>(null);
  const [searchState, setSearchState] = useState<'CHOOSING_TYPE' | 'SEARCHING' | 'NO_RESULTS' | 'RESULTS' | 'CONTEXT_SELECTED'>('CHOOSING_TYPE');
  const [error, setError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<ContextObject | null>(null);
  const [chunkSize, setChunkSize] = useState(100);

  const performSearch = async (currentQuery: string, type: 'movie' | 'music') => {
      setError(null);
      setSearchState('SEARCHING');
      try {
        const searchFn = type === 'movie' ? searchMovie : searchSong;
        const searchResults = await searchFn(currentQuery);

        if (searchResults.length > 0) {
          setResults(searchResults);
          setSelectedContext(searchResults[0]); 
          setSearchState('CONTEXT_SELECTED');
        } else {
          setSearchState('NO_RESULTS');
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ocorreu um erro desconhecido.');
        }
        setSearchState('NO_RESULTS');
      }
  };

  const handleContentTypeSelect = (type: 'movie' | 'music') => {
    setContentType(type);
    performSearch(initialQuery, type);
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentType) return;
    setSearchState('SEARCHING');
    try {
      const searchFn = contentType === 'movie' ? searchMovie : searchSong;
      const searchResults = await searchFn(query);

      if (searchResults.length === 0) {
        setResults([]);
        setSearchState('NO_RESULTS');
      } else {
        setResults(searchResults);
        setSearchState('RESULTS');
      }
    } catch(err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
      setSearchState('RESULTS');
    }
  };

  const handleContextSelect = (context: ContextObject) => {
    setSelectedContext(context);
    setSearchState('CONTEXT_SELECTED');
  };

  const handleStart = (mode: 'all' | 'parts') => {
    if (!selectedContext || !contentType) return;
    onStartTranslation({ context: selectedContext, contextType: contentType, mode, chunkSize });
  };
  
  const handleTranslateWithoutContext = () => {
    if (!contentType) return;
    const contextWithoutContext: Movie | Song = contentType === 'movie' 
      ? { title: initialQuery, year: '', description: '', posterUrl: '', director: '', genre: '' }
      : { title: initialQuery, artist: 'Desconhecido', album: '', year: '', genre: '', meaning: '', posterUrl: '' };
    handleContextSelect(contextWithoutContext);
  };

  const renderInitialChoice = () => (
    <div className="text-center animate-fade-in">
        <h3 className="text-2xl font-bold mb-6 text-gray-200">Qual é o tipo de conteúdo?</h3>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
                onClick={() => handleContentTypeSelect('movie')}
                className="flex-1 flex flex-col items-center gap-3 p-6 bg-gray-800/50 border-2 border-transparent hover:border-teal-500 rounded-lg transition-all transform hover:scale-105"
            >
                <MovieIcon className="w-12 h-12 text-teal-400" />
                <span className="text-xl font-semibold">Filme / Série</span>
            </button>
            <button
                onClick={() => handleContentTypeSelect('music')}
                className="flex-1 flex flex-col items-center gap-3 p-6 bg-gray-800/50 border-2 border-transparent hover:border-purple-500 rounded-lg transition-all transform hover:scale-105"
            >
                <MusicIcon className="w-12 h-12 text-purple-400" />
                <span className="text-xl font-semibold">Música</span>
            </button>
        </div>
    </div>
  )

  const renderLoading = () => (
     <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
        <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-teal-400"></div>
        <p className="text-gray-300 mt-4 text-lg">Buscando contexto para <span className="font-bold text-teal-300">"{initialQuery}"</span>...</p>
    </div>
  );

  const renderNoResults = () => (
    <div className="text-center p-6 bg-gray-900/30 border border-yellow-500/30 rounded-lg animate-fade-in">
        <p className="text-yellow-300 font-semibold text-xl">Contexto não encontrado</p>
        <p className="text-yellow-400/80 text-md mt-2">Não foi possível encontrar um(a) {contentType === 'movie' ? 'filme ou série' : 'música'} para "{initialQuery}".</p>
        {error && <p className="text-red-400 mt-2">{error}</p>}
        <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button 
              onClick={handleTranslateWithoutContext} 
              className="px-5 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors w-full sm:w-auto"
            >
                Traduzir sem Contexto
            </button>
            <button 
              onClick={() => { setQuery(initialQuery); setSearchState('RESULTS'); }}
              className="px-5 py-3 bg-yellow-600 text-white font-bold rounded-lg hover:bg-yellow-700 transition-colors w-full sm:w-auto"
            >
                Buscar Manualmente
            </button>
        </div>
    </div>
  );

  const renderManualSearch = () => (
     <div className="w-full animate-fade-in">
        <h3 className="text-xl font-semibold mb-4 text-center text-gray-300">Buscar contexto manualmente</h3>
        <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-grow w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:outline-none transition"
                placeholder={contentType === 'movie' ? 'ex: The Matrix' : 'ex: Queen Bohemian Rhapsody'}
            />
            <button
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 transition-all transform hover:scale-105 shadow-lg shadow-teal-500/20"
            >
                <SearchIcon className="w-5 h-5" />
                Buscar
            </button>
        </form>

        {results.length > 0 ? (
          <div className="space-y-3 mt-4 max-h-[50vh] overflow-y-auto pr-2">
            <h4 className="text-lg font-semibold text-gray-300">Resultados da busca:</h4>
            {results.map((item, index) => (
              <button key={index} onClick={() => handleContextSelect(item)} className="w-full flex items-start gap-4 p-3 bg-gray-800/50 hover:bg-teal-900/30 rounded-lg text-left transition-all duration-300 border border-white/10 hover:border-teal-500 transform hover:scale-[1.02]">
                <img src={item.posterUrl} alt={item.title} className="w-20 h-auto object-cover rounded-md flex-shrink-0 bg-gray-600" />
                <div>
                  <h4 className="font-bold text-teal-300">
                    {'artist' in item ? `${item.artist} - ${item.title}` : item.title} 
                    <span className="text-gray-400 font-normal"> ({item.year})</span>
                  </h4>
                  <p className="text-sm text-gray-400 mt-2 line-clamp-3">{'description' in item ? item.description : ('meaning' in item ? item.meaning : '')}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
            <p className="text-center text-gray-400 mt-4">Nenhum resultado para "{query}"</p>
        )}
     </div>
  );

  const renderContextSelected = () => (
    <div className="animate-fade-in">
        <div className="p-4 bg-gray-900/30 border border-white/10 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-teal-300">Contexto Encontrado</h3>
            {selectedContext && (
                <div className="flex flex-col sm:flex-row items-start gap-4 text-left">
                    {selectedContext.posterUrl && <img src={selectedContext.posterUrl} alt={selectedContext.title} className="w-24 h-auto object-cover rounded-md flex-shrink-0 bg-gray-600 border-2 border-gray-700" />}
                    <div className="flex-grow">
                        <h4 className="font-bold text-lg text-white">
                            {'artist' in selectedContext ? `${selectedContext.artist} - ${selectedContext.title}` : selectedContext.title} 
                            <span className="text-gray-400 font-normal"> ({selectedContext.year})</span>
                        </h4>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-3">
                            {'description' in selectedContext ? selectedContext.description : ('meaning' in selectedContext ? selectedContext.meaning : 'Nenhuma sinopse fornecida.')}
                        </p>
                    </div>
                </div>
            )}
             <div className="flex flex-wrap gap-4 mt-4">
                <button onClick={() => { setQuery(initialQuery); setResults([]); setSearchState('RESULTS'); }} className="text-sm text-gray-400 hover:text-white transition-colors">
                    &larr; Usar um contexto diferente
                </button>
                 <button onClick={handleTranslateWithoutContext} className="text-sm text-gray-400 hover:text-white transition-colors">
                    &rarr; Traduzir sem contexto
                </button>
            </div>
        </div>
        
        <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4 text-center text-gray-300">Escolha o modo de tradução</h3>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
                 <div className="flex-1 p-4 border border-white/10 rounded-lg bg-gray-900/30">
                    <h4 className="font-bold text-lg">Tradução Completa</h4>
                    <p className="text-sm text-gray-400 my-2 h-12">A IA traduzirá o arquivo inteiro de uma vez. Rápido e fácil.</p>
                    <button onClick={() => handleStart('all')} className="w-full px-4 py-2 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 transition-all transform hover:scale-105">
                        Iniciar Tradução Completa
                    </button>
                </div>
                <div className="flex-1 p-4 border border-white/10 rounded-lg bg-gray-900/30">
                    <h4 className="font-bold text-lg">Tradução por Partes</h4>
                    <p className="text-sm text-gray-400 my-2 h-12">Traduza em blocos para maior controle e para arquivos grandes.</p>
                    <button onClick={() => handleStart('parts')} className="w-full px-4 py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition-all transform hover:scale-105">
                        Iniciar por Partes
                    </button>
                </div>
            </div>
        </div>
    </div>
  );

  const renderContent = () => {
    switch (searchState) {
        case 'CHOOSING_TYPE': return renderInitialChoice();
        case 'SEARCHING': return renderLoading();
        case 'NO_RESULTS': return renderNoResults();
        case 'RESULTS': return renderManualSearch();
        case 'CONTEXT_SELECTED': return renderContextSelected();
        default: return null;
    }
  }

  return (
    <div className="w-full p-6 glass-effect rounded-2xl">
        {renderContent()}
    </div>
  );
};

export default TitleInput;