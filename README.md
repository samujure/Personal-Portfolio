# vamsi's site

One page. Every picture on it is drawn in the visitor's browser by a hill climber: it tries random shapes and keeps the ones that make the picture less wrong. There is no framework and no build step.

## Run it

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from disk also works, except that pictures set with `data-photo` fall back to their painted version, because browsers will not let a page read image pixels from a `file://` address.

## What's where

| Path | What it holds |
| --- | --- |
| `index.html` | All the content and copy |
| `css/site.css` | Layout, type and the colour of each spread (tokens at the top) |
| `js/prim.js` | The hill climber, a port of [Primitive](https://github.com/fogleman/primitive) |
| `js/art.js` | The painted pictures the climber copies (Geisel, the integral, the coin and so on) |
| `js/app.js` | When pictures draw, the hero controls, the optimiser path, the shelf form |
| `img/` | Your own photos |
| `tools/check.py` | Opens the page at three sizes, waits for every picture, saves screenshots, fails on errors |

## How a picture works

Each picture is a `<figure class="art">` with a few attributes:

```html
<figure class="art" data-paint="geisel" data-type="tri" data-count="360" data-quip="close enough.">
```

| Attribute | Meaning |
| --- | --- |
| `data-paint` | Which painter in `js/art.js` to copy. Also the fallback when a photo fails to load |
| `data-photo` | Path to a photo to copy instead of a painter |
| `data-type` | The shape it draws with: `tri`, `rell` (blobs), `rect` (bricks), `circ` (dots), `rrect` (shards), `ell` |
| `data-count` | How many shapes it gets. Leave it off a photo and the page picks 800 to 2,400 from how busy the photo is |
| `data-alpha` | Opacity of each shape, 1 to 255. Default 128 |
| `data-quip` | The line the readout ends on once the picture is finished |
| `data-video` | A demo clip for this picture. Once the drawing finishes, the picture nudges once and a "▶ demo" button appears; hovering (mouse) or pressing it fades the video in over the drawing |

A detailed photo needs far more shapes than a flat graphic: a portrait is a blank patch at 360 and recognisable from about 1,000.

## Put your own photo in the hero

1. Save a photo you took as `img/hero.jpg`.
2. On the hero `<figure>` in `index.html`, add `data-photo="img/hero.jpg"` and delete `data-count`.
3. Rewrite the sentence under the name (it currently says the picture is Geisel) and the canvas `aria-label`.
4. To match the hero background to your photo, change `--bear-light` at the top of `css/site.css`.

The same attribute works on any picture, so a real screenshot of InkTeX can replace the painted integral the same way.

## Add a demo video

1. Record 5 to 10 seconds of the project working. No sound needed.
2. Make it small (aim for under 2 MB):
   `ffmpeg -i raw.mov -vf "scale=960:-2" -an -c:v libx264 -crf 28 -preset slow -movflags +faststart img/thriftlm.mp4`
3. Add `data-video="img/thriftlm.mp4"` to that project's `<figure>`. The drawing stays as it is; the video only shows on hover or on the button.

Good first candidates: ThriftLM (a terminal recording), Gradient Atlas (a screen recording). InkTeX once v2 works.

## Still to fill in

Everything in a dashed box on the page is a placeholder (`<span class="tbd">` in `index.html`):

- InkTeX: error rate, TestFlight link
- ThriftLM: measured savings
- Name That LLM: the result
- Gradient Atlas: live link
- The paper: arXiv link, the one result figure
- Starfall: chapter one. The Wraith & Vespera: first inked page
- Say hi: email, X

The shelf's recommendation form only saves in the visitor's own browser. It needs a backend before it is real.

## Put it online

GitHub Pages serves this repo as it is: Settings, Pages, "Deploy from a branch", `main`, `/ (root)`. On a free account the repo has to be public for that.

## Credits

- The drawing method is [Primitive](https://github.com/fogleman/primitive) by Michael Fogleman, used under the MIT License. The notice is in `js/prim.js` and `THIRD_PARTY.md`. One change from the original: the shapes it tries get smaller as the picture fills in.
- The typeface is Bricolage Grotesque, loaded from Google Fonts.
- The hero copies a photo of *Bear* (2005) by Tim Hawkinson, Stuart Collection, UC San Diego. Photo: UC San Diego. `img/bear.jpg` is a 640px copy; remove it if the rights holder asks.
- Everything else, code and writing, is Vamsi's. No licence has been chosen for it yet.
