
import { GoogleGenAI, Type } from "@google/genai";
import { Movie, Song, ContextObject } from "../App";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export type StreamEvent = { type: 'data'; content: string } | { type: 'status'; message: string };

/**
 * Utilitário de retry para lidar com limites de cota (429)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        const isQuotaError = error.message?.includes('429') || error.status === 429;
        if (retries > 0 && isQuotaError) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

const MOVIE_PROMPT_TEMPLATE = `
Atue como Tradutor Audiovisual Profissional (EN->PT-BR). 
Traduza o conteúdo SRT abaixo mantendo RIGOROSAMENTE os índices e timestamps.

CONTEXTO DO FILME:
- Título: {movieTitle}
- Gênero: {movieGenre}
- Sinopse: {movieDescription}

REGRAS DE OURO:
1. REMOVA CC: Ignore sons como (GASPS), [MUSIC PLAYING], MAN:, etc.
2. PT-BR NATURAL: Use linguagem coloquial brasileira fluida.
3. LIMITE: Máximo 2 linhas, 42 caracteres por linha.
4. NÃO pule blocos. Traduza TODOS os blocos fornecidos.

CONTEÚDO SRT:
{srtContent}
`;

const MUSIC_PROMPT_TEMPLATE = `
Traduza a letra desta música para PT-BR natural. 
Mantenha os índices e timestamps do SRT.

MÚSICA: {songTitle} - {artist}

REGRAS:
1. FOCO NO RITMO: Tradução poética e emocional.
2. REMOVA AD-LIBS: Ignore (yeah), (oh), etc se vazios.
3. NÃO pule blocos.

CONTEÚDO SRT:
{srtContent}
`;

export async function translateSrtBatch(
    srtContent: string, 
    context: ContextObject, 
    contextType: 'movie' | 'music', 
    sourceLanguage: 'en' | 'es'
): Promise<string> {
    const ai = getAiClient();
    const sourceLanguageName = sourceLanguage === 'en' ? 'inglês' : 'espanhol';
    let prompt = '';

    if (contextType === 'music' && 'artist' in context) {
        const songContext = context as Song;
        prompt = MUSIC_PROMPT_TEMPLATE
            .replace('{songTitle}', songContext.title)
            .replace('{artist}', songContext.artist)
            .replace('{srtContent}', srtContent);
    } else {
        const movieContext = context as Movie;
        prompt = MOVIE_PROMPT_TEMPLATE
            .replace('{movieTitle}', movieContext.title)
            .replace('{movieGenre}', movieContext.genre)
            .replace('{movieDescription}', movieContext.description)
            .replace('{srtContent}', srtContent);
    }

    return await withRetry(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                temperature: 0.3, // Menor temperatura para maior consistência estrutural
            }
        });
        return response.text.replace(/```srt\n|```/g, '').trim();
    });
}

export async function searchMovie(query: string): Promise<{results: Movie[], sources: {uri: string, title: string}[]}> {
  const ai = getAiClient();
  const prompt = `Search movie/TV details for: "${query}". Return JSON array with title, year, description, director, genre.`;

  return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                year: { type: Type.STRING },
                description: { type: Type.STRING },
                director: { type: Type.STRING },
                genre: { type: Type.STRING },
              },
              required: ['title', 'year', 'description', 'director', 'genre']
            }
          }
        }
      });

      const results = JSON.parse(response.text) as Movie[];
      const sources: {uri: string, title: string}[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) sources.push({ uri: chunk.web.uri, title: chunk.web.title });
        });
      }
      return { results, sources };
  });
}

export async function searchSong(query: string): Promise<{results: Song[], sources: {uri: string, title: string}[]}> {
  const ai = getAiClient();
  const prompt = `Search song details for: "${query}". Return JSON array with title, artist, album, year, genre, meaning.`;

  return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                artist: { type: Type.STRING },
                album: { type: Type.STRING },
                year: { type: Type.STRING },
                genre: { type: Type.STRING },
                meaning: { type: Type.STRING },
              },
              required: ['title', 'artist', 'album', 'year', 'genre', 'meaning']
            }
          }
        }
      });

      const results = JSON.parse(response.text) as Song[];
      const sources: {uri: string, title: string}[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) sources.push({ uri: chunk.web.uri, title: chunk.web.title });
        });
      }
      return { results, sources };
  });
}

export async function retranslateBlock(originalText: string, context: ContextObject, contextType: 'movie' | 'music', sourceLanguage: 'en' | 'es'): Promise<string> {
    const ai = getAiClient();
    const prompt = `Translate to Brazilian Portuguese: "${originalText}". Context: ${JSON.stringify(context)}. Return only the translated text.`;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text.trim();
}

export async function reformatBlock(translatedText: string, context: ContextObject, contextType: 'movie' | 'music'): Promise<string> {
    const ai = getAiClient();
    const prompt = `Reformat this subtitle to max 2 lines, 42 chars each: "${translatedText}". Return only the text.`;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text.trim();
}

export async function translateText(textToTranslate: string, sourceLanguage: 'en' | 'es'): Promise<string> {
  const ai = getAiClient();
  const prompt = `Translate to natural Brazilian Portuguese: "${textToTranslate}".`;
  const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
  return response.text.trim();
}
