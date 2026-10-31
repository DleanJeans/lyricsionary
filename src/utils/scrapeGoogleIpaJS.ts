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
