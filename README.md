# QuireMaker

Watch a sheet of paper fold into a book.

QuireMaker is a free browser tool for students learning how early books were made. You paste in some text, pick a format (folio, quarto, octavo, or sextodecimo), and the tool lays your words onto printer sheets the way a hand-press printer would. Then you can print those sheets, fold them, and hold a real little gathering in your hands.


---

## What is a quire?

A **quire** (also called a **gathering**) is a small stack of leaves made by folding one sheet of paper. Fold once and you get a folio. Fold again and you get a quarto. Keep folding and the pages get smaller and more of them appear.

Printers did not print one page at a time. They printed several pages on both sides of a big sheet, then folded it so the pages landed in the right order. That layout step is called **imposition**. QuireMaker shows you that whole process on screen, then lets you print sheets you can fold yourself.

---

## How to run it

The tool uses JavaScript modules, and most browsers will not run those if you just double-click `index.html`. You need to open it through a small local server. It takes one command.

1. Download or clone this project.
2. Open a terminal in the project folder and start a server:

   ```bash
   python3 -m http.server 8000
   ```

3. Open `http://localhost:8000` in a modern browser (Chrome, Firefox, Safari, or Edge).

That is it. If you use an editor like VS Code, the Live Server extension does the same thing with a right-click.

People on other networks will not reach your laptop this way. For a link everyone can open, host the folder on something like GitHub Pages and share that URL instead.

---

## How to use it

1. **Pick a format.** Folio is 1 fold (4 pages). Quarto is 2 folds (8 pages). Octavo is 3 folds (16 pages). Sextodecimo is 4 folds (32 pages).
2. **Set a signature mark** if you want (usually the letter `A`). This is the printer's label for that gathering.
3. **Choose type size and typeface** to taste.
4. **Tick what you want on the page:** page numbers, signature marks, catchwords, paragraph breaks, running title, and whether page numbers restart in each gathering.
5. **Paste your text** into the Paste text box. Blank lines become paragraphs when that option is on. Long text spills into as many gatherings as it needs. Nothing gets dropped.
6. **Press Impose & preview.** Watch the sheet fold in the theatre. Scroll down to read the finished pages in order.
7. **Click a page on the forme maps** to spotlight that leaf on both sides of the sheet. Numbers tagged `180°` are printed upside down on purpose. They come right side up after you fold.
8. **Press Print.** Use duplex (two-sided) printing and flip on the long edge. Fold, nest the sheets, and you have a quire.

There is also a short User Guide on the site if you want a walkthrough with tips.

---

## Pages on the site

| Page | What it is |
|------|------------|
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
│   └── styles.css      all the look and feel
├── js/
│   ├── app.js          wires up the buttons and controls
│   ├── imposition.js   fold math and page layout on the sheet
│   ├── pagination.js   splits your text into pages
│   ├── preview.js      fold theatre and finished-page preview
│   └── print.js        builds the printable sheets
├── images/             logos, photos, and other pictures
├── LICENSE             MIT license
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
 
Full terms: https://creativecommons.org/licenses/by-nc-sa/4.0/
