import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, Modality, Blob, LiveServerMessage } from '@google/genai';
import { translateText } from '../services/geminiService';


const MicIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
    </svg>
);

const StopIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z"/>
    </svg>
);

const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>
);

const BackIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </svg>
);


// Helper functions for audio encoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

interface MicrophoneTranscriptionProps {
    onBack: () => void;
}

const MicrophoneTranscription: React.FC<MicrophoneTranscriptionProps> = ({ onBack }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sessionRef = useRef<LiveSession | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const fullTranscriptRef = useRef(''); // To handle async state updates

    const startRecording = async () => {
        setError(null);
        setTranscript('');
        setTranslatedText('');
        fullTranscriptRef.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        audioContextRef.current = context;
                        
                        const source = context.createMediaStreamSource(stream);
                        sourceRef.current = source;
                        
                        const processor = context.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = processor;
                        
                        processor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });

                             // Zero out the output buffer to prevent hearing the microphone input.
                            const outputBuffer = audioProcessingEvent.outputBuffer;
                            for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
                                outputBuffer.getChannelData(channel).fill(0);
                            }
                        };
                        
                        source.connect(processor);
                        processor.connect(context.destination);
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            fullTranscriptRef.current += text;
                            setTranscript(fullTranscriptRef.current);
                        }
                        // We must acknowledge the model's audio turn, even if we don't play it,
                        // to prevent the connection from stalling.
                        if (message.serverContent?.modelTurn?.parts[0]?.inlineData.data) {
                           // Silently consume audio data from the model
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live API Error:', e);
                        setError('Ocorreu um erro com a conexão de transcrição.');
                        stopRecording();
                    },
                    onclose: (e: CloseEvent) => {
                        // console.log('Live API connection closed.');
                    },
                },
                config: {
                    systemInstruction: "Your task is to act as a silent transcription service. You must transcribe the user's spoken audio into text in real-time. Do not generate any audio output or spoken response yourself. Only provide the text transcription.",
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                },
            });
            sessionRef.current = await sessionPromise;
            setIsRecording(true);

        } catch (err) {
            console.error('Falha ao iniciar a gravação:', err);
            setError('Não foi possível iniciar a gravação. Verifique as permissões do microfone e sua conexão com a internet.');
        }
    };
    
    const stopRecording = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().then(() => {
                audioContextRef.current = null;
            });
        }

        setIsRecording(false);
    }, []);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopRecording();
        };
    }, [stopRecording]);

    const handleTranslate = async () => {
        if (!transcript || isTranslating) return;
        setIsTranslating(true);
        setError(null);
        try {
            const translation = await translateText(transcript);
            setTranslatedText(translation);
        } catch (err) {
            setError('Falha ao traduzir o texto. Por favor, tente novamente.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="w-full max-w-4xl p-8 glass-effect rounded-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-300">Transcrição de Voz</h2>
                 <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all transform hover:scale-105">
                    <BackIcon className="w-5 h-5"/>
                    Voltar
                </button>
            </div>
            
            <div className="flex justify-center mb-6">
                {!isRecording ? (
                    <button onClick={startRecording} className="flex items-center gap-3 px-8 py-4 bg-teal-500 text-white font-bold rounded-full text-lg hover:bg-teal-600 transition-all transform hover:scale-105 shadow-lg shadow-teal-500/30">
                        <MicIcon className="w-6 h-6"/>
                        Começar a Gravar
                    </button>
                ) : (
                    <button onClick={stopRecording} className="flex items-center gap-3 px-8 py-4 bg-red-500 text-white font-bold rounded-full text-lg hover:bg-red-600 transition-all transform hover:scale-105 shadow-lg shadow-red-500/30 animate-pulse">
                        <StopIcon className="w-6 h-6"/>
                        Parar Gravação
                    </button>
                )}
            </div>

            {error && <p className="text-red-400 text-center mb-4">{error}</p>}
            
            <div className="grid md:grid-cols-2 gap-6">
                {/* Transcription Box */}
                <div className="flex flex-col glass-effect p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-300">Transcrição (Inglês)</h3>
                        <button onClick={() => handleCopy(transcript)} disabled={!transcript} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-50 transition-colors">
                            <CopyIcon className="w-4 h-4" />
                            Copiar
                        </button>
                    </div>
                    <div className="flex-grow p-4 bg-gray-900/50 border border-white/10 rounded-md min-h-[200px] whitespace-pre-wrap text-gray-200">
                        {isRecording && !transcript && <span className="text-gray-500 animate-pulse">Ouvindo...</span>}
                        {transcript || (!isRecording && <span className="text-gray-500">Aguardando áudio...</span>)}
                    </div>
                </div>

                {/* Translation Box */}
                <div className="flex flex-col glass-effect p-4 rounded-lg">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-teal-300">Tradução (PT-BR)</h3>
                        <button onClick={() => handleCopy(translatedText)} disabled={!translatedText} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-50 transition-colors">
                            <CopyIcon className="w-4 h-4" />
                            Copiar
                        </button>
                    </div>
                    <div className="flex-grow p-4 bg-gray-900/50 border border-white/10 rounded-md min-h-[200px] whitespace-pre-wrap text-teal-200">
                        {isTranslating 
                            ? <span className="text-gray-500 animate-pulse">Traduzindo...</span>
                            : translatedText || <span className="text-gray-500">Aguardando tradução...</span>
                        }
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-center">
                <button 
                    onClick={handleTranslate} 
                    disabled={isRecording || isTranslating || !transcript}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isTranslating ? 'Traduzindo...' : 'Traduzir Texto'}
                </button>
            </div>

        </div>
    );
};

export default MicrophoneTranscription;
