# Closed Issues — Test Specifications

Each issue below is a closed feature or bugfix that should have corresponding tests. Use the issue number, title, and description to understand the expected behavior.

## Issues

### #132 — Editor: Original and Translation tab button height differ
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/132
- Fix height inconsistency between Original and Translation tab buttons in Editor

### #129 — EditorScreen should not clear after saving new song
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/129
- EditorScreen should retain its state after saving a new song instead of clearing

### #127 — LearnScreen is stuck loading after coming from saving a new song
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/127
- Fix LearnScreen stuck in loading state after coming from saving a new song

### #125 — Editor: Hide Already Saved! button while saving new song
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/125
- Hide the "Already Saved!" button while saving a new song in EditorScreen

### #122 — WebScreen: Fix Get Lyrics button flickering when detected lyrics
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/122
- Fix the Get Lyrics button flickering when lyrics are detected in WebScreen

### #119 — WordLookup: Track multiple contexts and context-specific definition/IPA/emoji
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/119
- WordLookupScreen:
  - Create a component: Full width TextInput for context (a line of lyrics)
  - On one row: Emoji Picker, TextInput IPA (default empty, placeholder = main IPA), TextInput Definition (non-multiline)
  - Remove main Emoji Picker next to language picker
  - Remove main Definition TextInput
  - WordEntry: Update to store the above
  - Move Master Level to 2nd row (under Language Picker)
- LearnScreen: Match selected word with saved words context to display specific annotations

### #117 — LearnScreen: When a word in elision is saved, render it separately (for connotations or color)
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/117
- When a word in an elision (e.g. j'viens) is saved, render it separately for connotations or color

### #115 — Words: Add level - Unknown, New, Learning, Mastered
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/115
- Add word proficiency levels: Unknown, New, Learning, Mastered

### #112 — Editor: New mode - Display both original and translation lyrics for easier syncing (melodrame)
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/112
- New editor mode that displays both original and translation lyrics side by side for easier syncing

### #108 — Scrape - Get Lyrics: Auto fill song original languages
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/108
- Auto fill original language(s) when scraping lyrics

### #106 — WordLookup: Display word transform buttons in WordPanel
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/106
- Display word transform buttons in the WordPanel component

### #102 — LearnScreen: Combine language-outline with settings-outline for header button icon
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/102
- Combine language-outline and settings-outline icons for the LearnScreen header button

### #100 — SongsScreen: Show loading after selecting song until loaded to LearnScreen + Optimize loading/rendering
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/100
- Show loading indicator after selecting song until loaded
- Optimize loading/rendering

### #98 — WordLookup: Auto scrape IPA from Wiktionary
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/98
- Auto-scrape IPA pronunciation from Wiktionary when looking up a word

### #96 — Learn/WordLookup: Remove prefix- (melan-melanger)
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/96
- Handle French negation prefix "ne/ni" and other prefixes in word matching

### #94 — Editor/Web: Get translation from DeepL
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/94
- If current tab is translation and empty, render button next to [Google Search]: Open DeepL in WebScreen and paste original lyrics
- When translation detected, display [Get Translation] button which fills in the selected translation tab
- Limitation: 1500 characters. Before pasting, filter out repeating lines. When scraping, map translation lines back to original

### #92 — Editor - New Lyrics: Auto detect Saved songs and display button
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/92
- After pressing [Get Currently Playing] or entering song/artist name, search in SongsScreen
- If matched, display a FAB button: [Found x song(s)] if x > 1 else [Already Saved!]
- On press, switch to SongsScreen with search enabled and query filled

### #90 — SongsScreen: Add search across all saved lyrics
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/90
- Add search across all saved lyrics content (not just title/artist)

### #89 — Learn - original lyrics display: Don't break line after ' (j'viens)
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/89
- Don't break line after apostrophe in original lyrics display (e.g. j'viens should stay on one line)

### #87 — Editor: Collapsible song metadata
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/87
- If song name and artist name empty, display TextInputs; else display SongMetadataDisplay
- When SongMetadataDisplay pressed, show TextInputs
- When press outside TextInputs, show SongMetadataDisplay

### #85 — Saved Songs/Saved Words: Add filter by language
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/85
- Create/refactor/reuse the same filter component(s) across both Saved Songs and Saved Words screens
- Filter by language

### #83 — Editor: Auto load selected song for edit
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/83
- When selecting a song from SongsScreen, load it into Editor too
- In Edit Mode: Hide GetCurrentlyPlaying, add [New] button, replace [Clear] with [Reset]

### #81 — WordLookup: Add buttons to manipulate words: Lowercase, remove contracted prefixes
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/81
- If word is capitalized, display [word in lowercase] button. On press, replace with [original capitalized word]
- If word starts with `letter + '`, display [word without prefix] button
- LearnScreen: When French, ignore [letter + '] for word matching for annotation display

### #78 — Learn: Switching to another song should close the word panel
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/78
- When switching to another song in LearnScreen, the word panel should close

### #76 — WebScreen: Style Get Lyrics button to look like a speech bubble
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/76
- Style the Get Lyrics button in WebScreen to look like a speech bubble

### #74 — Emoji search: Fix keyboard popup and overlaps
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/74
- Fix keyboard popup and overlap issues with the emoji search keyboard

### #72 — Learn: Display emoji, IPA, or definition above saved words
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/72
- Dropdown with: Edit button, checkboxes for translation languages, radio for Emoji/IPA/Definition

### #70 — Learn: Blur translation, reveal on press
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/70
- Blur the translation text in LearnScreen, reveal it when the user presses on it

### #68 — lyricsScrapeJS: Only show Get Lyrics button when detected lyrics
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/68
- In WebScreen, only show the Get Lyrics button when lyrics content has been detected

### #65 — Center screen title "Saved Songs" and "Saved Words"
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/65
- Center the screen title regardless of how many top-right buttons exist

### #61 — Editor: Add x button to tab button to delete translation
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/61
- Add a close/delete (x) button on each translation tab in the editor

### #59 — WordLookup: Open new word from LearnScreen still show pronunciation/definition from previous
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/59
- When opening a new word from LearnScreen, clear previous pronunciation/definition data

### #57 — WordLookup: Save button should go back to WordsScreen or LearnScreen
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/57
- After saving a word, navigate back to WordsScreen or LearnScreen instead of EditorScreen

### #55 — Saved Words: Swipe to show Delete button
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/55
- Swipe left on a saved word to reveal a Delete button

### #53 — LearnScreen: Pressing on new word open WordLookupScreen with first original language selected
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/53
- When pressing on a new word, open WordLookupScreen with first original language selected for that word

### #51 — Saved Words: Press on word open WordLookupScreen
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/51
- Pressing on a saved word opens WordLookupScreen

### #49 — LearnScreen: Toggle Translation button dropdown
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/49
- Add a dropdown for toggling translations on LearnScreen

### #47 — Saved Words: Emojis
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/47
- Display flag as default; add emoji field and selector to WordLookupScreen
- If a word has emoji, display it instead of the flag

### #45 — Editor: Add original language(s) field for song
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/45
- Original language can be multiple so use multiple select
- WordLookupScreen will use the first original language as the default

### #41 — Saved Words: Press to show Google/Wiktionary buttons
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/41
- When pressing on a saved word, show buttons to open Google/Wiktionary search

### #39 — Saved Songs: Add sorting
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/39
- Sorting modes: By last opened time (default), by how many times opened, A-Z, Z-A

### #37 — Learn: Open Google/Wiktionary on same screen
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/37
- Open Google and Wiktionary search on the same screen (LearnScreen) instead of navigating away

### #35 — Saved Words: Add search
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/35
- Add search functionality to Saved Words screen

### #33 — Saved Lyrics: Search by name
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/33
- Add a magnifier icon with search TextInput to search by song title or artist name

### #28 — Add source (site/URL) field for lyrics/translation
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/28
- Add a source URL field when saving lyrics/translation

### #26 — Fix no safe area for Web screen URL bar
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/26
- Fix safe area insets not being applied to the WebScreen URL bar

### #24 — Web screen (Android): Back should go to previous page
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/24
- In WebScreen on Android, pressing back should navigate to the previous page

### #20 — Allow deleting a song or word in Lyrics & Words screens
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/20
- Add ability to delete a song or word from Saved Songs / Saved Words screens

### #18 — New Lyrics: Hide Google Search button if lyrics is filled up
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/18
- In New Lyrics mode, hide Google Search button when lyrics field is already filled

### #14 — EditorScreen: Fix Save button press do nothing
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/14
- When Save pressed: song should be saved, app should switch to Learn screen with the song lyrics

### #12 — Genius: Remove tags from lyrics
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/12
- Remove tags like [Intro], [Refrain], [Couplet 1], etc. and double empty lines

### #10 — Implement currently playing song/artist name reading
- **URL**: https://github.com/DleanJeans/lyricsionary/issues/10
- Get currently playing song/artist from media notification (Spotify/YouTube)
- Fill in Song Name / Artist Name fields
- Display toast with error message if cannot read