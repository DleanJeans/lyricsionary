// Scripts run in Look Up's browser on Wiktionary pages

// Before the page loads: ask for Wiktionary's night theme the way its own setting stores it for readers
// who aren't logged in (the "<wiki>mwclientpreferences" cookie that the page's head reads), so links
// opened inside the page stay dark too
export const wiktionaryNightJS = `
(function() {
  try {
    if (!/(^|\\.)wiktionary\\.org$/.test(location.hostname)) return;
    var pref = 'skin-theme-clientpref-night';
    var age = '; path=/; max-age=31536000; SameSite=Lax';
    document.cookie = 'enwiktionarymwclientpreferences=' + pref + age;
    document.cookie = 'mwclientpreferences=' + pref + age;
    try { localStorage.setItem('mwclientpreferences', pref); } catch (e) {}
    var night = function() {
      var html = document.documentElement;
      if (!html) return;
      html.classList.remove('skin-theme-clientpref-day', 'skin-theme-clientpref-os');
      html.classList.add('skin-theme-clientpref-night');
    };
    night();
    document.addEventListener('DOMContentLoaded', night);
  } catch (e) {}
})();
true;
`;

// After the page loads: keep it dark, show only `sectionId`'s language (the others fold under one
// button), and put "+ Use" after each of its meanings, which posts { type: 'useDefinition', text }
export const focusWiktionaryJS = (sectionId: string) => `
(function(sectionId) {
  try {
    if (!/(^|\\.)wiktionary\\.org$/.test(location.hostname)) return;
    var html = document.documentElement;
    html.classList.remove('skin-theme-clientpref-day', 'skin-theme-clientpref-os');
    html.classList.add('skin-theme-clientpref-night');

    var key = location.pathname + '#' + sectionId;
    if (window.__lyricsionaryFocus === key) return;
    window.__lyricsionaryFocus = key;

    if (!document.getElementById('lyricsionary-style')) {
      var style = document.createElement('style');
      style.id = 'lyricsionary-style';
      style.textContent =
        '.lyricsionary-use{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:9px;' +
        'background:#6C5CE7;color:#fff;font:600 12px/18px sans-serif;vertical-align:1px;cursor:pointer;user-select:none}' +
        '.lyricsionary-use.used{background:#00B894}' +
        '.lyricsionary-others{display:block;width:100%;margin:16px 0;padding:10px 12px;border-radius:10px;' +
        'border:1px solid #54595d;background:transparent;color:#a2a9b1;font:14px sans-serif;text-align:left}' +
        '.lyricsionary-hidden{display:none!important}';
      document.head.appendChild(style);
    }

    var root = document.querySelector('.mw-parser-output');
    if (!root) return;

    // The page's top-level parts, grouped by language heading (h2). The mobile site wraps a heading in
    // div.mw-heading2 and the language's content in the <section> after it; the desktop site doesn't.
    var isLanguageHeading = function(el) {
      return el.tagName === 'H2' || (el.classList && el.classList.contains('mw-heading2'));
    };
    var headingId = function(el) {
      var h2 = el.tagName === 'H2' ? el : el.querySelector('h2');
      if (!h2) return '';
      var headline = h2.querySelector('.mw-headline');
      return h2.id || (headline && headline.id) || '';
    };
    var blocks = [];
    var current = null;
    Array.prototype.slice.call(root.children).forEach(function(child) {
      if (isLanguageHeading(child)) {
        current = { id: headingId(child), name: (child.textContent || '').trim(), nodes: [child] };
        blocks.push(current);
      } else if (current) {
        current.nodes.push(child);
      }
    });
    var target = blocks.filter(function(b) { return b.id === sectionId; })[0];
    if (!target) return;

    // The mobile site starts sections closed
    target.nodes.forEach(function(node) {
      node.classList.add('open-block');
      node.removeAttribute('hidden');
      if (node.tagName === 'SECTION') node.style.display = 'block';
    });

    var others = blocks.filter(function(b) { return b !== target; });
    if (others.length > 0 && !document.querySelector('.lyricsionary-others')) {
      others.forEach(function(b) {
        b.nodes.forEach(function(node) { node.classList.add('lyricsionary-hidden'); });
      });
      var button = document.createElement('button');
      button.className = 'lyricsionary-others';
      button.textContent = '\\u25B8 Other languages (' + others.length + '): ' +
        others.map(function(b) { return b.name; }).join(', ');
      button.addEventListener('click', function() {
        others.forEach(function(b) {
          b.nodes.forEach(function(node) { node.classList.remove('lyricsionary-hidden'); node.classList.add('open-block'); });
        });
        button.remove();
      });
      var last = target.nodes[target.nodes.length - 1];
      last.parentNode.insertBefore(button, last.nextSibling);
    }

    // Each meaning: an item of a list right in the language's part, not one nested in another meaning
    target.nodes.forEach(function(node) {
      Array.prototype.slice.call(node.querySelectorAll('ol > li')).forEach(function(li) {
        if (li.parentElement.closest('li') || li.querySelector(':scope > .lyricsionary-use')) return;
        var copy = li.cloneNode(true);
        Array.prototype.slice.call(copy.querySelectorAll('ul, ol, dl, sup, style, .HQToggle, .nyms-toggle, .citation-whole, .h-usage-example, .lyricsionary-use'))
          .forEach(function(el) { el.remove(); });
        // Without labels in front, e.g. "(vulgar) damn cold" -> "damn cold"
        var text = (copy.textContent || '').replace(/\\s+/g, ' ').trim().replace(/^(\\([^)]*\\)\\s*)+/, '');
        if (!text) return;
        var use = document.createElement('span');
        use.className = 'lyricsionary-use';
        use.setAttribute('role', 'button');
        use.textContent = '+ Use';
        use.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'useDefinition', text: text }));
          use.textContent = '\\u2713 Added';
          use.classList.add('used');
        });
        // After the meaning's own text, before its examples
        var nested = li.querySelector(':scope > ul, :scope > dl, :scope > ol');
        li.insertBefore(use, nested);
      });
    });

    var heading = target.nodes[0];
    if (heading && heading.scrollIntoView) heading.scrollIntoView();
  } catch (e) {}
})(${JSON.stringify(sectionId)});
true;
`;
