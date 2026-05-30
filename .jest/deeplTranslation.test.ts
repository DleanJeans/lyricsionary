import { deduplicateLines, splitIntoChunks, joinChunks, remapTranslation } from '../src/utils/deeplTranslation';

describe('deduplicateLines', () => {
  it('handles empty string', () => {
    const result = deduplicateLines('');
    expect(result.deduplicated).toBe('');
    expect(result.lineMap).toEqual([0]); // Empty string splits into ['']
  });

  it('handles single line', () => {
    const result = deduplicateLines('Hello world');
    expect(result.deduplicated).toBe('Hello world');
    expect(result.lineMap).toEqual([0]);
  });

  it('preserves unique lines', () => {
    const lyrics = 'Line 1\nLine 2\nLine 3';
    const result = deduplicateLines(lyrics);
    expect(result.deduplicated).toBe('Line 1\nLine 2\nLine 3');
    expect(result.lineMap).toEqual([0, 1, 2]);
  });

  it('removes duplicate lines', () => {
    const lyrics = 'Verse\nChorus\nVerse\nChorus';
    const result = deduplicateLines(lyrics);
    expect(result.deduplicated).toBe('Verse\nChorus');
    expect(result.lineMap).toEqual([0, 1, 0, 1]);
  });

  it('handles empty lines', () => {
    const lyrics = 'Line 1\n\nLine 2\n\nLine 1';
    const result = deduplicateLines(lyrics);
    expect(result.deduplicated).toBe('Line 1\n\nLine 2');
    expect(result.lineMap).toEqual([0, 1, 2, 1, 0]);
  });
});

describe('splitIntoChunks', () => {
  it('returns single chunk for short text', () => {
    const text = 'Short text';
    const chunks = splitIntoChunks(text);
    expect(chunks).toEqual(['Short text']);
  });

  it('returns single chunk for text exactly at limit', () => {
    const text = 'a'.repeat(1500);
    const chunks = splitIntoChunks(text);
    expect(chunks).toEqual([text]);
  });

  it('splits text exceeding limit', () => {
    const line = 'a'.repeat(500);
    const text = `${line}\n${line}\n${line}\n${line}`; // 2004 chars total
    const chunks = splitIntoChunks(text);
    expect(chunks.length).toBe(2);
    expect(chunks[0].length).toBeLessThanOrEqual(1500);
    expect(chunks[1].length).toBeLessThanOrEqual(1500);
  });

  it('splits at line boundaries', () => {
    const lines = Array(50).fill('Line of text here').join('\n'); // ~850 chars
    const text = lines + '\n' + lines; // ~1700 chars
    const chunks = splitIntoChunks(text);
    expect(chunks.length).toBe(2);
    // Verify each chunk is valid (no partial lines)
    for (const chunk of chunks) {
      expect(chunk.startsWith('Line of text here')).toBe(true);
      expect(chunk.endsWith('Line of text here')).toBe(true);
    }
  });

  it('handles custom max chars', () => {
    const text = 'Line 1\nLine 2\nLine 3\nLine 4';
    const chunks = splitIntoChunks(text, 15);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(15);
    }
  });

  it('handles single very long line', () => {
    const longLine = 'a'.repeat(2000);
    const chunks = splitIntoChunks(longLine);
    // Single line longer than limit stays in one chunk
    expect(chunks).toEqual([longLine]);
  });
});

describe('joinChunks', () => {
  it('joins single chunk', () => {
    const chunks = ['Only chunk'];
    expect(joinChunks(chunks)).toBe('Only chunk');
  });

  it('joins multiple chunks', () => {
    const chunks = ['Chunk 1', 'Chunk 2', 'Chunk 3'];
    expect(joinChunks(chunks)).toBe('Chunk 1\nChunk 2\nChunk 3');
  });

  it('handles empty array', () => {
    expect(joinChunks([])).toBe('');
  });
});

describe('remapTranslation', () => {
  it('remaps simple translation', () => {
    const translated = 'Translated 1\nTranslated 2';
    const lineMap = [0, 1];
    expect(remapTranslation(translated, lineMap)).toBe('Translated 1\nTranslated 2');
  });

  it('restores duplicates', () => {
    const translated = 'Trans Verse\nTrans Chorus';
    const lineMap = [0, 1, 0, 1]; // Original had duplicates
    expect(remapTranslation(translated, lineMap)).toBe(
      'Trans Verse\nTrans Chorus\nTrans Verse\nTrans Chorus'
    );
  });

  it('handles missing lines gracefully', () => {
    const translated = 'Line 1';
    const lineMap = [0, 1, 2]; // Expects more lines than available
    expect(remapTranslation(translated, lineMap)).toBe('Line 1\n\n');
  });
});

describe('Full workflow: deduplicate, split, join, remap', () => {
  it('handles long lyrics with duplicates', () => {
    // Create lyrics with unique verse lines and a repeated chorus
    const verseLines = Array.from({ length: 25 }, (_, i) =>
      `This is verse line ${i} that is pretty long to test chunking properly`
    ).join('\n'); // ~1700 chars of unique lines

    const chorusLines = Array.from({ length: 5 }, (_, i) =>
      `This is chorus line ${i} here it is`
    ).join('\n'); // ~180 chars of unique lines

    // Create original lyrics with chorus repeated twice
    const originalLyrics = verseLines + '\n' + chorusLines + '\n' + verseLines + '\n' + chorusLines;

    // Step 1: Deduplicate
    const { deduplicated, lineMap } = deduplicateLines(originalLyrics);

    // Verify deduplicated text is long enough to require splitting
    // After deduplication, we should have all unique lines (verse + chorus) = ~1880 chars
    expect(deduplicated.length).toBeGreaterThan(1500);

    // Step 2: Split into chunks
    const chunks = splitIntoChunks(deduplicated);
    expect(chunks.length).toBeGreaterThan(1);

    // Simulate translation (just append "TRANS" to each line)
    const translatedChunks = chunks.map(chunk =>
      chunk.split('\n').map(line => line ? `TRANS ${line}` : '').join('\n')
    );

    // Step 3: Join chunks
    const translatedDeduplicated = joinChunks(translatedChunks);

    // Step 4: Remap to restore duplicates
    const finalTranslation = remapTranslation(translatedDeduplicated, lineMap);

    // Verify the result has the same number of lines as original
    const originalLines = originalLyrics.split('\n');
    const translatedLines = finalTranslation.split('\n');
    expect(translatedLines.length).toBe(originalLines.length);

    // Verify duplicates were restored
    // First chorus line (index 25) should match the same chorus line at index 56
    // Structure: 25 verse lines + 5 chorus lines + 25 verse lines + 5 chorus lines = 60 lines
    expect(translatedLines[25]).toBe(translatedLines[55]); // First chorus line repeated
  });
});
