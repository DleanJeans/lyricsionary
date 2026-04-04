# Learn screen
## No song selected
- Centered Text: "No lyrics to display. Go to Editor to add lyrics."
- Button: "Go to Editor"

## Header
- Text: Song Name
- Text: Artist Name
    - Font: smaller than Song Name
- Top Right
    - Button: Toggle Translate
        - Icon: Languages or Hide
        - On Press: Show translations line by line with lyrics or hide them
    - Button: Edit
        - Icon: Edit Pen
        - On Press: Load song object into Editor

## Main Content
- Selected Word
    - Visible: when a word is selected in Lyrics View
    - Text H1: selected word
    - Top right same line: Close Button X
    - Button: Google
        - On Press: Open Google in Web View "define {word}"
    - Button: Wiktionary
        - On Press: Look up word on Wiktionary with the song language
            https://en.wiktionary.org/wiki/{word}#{Language}
- Action Bar
    - Font Size adjustor
        - Icon: Font Size
        - Button: Minus
        - Text: Font size
        - Button: Plus
    - Right Aligned
        - Text: Line counter
- Lyrics View
    - Display lyrics and optionally translations
        - Each word is pressable
            - On Press: Show Selected Word above