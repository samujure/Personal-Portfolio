# Working on this site

Vamsi's personal site: one static page where every picture is drawn live in the browser by a hill climber (`js/prim.js`). Read `README.md` first for the file map and the picture attributes.

## Rules

- No build step, no framework, no runtime dependencies. One stylesheet and three script tags, loaded in this order: `prim.js`, `art.js`, `app.js`.
- One typeface, Bricolage Grotesque. Type is black or white only. Colour belongs to the spreads, and the tokens are at the top of `css/site.css`.
- Copy is lowercase, dry, first person, short sentences. No slogans and nothing a careers page would say. Product names and acronyms keep their case (LaTeX, PyPI, ML).
- The research section is the exception: sentence case, no jokes, no quips on its picture. Set papers like a publication list (status, title, authors with equal-contribution marks, venue, abstract, role, links). Never state a result or method detail Vamsi has not confirmed.
- Pictures are drawn, never pasted. To add one, write a painter in `js/art.js` or point `data-photo` at a file in `img/`. Do not add a finished image of a picture.
- Only use photos Vamsi took or has permission to use. No press photos, no stock, nothing lifted from another site. One exception, Vamsi's call: the hero copies a UC San Diego photo of Tim Hawkinson's *Bear*, credited in the footer and kept small (640px). Keep the credit with it.
- `js/prim.js` is a port of Primitive (MIT). Keep its notice at the top of the file. The single deliberate difference from the original is marked in the `Model` constructor; say so if you add another.
- Numbers on the page must be real and checkable. An unknown stays a `<span class="tbd">` until Vamsi supplies it.
- Do not put an email address on the page until Vamsi says which one.
- Keep it accessible: every canvas has `role="img"` and an `aria-label`, controls are real buttons and inputs, and `prefers-reduced-motion` shows finished pictures instead of drawing them.

## Checking a change

```
pip install playwright && playwright install chromium
python3 tools/check.py
```

It serves the folder, opens the page at desktop, laptop and phone sizes with `?rate=4000` (which makes every picture finish in a second or two), prints each picture's readout and exits non-zero on a page error. Then open `tools/shots/*.png` and look: a page can be error-free and still look wrong.

## How the page is put together

- `.spread` is a two-column section: a picture (`figure.art`) and a text column (`.txt`). `.flip` puts the picture on the right. `--bg` and `--fg` on the section set its colours.
- `.band` is a full-width black statement. `.pair` is two half-width articles side by side. `.now` is the three-column closing section.
- Under 880px wide everything becomes one column and pictures become squares.
- In `js/app.js`, each `figure.art` gets a `Piece`. A piece builds a small target (192px on the long side, 256px for photos), runs `Prim.Model` on it, and draws each accepted shape as a vector on a large canvas. Pictures only work while they are on screen, and all visible pictures share about 9ms of work per frame.
- A figure with `data-video` gets a demo: when its drawing finishes the canvas nudges once (never on a loop), a "▶ demo" button joins the readout tag, and mouse hover or the button fades the video in. Videos are muted, looping, `preload="none"` until the drawing is done, and never autoplay under reduced motion.
- The hero has extra controls: the shape picker, the shape-count slider, and "use your own photo", which never uploads anything.

## Backlog, one sitting each

1. Fill the placeholders listed in `README.md` as the real numbers and links exist.
2. Hero photo: follow "Put your own photo in the hero" in `README.md`.
3. Shelf backend: send recommendations somewhere Vamsi can approve them before they show (a form service, or a small worker with a key-value store). Until then the form saves in the visitor's browser only, and the page says so.
4. Name That LLM, after January 13: a write-up section, plus a "guess which model wrote this" game.
5. Deploy: GitHub Pages from `main`, then a custom domain.
6. Share card and favicon: an Open Graph image and icons, drawn with the same engine.
7. Move the hill climber into a Web Worker so scrolling never competes with drawing.
