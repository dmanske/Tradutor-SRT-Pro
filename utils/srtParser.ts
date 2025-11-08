
export interface SubtitleBlock {
  index: number;
  timestamp: string;
  originalText: string;
  translatedText: string;
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
