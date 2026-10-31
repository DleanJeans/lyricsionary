import { romanizeLine } from '../src/utils/romanize';

describe('romanizeLine', () => {
  it('romanizes Russian and Ukrainian', () => {
    expect(romanizeLine('Моя любовь, привет', 'Russian')).toBe("Moya lyubov, privet");
    expect(romanizeLine('Щастя', 'Ukrainian')).toBe('Shchastya');
    expect(romanizeLine('Гарна дівчина', 'Ukrainian')).toBe('Harna divchyna');
  });

  it('romanizes Greek', () => {
    expect(romanizeLine('Σ’αγαπώ πολύ', 'Greek')).toBe('S’agapo poly');
    expect(romanizeLine('Μπουζούκι', 'Greek')).toBe('Mpouzouki');
  });

  it('romanizes Korean', () => {
    expect(romanizeLine('너를 사랑해', 'Korean')).toBe('neoreul saranghae');
    expect(romanizeLine('봄날', 'Korean')).toBe('bomnal');
  });

  it('romanizes Hindi', () => {
    expect(romanizeLine('दिल से प्यार', 'Hindi')).toBe('dil se pyaar');
    expect(romanizeLine('तुम ही हो', 'Hindi')).toBe('tum hee ho');
  });

  it('romanizes Arabic', () => {
    expect(romanizeLine('حبيبي', 'Arabic')).toBe('hbibi');
  });

  it('leaves Latin, Japanese and Chinese lines alone', () => {
    expect(romanizeLine('Je veux', 'French')).toBeNull();
    expect(romanizeLine('夜に駆ける', 'Japanese')).toBeNull();
  });
});
