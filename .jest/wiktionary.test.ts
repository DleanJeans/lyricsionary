import { isMissingPage } from '../src/utils/wiktionary';

describe('isMissingPage', () => {
  it('detects a missing page', () => {
    expect(isMissingPage({ query: { pages: [{ ns: 0, title: 'brief', missing: true }] } })).toBe(true);
  });

  it('detects an invalid title', () => {
    expect(isMissingPage({ query: { pages: [{ title: '[x]', invalid: true }] } })).toBe(true);
  });

  it('accepts an existing page', () => {
    expect(isMissingPage({ query: { pages: [{ pageid: 123, ns: 0, title: 'Brief' }] } })).toBe(false);
  });

  it('does not treat a malformed response as missing', () => {
    expect(isMissingPage({})).toBe(false);
    expect(isMissingPage(null)).toBe(false);
  });
});
