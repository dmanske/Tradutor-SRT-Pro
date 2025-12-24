
import React, { useState } from 'react';
import { searchMovie, searchSong } from '../services/geminiService';
import type { Movie, Song, ContextObject, TranslationOptions } from '../App';

interface TitleInputProps {
  initialQuery: string;
  onStartTranslation: (options: TranslationOptions) => void;
  sourceLanguage: 'en' | 'es';
}

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const ExternalLinkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

const TitleInput: React.FC<TitleInputProps> = ({ initialQuery, onStartTranslation, sourceLanguage }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ContextObject[]>([]);
  const [sources, setSources] = useState<{uri: string, title: string}[]>([]);
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
        const { results: searchResults, sources: searchSources } = await searchFn(currentQuery);

        setSources(searchSources);
        if (searchResults.length > 0) {
          setResults(searchResults);
          setSearchState('RESULTS');
        } else {
          setSearchState('NO_RESULTS');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar contexto.');
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
    performSearch(query, contentType);
  };

  const handleContextSelect = (context: ContextObject) => {
    setSelectedContext(context);
    setSearchState('CONTEXT_SELECTED');
  };

  const handleStart = (mode: 'all' | 'parts') => {
    if (!selectedContext || !contentType) return;
    onStartTranslation({ context: selectedContext, contextType: contentType, mode, chunkSize, sourceLanguage });
  };

  return (
    <div className="w-full p-6 glass-effect rounded-2xl">
        {searchState === 'CHOOSING_TYPE' && (
            <div className="text-center">
                <h3 className="text-2xl font-bold mb-6 text-gray-200">Qual o conteúdo da legenda?</h3>
                <div className="flex gap-4">
                    <button onClick={() => handleContentTypeSelect('movie')} className="flex-1 p-8 bg-gray-800/50 hover:bg-teal-500/20 border-2 border-transparent hover:border-teal-500 rounded-xl transition-all">
                        <span className="text-4xl block mb-2">🎬</span>
                        <span className="text-xl font-bold">Filme / Série</span>
                    </button>
                    <button onClick={() => handleContentTypeSelect('music')} className="flex-1 p-8 bg-gray-800/50 hover:bg-purple-500/20 border-2 border-transparent hover:border-purple-500 rounded-xl transition-all">
                        <span className="text-4xl block mb-2">🎵</span>
                        <span className="text-xl font-bold">Música / Clipe</span>
                    </button>
                </div>
            </div>
        )}

        {searchState === 'SEARCHING' && (
            <div className="text-center py-10">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-xl font-medium">Navegando no IMDb/TMDb...</p>
            </div>
        )}

        {(searchState === 'RESULTS' || searchState === 'NO_RESULTS') && (
            <div className="space-y-6">
                <form onSubmit={handleManualSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-grow p-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                        placeholder="Buscar outro título..."
                    />
                    <button type="submit" className="px-6 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 transition-colors">
                        Buscar
                    </button>
                </form>

                {results.length > 0 ? (
                    <div className="grid gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {results.map((item, idx) => (
                            <div key={idx} className="p-4 bg-gray-800/50 border border-white/10 rounded-xl hover:border-teal-500 transition-all group">
                                <h4 className="text-lg font-bold text-teal-300">
                                    {'artist' in item ? `${item.artist} - ${item.title}` : item.title} ({item.year})
                                </h4>
                                <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                                    {'description' in item ? item.description : item.meaning}
                                </p>
                                <button onClick={() => handleContextSelect(item)} className="mt-3 w-full py-2 bg-teal-500/10 text-teal-400 font-bold rounded-lg border border-teal-500/20 group-hover:bg-teal-500 group-hover:text-white transition-all">
                                    Selecionar este contexto
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-yellow-400">Nenhum resultado exato encontrado. Tente buscar pelo nome original.</p>
                )}

                {sources.length > 0 && (
                    <div className="pt-4 border-t border-white/5">
                        <p className="text-xs text-gray-500 mb-2 uppercase font-bold">Fontes da busca:</p>
                        <div className="flex flex-wrap gap-2">
                            {sources.map((s, i) => (
                                <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-teal-500/70 hover:text-teal-400 bg-teal-500/5 px-2 py-1 rounded border border-teal-500/10">
                                    <ExternalLinkIcon className="w-3 h-3"/> {s.title}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {searchState === 'CONTEXT_SELECTED' && selectedContext && (
            <div className="space-y-6 text-center">
                <div className="p-6 bg-teal-500/10 border border-teal-500/30 rounded-2xl">
                    <span className="text-xs font-bold text-teal-500 uppercase">Contexto Verificado</span>
                    <h3 className="text-2xl font-bold text-white mt-1">
                        {'artist' in selectedContext ? `${selectedContext.artist} - ${selectedContext.title}` : selectedContext.title}
                    </h3>
                    <p className="text-gray-400 mt-2 text-sm italic">
                        "O tradutor usará estas informações para garantir gírias, termos e tom adequados ao gênero."
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => handleStart('all')} className="p-6 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-teal-500/20">
                        <span className="block text-2xl mb-1">🚀</span>
                        Tradução Completa
                        <span className="block text-xs font-normal opacity-70 mt-1">Ideal para legendas padrão</span>
                    </button>
                    <button onClick={() => handleStart('parts')} className="p-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20">
                        <span className="block text-2xl mb-1">🧩</span>
                        Tradução em Blocos
                        <span className="block text-xs font-normal opacity-70 mt-1">Controle total e correção em tempo real</span>
                    </button>
                </div>
                
                <button onClick={() => setSearchState('RESULTS')} className="text-sm text-gray-500 hover:text-gray-300">
                    ← Voltar para a navegação
                </button>
            </div>
        )}
    </div>
  );
};

export default TitleInput;
