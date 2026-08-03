# QuireMaker

Watch a sheet of paper fold into a book.

QuireMaker is a free browser tool for students learning how early books were made. You paste in some text, pick a format (folio, quarto, octavo, or sextodecimo), and the tool lays your words onto printer sheets the way a hand-press printer would. Then you can print those sheets, fold them, and hold a real little gathering in your hands.

---

## What is a quire?

A **quire** (also called a **gathering**) is a small stack of leaves made by folding one sheet of paper. Fold once and you get a folio. Fold again and you get a quarto. Keep folding and the pages get smaller and more of them appear.

Printers did not print one page at a time. They printed several pages on both sides of a big sheet, then folded it so the pages landed in the right order. That layout step is called **imposition**. QuireMaker shows you that whole process on screen, then lets you print sheets you can fold yourself.

---

## How to run it

The tool uses JavaScript modules, and most browsers will not run those if you just double-click `index.html`. You need to open it through a small local server.

1. Download or clone this project.
2. Open a terminal in the project folder and start a server:

   ```bash
   python3 -m http.server 8000
   ```

3. Open `http://localhost:8000` in a modern browser (Chrome, Firefox, Safari, or Edge).

If you use an editor like VS Code, the Live Server extension does the same thing with a right-click.

People on other networks will not reach your laptop this way. For a link everyone can open, host the folder on something like GitHub Pages and share that URL instead.

---

## How to use it

### Step by step instructions

1. **Pick a format.** Using the Format menu, you can choose to create a Folio (or 'bifolium') sheet, which would be folded once, resulting in two leaves and thus four pages. Each additional fold doubles the number of leaves and pages. QuireMaker allows for Folio (2°), Quarto (4°), Octavo (8°), or Sextodecimo (16°) sheets to be rendered.
2. **Name the Signature.** The signature letter (usually "A") is the printer's label for this quire; you'll want a different signature letter for a new quire.
3. **Set the type Size and Typeface** (you may want to experiment with these as you explore different signature sizes).
4. **Select/deselect What to Show on the Page** to show/hide page numbers, signature marks, catchwords, and paragraph breaks (which will treat blank lines as new paragraphs).
5. **Adjust the amount of white space** by adjusting the margins. You might, for example, want extra space on the binding edge, or spine, where the quires would be sewn together.
6. **Add text.** Type or paste into the text box. Large amounts of text will automatically spread onto as many gatherings as needed.
7. **Impose & preview.** Press the gold button to watch the sheet fold into whatever kind of quire you selected, then scroll to Finished pages to read them in order.
8. **Explore the formes.** Click any page to spotlight where it sits on both sides of the sheet. Numbers flagged 180° are printed upside down - that is normal, as they will come right side up once folded correctly.
9. **Print.** Hit Print, choose duplex, and flip on the long edge. Fold along the creases, and nest the sheets to make a bifolium, ternion, quaternion, or other kind of quire.

There is also a short User Guide on the site if you want a walkthrough with tips.

---

## Pages on the site

| Page | What it is |
| --- | --- |
| `index.html` | The tool itself |
| `guide.html` | A simple user guide |
| `about.html` | How the project started and why it matters |
| `resources.html` | Links and reading about quires and book history |
| `credits.html` | The people who built it |

---

## What is in the folders

```
QuireMaker2026/
├── index.html          main tool page
├── guide.html          user guide
├── about.html          project story
├── resources.html      extra reading and links
├── credits.html        team and thanks
├── css/
│   └── styles.css      look and feel
├── js/
│   ├── app.js          wires up the buttons and controls
│   ├── imposition.js   fold math and page layout on the sheet
│   ├── pagination.js   splits your text into pages
│   ├── paper.js        paper sizes and display units
│   ├── preview.js      fold theatre and finished-page preview
│   └── print.js        builds the printable sheets
├── images/             logos and photos
├── LICENSE             CC BY-NC-SA 4.0
└── README.md           you are here
```

Everything runs in the browser with plain HTML, CSS, and JavaScript. There is no build step and no npm.

---

## A bit of history

Pierre wanted a classroom tool so students could feel how books are put together, not only read about it. An early version lived for a couple of years, then stopped working when its old platform went away. The project came to ILiADS 2026 at Vassar College, where the team rebuilt it from scratch as a free, open tool for Book Studies and anyone curious about how a printed sheet becomes a book.

---

## Credits

Built at **ILiADS 2026** (Vassar College) for use at **Carleton College** and beyond.

Team:

- Prof. Pierre Hecker, Project Lead, Department of English, Carleton College
- Em Palencia, Academic Technologist, Carleton College
- Dr. Ashlyn Stewart, ILiADS 2026 Liaison, Boston College
- Amine El Messaoudi '28, Digital Humanities Research Assistant, Carleton College
- Sharon Fashola '29, Digital Humanities Research Assistant, Carleton College

---

## License

This project is released under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (CC BY-NC-SA 4.0)**. See `LICENSE` for the full text.

You are free to share and adapt QuireMaker, including for teaching, as long as you give credit, do not use it commercially, and share any derivative works under the same license.

Full terms: [https://creativecommons.org/licenses/by-nc-sa/4.0/](https://creativecommons.org/licenses/by-nc-sa/4.0/)
