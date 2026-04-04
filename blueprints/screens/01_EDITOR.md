# Editor screen
## Header
- Title: "New Lyrics" or "Edit Lyrics"
- Button
    - Top Right, same line with title
    - Icon: Music Note
    - On Press: Fetch the song name and artist name to fill the TextInputs below
- TextInput: "Song Name"
    - Icon: Music Note
- TextInput: "Artist Name"
    - Icon: Person
- Button: "Google Search"
    - Icon: Search Magnifier
    - On Press: Open Google URL with query "{Song Name} + {Artist Name} lyrics" in Web screen
    - Disabled: "Song Name" and "Artist Name" inputs are empty

## Main
Tab Header: scrollable
- Tab 1: "Original"
- Tab n: Added languages (none or many)
- Last tab - Button: "+ Add Translation"
    - On Press: Open dialog "Add Translation"
        - Dropdown: "Language" with flag icons
        - Button "Cancel": Close
        - BUtton "Add": Add new tab
- Every tab
    - Multi-line TextInput
60/40 split
    - Button
        - Multi-line TextInput empty:
            - Button "Paste"
                - Icon: Clipboard
                - On Press: Paste clipboard content into Multi-line TextInput above
        - Multi-line TextInput not empty:
            - Button "Save"
                - On Press: Save song name, artist name, lyrics into a Song object
    - Button "Clear"
        - Icon: X
        - On Press: Clear all TextInputs on screen
        - Disabled: all TextInputs are empty

