import { getKoreanStem } from '../src/utils/koreanWords';
import { splitLyricTokens } from '../src/utils/cleanLyrics';

describe('getKoreanStem', () => {
  it('takes off a particle that fits the syllable before it', () => {
    expect(getKoreanStem('너를')).toBe('너');
    expect(getKoreanStem('사랑을')).toBe('사랑');
    expect(getKoreanStem('나는')).toBe('나');
    expect(getKoreanStem('사람이')).toBe('사람');
    expect(getKoreanStem('서울로')).toBe('서울');
  });

  it('takes off stacked particles', () => {
    expect(getKoreanStem('학교에서는')).toBe('학교');
  });

  it("leaves words whose end only looks like a particle", () => {
    expect(getKoreanStem('아이')).toBeNull();
    expect(getKoreanStem('평가')).toBeNull();
    expect(getKoreanStem('포도')).toBeNull();
    expect(getKoreanStem('너')).toBeNull();
  });

  it('takes off particles like 도 only for a lookup', () => {
    expect(getKoreanStem('너도', { loose: true })).toBe('너');
  });
});

describe('Korean tokens', () => {
  it('keeps Korean words whole, as Korean puts spaces between them', () => {
    expect(splitLyricTokens('너를 사랑해')).toEqual(['너를', ' ', '사랑해']);
  });
});
