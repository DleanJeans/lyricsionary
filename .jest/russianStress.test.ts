import { addStressMark, removeStressMarks } from '../src/utils/russianStress';

describe('addStressMark', () => {
  it('marks the vowel the IPA stresses', () => {
    expect(addStressMark('любовь', '/lʲʊˈbofʲ/')).toBe('любо́вь');
    expect(addStressMark('хорошо', '/xərɐˈʂo/')).toBe('хорошо́');
    expect(addStressMark('Привет', '/prʲɪˈvʲet/')).toBe('Приве́т');
    expect(addStressMark('кохання', '/koˈxɑnʲːɐ/')).toBe('коха́ння');
    expect(addStressMark('мама', '/ˈmamə/')).toBe('ма́ма');
  });

  it('leaves words that need no mark', () => {
    expect(addStressMark('мой', '/moj/')).toBe('мой');
    expect(addStressMark('всё', '/fsʲo/')).toBe('всё');
    expect(addStressMark('любовь', '')).toBe('любовь');
  });
});

describe('removeStressMarks', () => {
  it('matches words written with a stress mark', () => {
    expect(removeStressMarks('любо́вь')).toBe('любовь');
    expect(removeStressMarks('café')).toBe('café');
  });
});
