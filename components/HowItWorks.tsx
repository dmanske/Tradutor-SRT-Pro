
import React, { useState } from 'react';

interface HowItWorksProps {
  onClose: () => void;
}

const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-xl font-bold text-teal-300 mt-8 mb-4 border-b border-teal-500/30 pb-2">{children}</h3>
);

const ExampleBox: React.FC<{ label: string; items: string[]; type: 'bad' | 'good' | 'neutral' }> = ({ label, items, type }) => {
    let bgClass = "bg-gray-800";
    let textClass = "text-gray-300";
    
    if (type === 'bad') {
        bgClass = "bg-red-900/20 border-red-500/30";
        textClass = "text-red-200";
    } else if (type === 'good') {
        bgClass = "bg-teal-900/20 border-teal-500/30";
        textClass = "text-teal-200";
    }

    return (
        <div className={`p-4 rounded-lg border ${bgClass}`}>
            <p className="text-xs font-bold uppercase mb-2 opacity-70">{label}</p>
            <ul className="space-y-1 font-mono text-sm">
                {items.map((item, i) => (
                    <li key={i} className={textClass}>{item}</li>
                ))}
            </ul>
        </div>
    );
};

const HowItWorks: React.FC<HowItWorksProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'technical'>('general');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-gray-900 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-teal-500/30 shadow-2xl relative flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-white/10 p-6 flex justify-between items-center shrink-0">
            <div>
                 <h2 className="text-2xl font-bold text-white mb-2">Como Funciona a Tradução</h2>
                 <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg inline-flex">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Guia Rápido
                    </button>
                    <button 
                         onClick={() => setActiveTab('technical')}
                         className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'technical' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Visão Técnica
                    </button>
                 </div>
            </div>
            <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
            >
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>

        {/* Content Container */}
        <div className="flex-grow overflow-y-auto p-6 md:p-10 space-y-6 text-gray-300 leading-relaxed custom-scrollbar">
            
            {activeTab === 'general' && (
                <div className="animate-fade-in">
                    <p className="text-lg text-gray-300">
                        Nosso aplicativo traduz legendas para <strong className="text-white">Português Brasileiro (PT-BR)</strong> seguindo padrões profissionais de TV e streaming. 
                        O objetivo é entregar legendas limpas, naturais e fiéis.
                    </p>

                    <div className="flex gap-4 mb-8">
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 flex-1">
                            <span className="text-2xl mr-2">🎬</span> <strong>Modo Filme/Série</strong>
                            <p className="text-sm text-gray-400 mt-1">Foco em narrativa, diálogos e remoção de ruídos visuais.</p>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 flex-1">
                            <span className="text-2xl mr-2">🎵</span> <strong>Modo Música</strong>
                            <p className="text-sm text-gray-400 mt-1">Foco em ritmo, emoção e regras específicas para letras.</p>
                        </div>
                    </div>

                    <SectionTitle>1. O que o App Considera Diálogo</SectionTitle>
                    <p>
                        Somente falas reais dos personagens ou letras cantadas são consideradas conteúdo traduzível.
                        Tudo que descreve sons, ambientes, ações, música de fundo ou acessibilidade <strong>NÃO</strong> é diálogo e é removido.
                    </p>

                    <SectionTitle>2. Remoção Automática de Closed Captions (CC)</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ExampleBox 
                            type="bad" 
                            label="O que é removido (Exemplos)" 
                            items={[
                                "(AUDIENCE CHEERING)", "(PLATEIA APLAUDINDO)",
                                "(LAUGHING), (CRYING)", "(SIGHS), (FOOTSTEPS)",
                                "(SILENCE), (NO DIALOGUE)", "(THUNDER), (RAIN FALLING)"
                            ]} 
                        />
                        <div className="flex items-center p-4 text-gray-400 italic bg-gray-800/30 rounded-lg">
                            "Esses elementos NÃO são traduzidos e NÃO aparecem no resultado final."
                        </div>
                    </div>

                    <SectionTitle>3. Regra da Música (Filmes e Séries)</SectionTitle>
                    <p>Música de fundo ou instrumental é sempre removida. Só traduzimos se houver letra narrativa.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <ExampleBox type="bad" label="Removido" items={["(MUSIC)", "(THEME MUSIC)", "(BACKGROUND MUSIC)"]} />
                        <ExampleBox type="good" label="Mantido (Exemplo)" items={["🎶 O sol brilha no céu... 🎶 (Se cantado)"]} />
                    </div>

                    <SectionTitle>4. Identificação de Falante</SectionTitle>
                    <p>O app remove rótulos de quem está falando. A legenda final mostra apenas a fala.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <ExampleBox type="bad" label="Original" items={["CHARLIE: Hello.", "WOMAN: Watch out!", "MAN 1: Hey."]} />
                        <ExampleBox type="good" label="Resultado" items={["- Olá.", "- Cuidado!", "- Ei."]} />
                    </div>

                    <SectionTitle>5. Limpeza de Fala</SectionTitle>
                    <p>Muletas de fala e sons vocais sem significado são removidos para uma leitura mais fluida.</p>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                        <li><strong>Muletas:</strong> <em>uh, um, ah, hmm</em> (Removidos se não alterarem o sentido).</li>
                        <li><strong>Sons:</strong> <em>Oh, Ha ha, Mm</em> (Removidos se isolados).</li>
                    </ul>

                    <SectionTitle>6. Estilo de Tradução</SectionTitle>
                    <p>A tradução <strong>NÃO</strong> é palavra por palavra.</p>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                        <li>Traduzimos o <strong>sentido e a intenção</strong>.</li>
                        <li>Usamos <strong>PT-BR falado e natural</strong>.</li>
                        <li>Adaptamos gírias e expressões culturais.</li>
                        <li>Priorizamos leitura rápida e clara (Legenda não é transcrição, é compreensão).</li>
                    </ul>

                    <SectionTitle>7. Padrão Técnico (TV)</SectionTitle>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Máximo de <strong>2 linhas</strong> por legenda.</li>
                        <li>Máximo de <strong>42 caracteres</strong> por linha.</li>
                        <li>Quebras inteligentes (evitamos terminar linhas com "de", "da", "que").</li>
                    </ul>

                    <div className="mt-8 border border-purple-500/30 bg-purple-900/10 p-6 rounded-xl">
                        <h3 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                            <span className="text-3xl">🎵</span> Regras Especiais: Modo Música
                        </h3>
                        <p className="mb-4">No Modo Música, a prioridade é o <strong>ritmo e a emoção</strong>, não a tradução literal.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold text-white mb-2">O que é TRADUZIDO</h4>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                                    <li>Apenas a letra cantada.</li>
                                    <li>Refrões e versos principais.</li>
                                    <li>Frases com carga emocional.</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-2">O que é REMOVIDO</h4>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                                    <li>Backing vocals sem significado.</li>
                                    <li>Interjeições vazias (yeah, oh, uh) repetitivas.</li>
                                    <li>Instrumentais.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div>
                                <strong className="text-purple-200">Refrão Consistente:</strong>
                                <p className="text-sm text-gray-400">O refrão é sempre traduzido da MESMA forma em todas as repetições.</p>
                            </div>
                            <div>
                                <strong className="text-purple-200">Ritmo e Sincronia:</strong>
                                <p className="text-sm text-gray-400">Preferência por 1 linha. A legenda entra e sai junto com o verso.</p>
                            </div>
                            <div>
                                <strong className="text-purple-200">Repetições:</strong>
                                <p className="text-sm text-gray-400">Repetições longas ("Yeah yeah yeah yeah...") são condensadas ou removidas.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'technical' && (
                 <div className="animate-fade-in font-mono text-sm space-y-8">
                    <div className="border-l-4 border-purple-500 pl-4 py-2 bg-gray-800/30">
                        <h3 className="text-lg font-bold text-purple-300">PIPELINE DE PROCESSAMENTO DE LEGENDAS</h3>
                        <p className="text-gray-400">Documentação Técnica v1.0</p>
                    </div>

                    <p>
                        Nosso aplicativo realiza tradução e normalização de legendas seguindo padrões profissionais de legendagem audiovisual utilizados em TV, streaming e distribuição digital.
                        O sistema não executa transcrição literal. Ele atua como um pipeline de limpeza, adaptação linguística e formatação para leitura otimizada.
                    </p>

                    <div>
                        <SectionTitle>1. Classificação de Conteúdo</SectionTitle>
                        <p>O app separa o texto da legenda em duas categorias distintas:</p>
                        <ul className="list-decimal pl-5 mt-2 space-y-1 text-gray-400">
                            <li>Diálogo / Letra cantada</li>
                            <li>Closed Captions (CC) e metadados de acessibilidade</li>
                        </ul>
                        <p className="mt-2 text-teal-300">Somente o conteúdo classificado como DIÁLOGO é elegível para tradução. Todo CC é descartado antes ou durante o processo, nunca traduzido.</p>
                    </div>

                    <div>
                        <SectionTitle>2. Closed Caption Stripping (CC Removal)</SectionTitle>
                        <p>O sistema remove sistematicamente:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                             <div className="bg-gray-800 p-3 rounded border border-gray-700">
                                <strong className="text-gray-300 block mb-1">Descrições de Som/Ambiente</strong>
                                <code className="text-red-400 block">(AUDIENCE CHEERING), (APPLAUSE), (DOOR SLAMS)</code>
                             </div>
                             <div className="bg-gray-800 p-3 rounded border border-gray-700">
                                <strong className="text-gray-300 block mb-1">Indicações Editoriais</strong>
                                <code className="text-red-400 block">(SILENCE), (NO DIALOGUE), (UNINTELLIGIBLE)</code>
                             </div>
                             <div className="bg-gray-800 p-3 rounded border border-gray-700">
                                <strong className="text-gray-300 block mb-1">Descrições Emocionais</strong>
                                <code className="text-red-400 block">(LAUGHING), (CRYING), (SIGHS), (PANTING)</code>
                             </div>
                             <div className="bg-gray-800 p-3 rounded border border-gray-700">
                                <strong className="text-gray-300 block mb-1">Speaker Labels / Origem</strong>
                                <code className="text-red-400 block">CHARLIE:, WOMAN:, ALL:, (O.S.), (V.O.)</code>
                             </div>
                        </div>
                        <p className="mt-2 italic text-gray-500">Se CC estiver misturado ao diálogo, apenas o trecho de CC é removido, preservando a fala.</p>
                    </div>

                    <div>
                        <SectionTitle>3. Tratamento de Música</SectionTitle>
                        <p>Música é tratada como conteúdo não verbal.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                            <li>Cues de música instrumental são removidos</li>
                            <li>Música de fundo não é legendada</li>
                            <li className="text-teal-400">Exceção: Letras cantadas audíveis e semanticamente relevantes são tratadas como diálogo e traduzidas.</li>
                        </ul>
                    </div>

                    <div>
                        <SectionTitle>4. Normalização de Fala (Disfluency Filtering)</SectionTitle>
                        <p>O app aplica filtragem de disfluências, removendo elementos típicos de fala espontânea que não agregam significado:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                            <li>filled pauses (uh, um, er, ah)</li>
                            <li>hesitações não narrativas</li>
                            <li>repetições vazias</li>
                        </ul>
                        <p className="mt-2 text-xs text-gray-500">Esses elementos só são mantidos se tiverem função dramática, cômica ou estilística.</p>
                    </div>

                    <div>
                        <SectionTitle>5. Vocalizações e Ad-Libs</SectionTitle>
                        <p>Vocalizações não semânticas são descartadas quando aparecem isoladamente:</p>
                        <code className="block bg-black/30 p-2 mt-1 rounded text-gray-400">Oh, ah, hmm, mm, ha ha, yeah, uh, come on</code>
                        <p className="mt-2"><strong>No Modo Música:</strong> Ad-libs são avaliados semanticamente. Mantidos apenas se fizerem parte da identidade artística da faixa.</p>
                    </div>

                    <div>
                        <SectionTitle>6. Tradução (Semântica, não Literal)</SectionTitle>
                        <p>A tradução segue princípios de legendagem profissional:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                            <li>Prioridade para sentido e intenção</li>
                            <li>Português brasileiro falado</li>
                            <li>Redução de redundância</li>
                            <li>Adaptação cultural de gírias e idiomatismos</li>
                            <li>Simplificação de estruturas longas</li>
                        </ul>
                        <p className="mt-2 font-bold text-white">O objetivo é equivalência funcional, não correspondência lexical.</p>
                    </div>

                    <div>
                        <SectionTitle>7. Formatação e Quebra de Linha</SectionTitle>
                        <p>O sistema aplica quebra determinística de linhas, independente do modelo de tradução.</p>
                        <div className="bg-gray-800/50 p-4 rounded mt-2 border border-gray-700">
                            <h4 className="font-bold text-teal-300 mb-2">Parâmetros Rígidos:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Máximo de <strong>2 linhas</strong> por legenda</li>
                                <li>Ideal: até <strong>35 caracteres</strong> por linha</li>
                                <li>Máximo absoluto: <strong>42 caracteres</strong></li>
                            </ul>
                        </div>
                        <p className="mt-2 text-sm">Regras: Quebra por unidade semântica, proibição de quebra após palavras fracas (viúvas), balanceamento visual entre linhas.</p>
                    </div>

                    <div>
                        <SectionTitle>8. Sincronia e Densidade de Leitura</SectionTitle>
                        <p>Especialmente em Modo Música:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                            <li>Legendas priorizam sincronismo com o verso</li>
                            <li>Repetições podem ser condensadas</li>
                            <li>Versos rápidos podem ser semanticamente reduzidos</li>
                        </ul>
                        <p className="mt-2 text-teal-300">A métrica prioriza legibilidade e timing, não completude textual.</p>
                    </div>

                    <div>
                        <SectionTitle>9. Modos Operacionais</SectionTitle>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                             <div className="bg-gray-800 p-3 rounded border border-gray-700">
                                <strong className="text-white block mb-1">Modo Filme / Série</strong>
                                <ul className="list-disc pl-5 text-xs text-gray-400">
                                    <li>Tradução completa de diálogo</li>
                                    <li>Remoção agressiva de CC</li>
                                    <li>Quebra padrão TV</li>
                                </ul>
                             </div>
                             <div className="bg-gray-800 p-3 rounded border border-gray-700">
                                <strong className="text-white block mb-1">Modo Música / Clipe</strong>
                                <ul className="list-disc pl-5 text-xs text-gray-400">
                                    <li>Tradução seletiva de letra cantada</li>
                                    <li>Filtragem de ad-libs e vocalizações</li>
                                    <li>Menor densidade textual</li>
                                    <li>Ritmo e emoção como prioridade</li>
                                </ul>
                             </div>
                        </div>
                    </div>

                    <div>
                        <SectionTitle>10. Resultado Final</SectionTitle>
                        <p>O output final é um SRT estruturalmente íntegro, sem CC ou ruído de acessibilidade, linguisticamente natural em PT-BR, otimizado para leitura em tela e compatível com padrões profissionais.</p>
                    </div>
                 </div>
            )}

        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-gray-900/95 text-center shrink-0">
            <button 
                onClick={onClose}
                className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition-transform transform hover:scale-105 shadow-lg"
            >
                Entendi, vamos começar!
            </button>
        </div>

      </div>
    </div>
  );
};

export default HowItWorks;
