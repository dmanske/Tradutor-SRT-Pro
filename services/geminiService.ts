
import { GoogleGenAI, Type } from "@google/genai";
import { Movie, Song, ContextObject } from "../App";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("A variável de ambiente API_KEY não está definida");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const MOVIE_PROMPT_TEMPLATE = `
Você é um tradutor especialista e legendador profissional, traduzindo do inglês para o português do Brasil (pt-br).

Sua tarefa é traduzir o conteúdo do arquivo SRT a seguir. Use as informações de contexto do filme/série fornecidas para garantir a máxima precisão. Siga estas regras ESTRITAMENTE:

--- INFORMAÇÕES DE CONTEXTO ---
*   **Título:** {movieTitle}
*   **Ano de Lançamento:** {movieYear}
*   **Gênero:** {movieGenre}
*   **Diretor:** {movieDirector}
*   **Sinopse:** {movieDescription}
--- FIM DO CONTEXTO ---

1.  **QUALIDADE CONTEXTUAL É CRUCIAL:** Use as informações de contexto acima para entender o gênero, tom, personagens e terminologia específica.

2.  **NÃO MODIFIQUE TIMESTAMPS E ÍNDICES:** Os números de índice (ex: '1', '2') e as linhas de timestamp (ex: '00:00:20,007 --> 00:00:22,007') devem permanecer **absolutamente inalterados**.

3.  **REGRAS DE FORMATAÇÃO DE LEGENDA (MUITO IMPORTANTE):**
    *   **Limite de Caracteres por Linha:** Cada linha de texto traduzido deve ter no máximo **42 caracteres**.
    *   **Limite de Linhas por Bloco:** Cada bloco de legenda deve ter no máximo **2 linhas** de texto. É terminantemente proibido usar 3 ou mais linhas.
    *   **Quebra de Linha Inteligente:** Se uma frase for longa, divida-a em duas linhas em um ponto que faça sentido gramaticalmente (após uma vírgula, antes de uma conjunção, etc.), respeitando o limite de caracteres.

4.  **REGRAS DE TRADUÇÃO PARA PORTUGUÊS DO BRASIL:**
    *   **Naturalidade:** A tradução deve soar completamente natural para um falante nativo do Brasil. Evite traduções literais. Adapte gírias e expressões idiomáticas para equivalentes brasileiros.
    *   **Pontuação:** Siga rigorosamente as regras de pontuação do português brasileiro. Preste atenção especial ao uso de vírgulas, pontos finais, exclamações e interrogações para refletir a entonação da fala original.
    *   **Consistência:** Mantenha a consistência nos termos e no tom ao longo de todo o arquivo.

5.  **SAÍDA:** Sua resposta deve ser **APENAS** o conteúdo do arquivo SRT traduzido, sem nenhum texto, explicação ou formatação de código (como \`\`\`srt). Apenas o texto SRT puro e completo.

Aqui está o conteúdo SRT para traduzir:

--- SRT CONTENT START ---
{srtContent}
--- SRT CONTENT END ---
`;

const MUSIC_PROMPT_TEMPLATE = `
Você é um tradutor artístico especialista, traduzindo letras de música do inglês para o português do Brasil (pt-br). Sua tarefa é capturar a essência poética e emocional da música, não apenas o significado literal.

Use as informações de contexto da música para guiar sua tradução. Siga estas regras ESTRITAMENTE:

--- INFORMAÇÕES DE CONTEXTO DA MÚSICA ---
*   **Título da Música:** {songTitle}
*   **Artista:** {artist}
*   **Álbum:** {album}
*   **Ano:** {year}
*   **Gênero:** {genre}
*   **Significado/Tema da Música:** {songMeaning}
--- FIM DO CONTEXTO ---

1.  **TRADUÇÃO POÉTICA E ARTÍSTICA:**
    *   **Priorize a Emoção:** A tradução deve evocar o mesmo sentimento da letra original.
    *   **Adapte Metáforas e Idiomas:** Não traduza metáforas e expressões idiomáticas literalmente. Encontre equivalentes poéticos e culturais em português do Brasil que transmitam a mesma ideia.
    *   **Mantenha o Tom:** Seja fiel ao tom do artista (ex: melancólico, agressivo, romântico, irônico). O contexto acima é sua principal referência.
    *   **Fluidez é Essencial:** A letra traduzida deve ser fluida e soar como uma canção, não como um manual de instruções.

2.  **REGRAS TÉCNICAS (OBRIGATÓRIO):**
    *   **NÃO MODIFIQUE TIMESTAMPS E ÍNDICES:** Os números de índice (ex: '1') e as linhas de timestamp (ex: '00:00:20,007 --> 00:00:22,007') devem permanecer **absolutamente inalterados**.
    *   **Limite de Caracteres por Linha:** Máximo de **42 caracteres** por linha.
    *   **Limite de Linhas por Bloco:** Máximo de **2 linhas** de texto por bloco.
    *   **Quebra de Linha Inteligente:** Divida as frases em pontos gramaticais naturais para respeitar os limites.

3.  **SAÍDA:** Sua resposta deve ser **APENAS** o conteúdo do arquivo SRT traduzido, sem nenhum texto, explicação ou formatação de código (como \`\`\`srt). Apenas o texto SRT puro e completo.

Aqui está o conteúdo SRT para traduzir:

--- SRT CONTENT START ---
{srtContent}
--- SRT CONTENT END ---
`;

export async function* translateSrtStream(srtContent: string, context: ContextObject, contextType: 'movie' | 'music'): AsyncGenerator<string> {
  try {
    let prompt: string;

    if (contextType === 'music' && 'artist' in context) {
        const songContext = context as Song;
        prompt = MUSIC_PROMPT_TEMPLATE
            .replace('{songTitle}', songContext.title || 'Título Desconhecido')
            .replace('{artist}', songContext.artist || 'Artista Desconhecido')
            .replace('{album}', songContext.album || 'Álbum Desconhecido')
            .replace('{year}', songContext.year || 'Ano Desconhecido')
            .replace('{genre}', songContext.genre || 'Gênero Desconhecido')
            .replace('{songMeaning}', songContext.meaning || 'Nenhum significado fornecido.')
            .replace('{srtContent}', srtContent);
    } else {
        const movieContext = context as Movie;
        prompt = MOVIE_PROMPT_TEMPLATE
            .replace('{movieTitle}', movieContext.title || 'Título Desconhecido')
            .replace('{movieYear}', movieContext.year || 'Ano Desconhecido')
            .replace('{movieGenre}', movieContext.genre || 'Gênero Desconhecido')
            .replace('{movieDirector}', movieContext.director || 'Diretor Desconhecido')
            .replace('{movieDescription}', movieContext.description || 'Nenhuma sinopse fornecida.')
            .replace('{srtContent}', srtContent);
    }

    const response = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });
    
    let buffer = '';
    for await (const chunk of response) {
      // Clean up potential code blocks that might be added by the model in the stream
      const text = chunk.text.replace(/```srt\n|```/g, '');
      buffer += text;
      
      let endOfBlockIndex;
      // Process buffer to find complete SRT blocks, which are separated by double newlines.
      while ((endOfBlockIndex = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.substring(0, endOfBlockIndex);
        buffer = buffer.substring(endOfBlockIndex + 2);
        if (block.trim()) {
          yield block.trim();
        }
      }
    }

    // Yield any remaining content in the buffer after the stream ends.
    if (buffer.trim()) {
      yield buffer.trim();
    }

  } catch (error) {
    console.error("Erro ao chamar a API Gemini stream:", error);
    throw new Error("Falha ao obter uma resposta de streaming do modelo de IA.");
  }
};

export async function searchMovie(query: string): Promise<Movie[]> {
  try {
    const prompt = `Sua tarefa é encontrar filmes ou séries de TV que correspondam à consulta de pesquisa: '${query}'. Para garantir a máxima precisão, consulte especificamente as seguintes fontes de dados de filmes: **IMDb** e **The Movie Database (TMDb)**. Compare os resultados de ambas as fontes e retorne um array JSON combinado com até 5 dos resultados mais relevantes. Para cada resultado, forneça: o título exato, o ano de lançamento, a sinopse completa do enredo, a URL HTTPS completa para a imagem do pôster, o(s) diretor(es) e o(s) gênero(s). A 'posterUrl' deve ser um link direto para um arquivo de imagem (ex: .jpg). Se nenhum resultado for encontrado em nenhuma das fontes, retorne um array vazio.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              year: { type: Type.STRING },
              description: { type: Type.STRING },
              posterUrl: { type: Type.STRING },
              director: { type: Type.STRING },
              genre: { type: Type.STRING },
            },
            required: ['title', 'year', 'description', 'posterUrl', 'director', 'genre']
          }
        }
      }
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    return result as Movie[];

  } catch (error) {
    console.error("Erro ao chamar a API Gemini para busca de filmes:", error);
    throw new Error("Falha ao buscar o filme. Por favor, tente novamente.");
  }
}

export async function searchSong(query: string): Promise<Song[]> {
  try {
    const prompt = `Sua tarefa é atuar como um especialista em música e encontrar informações sobre a música que corresponde à consulta de pesquisa: '${query}'. Consulte fontes confiáveis como **Genius, Wikipedia, MusicBrainz e Spotify/Apple Music**. Retorne um array JSON com até 5 dos resultados mais relevantes. Para cada resultado, forneça: o título exato da música, o nome do artista principal, o nome do álbum, o ano de lançamento, o gênero, uma breve sinopse do significado ou tema lírico da música e a URL HTTPS completa para a arte do álbum. A 'posterUrl' deve ser um link direto para um arquivo de imagem (ex: .jpg). Se nenhum resultado for encontrado, retorne um array vazio.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
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
              posterUrl: { type: Type.STRING },
            },
            required: ['title', 'artist', 'album', 'year', 'genre', 'meaning', 'posterUrl']
          }
        }
      }
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    return result as Song[];

  } catch (error) {
    console.error("Erro ao chamar a API Gemini para busca de músicas:", error);
    throw new Error("Falha ao buscar a música. Por favor, tente novamente.");
  }
}


// FIX: Add missing translateText function
export async function translateText(textToTranslate: string): Promise<string> {
  try {
    const prompt = `Traduza o seguinte texto do inglês para o português do Brasil (pt-br).
Retorne APENAS o texto traduzido, sem nenhuma frase introdutória, explicação ou formatação de código.

--- TEXTO PARA TRADUZIR ---
${textToTranslate}
--- FIM DO TEXTO ---
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Erro ao chamar a API Gemini para tradução de texto:", error);
    throw new Error("Falha ao traduzir o texto. Por favor, tente novamente.");
  }
}
