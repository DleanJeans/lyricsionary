// Reads IPA from a Google search for "<word> <language> IPA", e.g. "/a.muʁ/" from the AI overview,
// for a word whose Wiktionary page has none

/** Body of a function (text) => IPA transcriptions found in the text, at most 4, first found first */
export const FIND_IPA_IN_TEXT = `
  // Slashes or brackets around letters with at least one IPA-only character, so "/search/" doesn't count
  const ipaOnly = /[ɐɑɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑ̯̃̊]/;
  const candidates = text.match(/\\/[^\\/\\n]{1,40}\\/|\\[[^\\]\\[\\n]{1,40}\\]/g) || [];
  const results = [];
  for (const candidate of candidates) {
    const inner = candidate.slice(1, -1).trim();
    if (!inner || !ipaOnly.test(inner) || /[0-9:?=&]|https?|www\\./.test(inner)) continue;
    const ipa = candidate[0] + inner + candidate[candidate.length - 1];
    if (!results.includes(ipa)) results.push(ipa);
    if (results.length >= 4) break;
  }
  return results;
`;

/** Injected into the Google tab: sends the IPA it finds, checking again while the AI overview loads */
export const getScrapeGoogleIpaJS = () => `
  (function() {
    const findIpa = new Function('text', ${JSON.stringify(FIND_IPA_IN_TEXT)});
    let tries = 0;
    const check = () => {
      const results = findIpa(document.body ? document.body.innerText : '');
      if (results.length > 0) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ipa', results }));
      } else if (++tries < 10) {
        setTimeout(check, 1000);
      }
    };
    check();
  })();
  true;
`;

/**
 * Body of a function (text, ipa, marked) => how a number is written out, read from the text before
 * its IPA, e.g. "zweiundvierzig" from "42 in German is zweiundvierzig /ˈt͡svaɪ̯ʊntˌfiːɐ̯t͡sɪç/".
 * `marked` are the page's bold or quoted bits; the one closest before the IPA wins, else the words
 * in quotes right before it, else the last word before it that isn't one like "pronounced".
 */
export const FIND_SPELLED_OUT_IN_TEXT = `
  const at = text.indexOf(ipa);
  if (at < 0) return '';
  const before = text.slice(Math.max(0, at - 120), at);
  const words = /^[\\p{L}\\p{M}'’-]+(?:[ -][\\p{L}\\p{M}'’-]+){0,5}$/u;
  const skip = /^(ipa|pronunciation|pronounced|number|numbers|in|is|the)$/i;
  let best = '';
  let bestAt = -1;
  for (const raw of marked) {
    const bit = raw.trim().replace(/^["“„«‘'(]+|["”“»’',:.)]+$/g, '');
    if (!bit || bit.length > 60 || !words.test(bit) || skip.test(bit)) continue;
    const found = before.lastIndexOf(bit);
    if (found > bestAt) { best = bit; bestAt = found; }
  }
  if (best) return best;
  const quoted = before.match(/["“„«‘]([^"“”„«»‘’]{1,60})["”“»’][^\\p{L}]*$/u);
  if (quoted && words.test(quoted[1].trim())) return quoted[1].trim();
  // Words like "and pronounced" or "IPA:" between it and the IPA are passed over
  const filler = /^(ipa|pronunciation|pronounced|pronounce|and|is|as|it|its|it's|written|spelled|spelt|says|said|sounds|like|or|in|the)$/i;
  const trailing = before.match(/[\\p{L}\\p{M}'’-]+/gu) || [];
  for (let i = trailing.length - 1; i >= 0 && i >= trailing.length - 6; i--) {
    if (!filler.test(trailing[i])) return trailing[i];
  }
  return '';
`;

/**
 * Injected into the Google tab for a number, e.g. 42: sends the IPA it finds and how the number is
 * written out, checking again while the AI overview loads
 */
export const getScrapeGoogleNumberJS = () => `
  (function() {
    const findIpa = new Function('text', ${JSON.stringify(FIND_IPA_IN_TEXT)});
    const findSpelledOut = new Function('text', 'ipa', 'marked', ${JSON.stringify(FIND_SPELLED_OUT_IN_TEXT)});
    let tries = 0;
    const check = () => {
      const text = document.body ? document.body.innerText : '';
      const results = findIpa(text);
      if (results.length > 0) {
        const marked = Array.from(document.querySelectorAll('b, strong, em, mark')).map((el) => el.innerText || '');
        const spelledOut = findSpelledOut(text, results[0], marked);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ipa', results }));
        if (spelledOut) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'spelledOut', text: spelledOut }));
      } else if (++tries < 10) {
        setTimeout(check, 1000);
      }
    };
    check();
  })();
  true;
`;
