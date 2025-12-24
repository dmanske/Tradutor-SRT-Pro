
export interface SubtitleBlock {
  index: number;
  timestamp: string;
  originalText: string;
  translatedText: string;
  isUpdating?: boolean;
}

/**
 * Parses a string in SRT format into an array of SubtitleBlock objects.
 * @param srtContent The string content of the SRT file.
 * @returns An array of subtitle blocks.
 */
export const parseSrt = (srtContent: string): SubtitleBlock[] => {
  const blocks = srtContent.trim().split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.split('\n');
    const index = parseInt(lines[0], 10);
    const timestamp = lines[1];
    const originalText = lines.slice(2).join('\n');
    return {
      index,
      timestamp,
      originalText,
      translatedText: '', // Will be populated after translation
    };
  }).filter(b => !isNaN(b.index) && b.timestamp && b.originalText); // Filter out invalid blocks
};

/**
 * Converts an array of SubtitleBlock objects back into an SRT formatted string for download.
 * It uses the translatedText field.
 * @param subtitles An array of subtitle blocks.
 * @returns A string in SRT format.
 */
export const stringifySrt = (subtitles: SubtitleBlock[]): string => {
  return subtitles
    .map(sub => {
      // Use the translated text for the output
      return `${sub.index}\n${sub.timestamp}\n${sub.translatedText}`;
    })
    .join('\n\n');
};

/**
 * Converts an array of SubtitleBlock objects back into an SRT formatted string.
 * It uses the originalText field. This is useful for re-sending untranslated blocks to the API.
 * @param subtitles An array of subtitle blocks.
 * @returns A string in SRT format.
 */
export const stringifySrtFromBlocks = (subtitles: SubtitleBlock[]): string => {
  return subtitles
    .map(sub => {
      // Use the original text for the output
      return `${sub.index}\n${sub.timestamp}\n${sub.originalText}`;
    })
    .join('\n\n');
};


/**
 * Validates if the given string has a basic SRT file structure.
 * It checks if the first non-empty block matches the SRT pattern.
 * @param srtContent The string content to validate.
 * @returns True if the content appears to be a valid SRT, false otherwise.
 */
export const isValidSrt = (srtContent: string): boolean => {
  if (!srtContent || typeof srtContent !== 'string') {
    return false;
  }

  // A regex to match a basic SRT block: index, timestamp, and text.
  // It looks for:
  // - An optional BOM character at the start.
  // - A number at the start of a line.
  // - A timestamp line with '-->'.
  // - At least one line of text.
  const srtBlockRegex = /^\s*(\d+)\s*\n(\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3})\s*\n(.+)/s;

  // Find the first block to test against
  const firstBlock = srtContent.trim().split(/\n\s*\n/)[0];

  return srtBlockRegex.test(firstBlock);
};

// --- SMART CC REMOVAL LOGIC ---

const CC_KEYWORDS = [
  // Sounds & Actions
  'MUSIC', 'SONG', 'LAUGHING', 'LAUGHTER', 'CHEERING', 'CHANTING', 
  'APPLAUSE', 'CROWD', 'AUDIENCE', 'GASPS', 'SCREAMING', 'FOOTSTEPS', 
  'THUNDER', 'EXPLOSION', 'DOOR', 'PHONE RINGING', 'SIREN', 'ENGINE', 
  'WIND', 'RAIN', 'BANG', 'SILENCE', 'BEAT', 'PAUSE', 'SIGH', 'CHUCKLES',
  'SCOFFS', 'GROANS', 'WHIMPERS', 'CRYING', 'SOBBING', 'CLEARS THROAT',
  'GRUNTS', 'BREATHING', 'PANTING', 'BARKING', 'MEOWING', 'BIRDS',
  'INHALES', 'EXHALES', 'SIGHS', 'SNIFFLES', 'COUGHS', 'INSTRUMENTAL',
  'THEME', 'BACKGROUND', 'MÚSICA', 'MÚSICA AO FUNDO', 'THEME MUSIC', 'BACKGROUND MUSIC',
  
  // Audio Indicators
  'ON RADIO', 'OVER PHONE', 'ON TV', 'OVER PA', 'ON INTERCOM',
  
  // Tone / Style
  'WHISPERING', 'SHOUTING', 'SOFTLY', 'ANGRILY', 'SARCASTIC', 'UNDER BREATH',
  'LOUDLY', 'QUIETLY',
  
  // Language / Meta
  'IN ENGLISH', 'IN SPANISH', 'SPEAKING FRENCH', 'NO DIALOGUE',
  'UNINTELLIGIBLE', 'INAUDIBLE', 'THINKING',
  
  // Continuous Actions
  'CONTINUES', // Catch-all for "MUSIC CONTINUES", "APPLAUSE CONTINUES"
  
  // Technical
  'O.S.', 'V.O.', 'OFF SCREEN', 'VOICE OVER'
];

// Set of words that, if they constitute the entire line, are considered non-semantic vocalizations
const VOCALIZATIONS = new Set([
  'OH', 'AH', 'UH', 'UM', 'MM', 'MMM', 'HMM', 'HUH', 'HA', 'HEH', 'EH', 'OW', 'HEY'
]);

/**
 * Processes a single line to remove CC/Speaker labels according to strict rules.
 */
const cleanLine = (line: string): string | null => {
  let cleaned = line.trim();

  // 0. Remove leading artifacts like ">>" or ">>>" often found in broadcast captions
  cleaned = cleaned.replace(/^>+\s*/, '');

  // 1. Remove Speaker Labels (e.g. "JOE: Hello", "MAN 1: Wait")
  // Pattern: Start of line, Uppercase/Numbers/Spaces, Colon, followed by space or end of line.
  // We check for short length to avoid removing "12:00: Time to go"
  const speakerRegex = /^([A-Z0-9\s\.\-\(\)]+):(\s+|$)/;
  const speakerMatch = cleaned.match(speakerRegex);
  
  if (speakerMatch) {
      const label = speakerMatch[1];
      const textOnly = label.replace(/[^a-zA-Z]/g, '');
      const capsOnly = label.replace(/[^A-Z]/g, '');
      
      // Heuristic: Label must be mostly caps (e.g. > 60%) to be considered a speaker tag
      const isMostlyCaps = textOnly.length > 0 && (capsOnly.length / textOnly.length > 0.6);
      const isShort = label.length < 30; // Speaker labels are rarely long sentences

      if ((isMostlyCaps || textOnly.length === 0) && isShort) {
          cleaned = cleaned.substring(speakerMatch[0].length);
      }
  }

  // 2. Remove Mixed Non-Speech Cues (content in Parens and Brackets)
  cleaned = cleaned.replace(/([\(\[][^\)\]]*[\)\]])/g, (match) => {
      const content = match.slice(1, -1).trim();
      
      // If content is just symbols or empty, remove it.
      if (!content.replace(/[^a-zA-Z0-9]/g, '')) return '';

      const upperContent = content.toUpperCase();
      
      // Check for specific Technical Cues (exact match or start)
      if (['O.S.', 'V.O.', 'O.S', 'V.O', 'ALL', 'EVERYONE', 'BOTH', 'CROWD'].includes(upperContent)) return '';

      // If it contains a known CC Keyword (case-insensitive)
      const hasKeyword = CC_KEYWORDS.some(kw => upperContent.includes(kw));
      if (hasKeyword) return '';

      // If content is MOSTLY CAPS (> 70%)
      const textOnly = content.replace(/[^a-zA-Z]/g, '');
      const capsOnly = content.replace(/[^A-Z]/g, '');
      const isMostlyCaps = textOnly.length > 0 && (capsOnly.length / textOnly.length > 0.7);
      if (isMostlyCaps) return '';
      
      // If content contains music symbols
      if (content.includes('♪') || content.includes('♫')) return '';

      // If it starts with "-" (e.g. "(- AUDIENCE CHEERING)")
      if (content.startsWith('-')) return '';

      // Otherwise, keep it (e.g. "(I think)", "(sussurrando)")
      return match;
  });

  // 3. Remove Music Symbols
  cleaned = cleaned.replace(/[♪♫]/g, '');
  
  // 4. Remove Enclosed Asterisks *TEXT*
  cleaned = cleaned.replace(/\*.*?\*/g, '');
  
  // 5. Clean stray punctuation/whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // 6. Handle Standalone Symbols
  // Remove lines that are just dashes, dots, or symbols
  if (/^[-—]+$/.test(cleaned)) return null; 
  if (/^\.{2,}$/.test(cleaned)) return null;

  // Leading dash cleanup: If a line was "- (GASPS)" and became "- ", remove the dash.
  // BUT preserve "- Hello" (dialogue).
  // The regex replace above might leave a trailing space if mixed. 
  // e.g. "Hello (SIGH)" -> "Hello " -> trim() -> "Hello".
  // e.g. "- (SIGH)" -> "- " -> trim() -> "-".
  if (cleaned === '-') return null;

  if (!cleaned) return null;

  // 7. Vocalization / Interjection Filter
  // Check if the line consists ONLY of non-semantic vocalizations
  const cleanForVocals = cleaned.toUpperCase().replace(/[^\w\s]/g, ''); // Remove punctuation
  const words = cleanForVocals.split(/\s+/).filter(w => w);
  
  if (words.length > 0) {
      const isAllVocal = words.every(w => VOCALIZATIONS.has(w));
      // Ensure we don't delete meaningful short sentences that might coincide, 
      // but the list is specific enough (OH, AH, MM). "OH NO" has "NO", which isn't in list.
      if (isAllVocal) {
          return null; 
      }
  }

  // 8. Final Safety Check for ALL CAPS non-dialogue lines (without brackets)
  const upperCleaned = cleaned.toUpperCase();
  const textOnlyLine = cleaned.replace(/[^a-zA-Z]/g, '');
  
  // If line is mostly caps
  if (textOnlyLine.length > 0 && (cleaned.replace(/[^A-Z]/g, '').length / textOnlyLine.length > 0.8)) {
      const words = upperCleaned.split(/[\s[:punct:]]+/);
      
      // Common pronouns that indicate dialogue
      const pronouns = ['I', 'YOU', 'HE', 'SHE', 'WE', 'THEY', 'IT', 'ME', 'MY', 'YOUR', 'HIS', 'HER', 'OUR', 'THEIR', 'WHO', 'WHAT', 'WHERE', 'WHEN', 'WHY', 'HOW', 'YES', 'NO', 'OK', 'HEY', 'OH', 'WELL'];
      const hasPronoun = words.some(w => pronouns.includes(w));
      
      if (!hasPronoun) {
           // If it lacks pronouns and contains a CC Keyword, remove it
           const hasCCKeyword = words.some(w => CC_KEYWORDS.includes(w));
           if (hasCCKeyword) return null;
      }
  }

  return cleaned;
};

/**
 * Aggressively removes CC lines from a text block while preserving structure.
 */
export const cleanSubtitleText = (text: string): string => {
  const lines = text.split('\n');
  const cleanedLines = lines
    .map(cleanLine)
    .filter(line => line !== null && line.length > 0) as string[];
  
  return cleanedLines.join('\n');
};
