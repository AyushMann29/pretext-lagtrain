# Lagtrain - Pretext Text-Video Rendering

A web-based text animation that renders the music video for **Lagtrain** entirely out of typography, using [Cheng Lou's Pretext](https://github.com/chenglou/pretext) library. English lyrics flow through white areas, Japanese lyrics through black areas — all synced to the original audio.

Inspired by the [Bad Apple!! Pretext experiment](https://github.com/frmlinn/bad-apple-pretext) by frmlinn.

## Demo

> _Coming soon — deploy the `dist/` folder to any static host._

## How It Works

1. **Frame Extraction** — A Python script reads `song.mp4` with OpenCV, downscales each frame to a 1000×120 binary grid, and compresses it using Run-Length Encoding (RLE) into a flat binary file (`frames.bin`).
2. **Pretext Layout** — On initialization, the Pretext engine parses the English and Japanese lyrics, precomputing glyph metrics purely in RAM for constant-time lookups.
3. **Runtime Rendering** — Each frame, the binary segments define spatial boundaries. Pretext's `layoutNextLine` API fills each segment with the appropriate lyrics text. Rendering is batched and offloaded to the Canvas 2D GPU path.
4. **Audio Sync** — The master clock is `audio.currentTime`. The render loop is frame-limited to 30 FPS with buffer-starvation handling for network streaming.

## Tech Stack

- **Vite** — build tool & dev server
- **@chenglou/pretext** — high-performance text layout engine
- **Vanilla JavaScript** — zero framework overhead
- **Python + OpenCV + NumPy** — frame extraction & RLE encoding
- **Canvas 2D API** — GPU-accelerated rendering with object pooling

## Project Structure

```
lagtrain-pretext/
├── extract_frames.py      # Python script: video → frames.bin (RLE)
├── package.json
├── vite.config.js
├── index.html
├── song.mp4               # Source video (for extraction)
├── public/
│   ├── frames.bin         # RLE-compressed frame data
│   ├── song.mp3           # Audio track
│   ├── lyrics_en.txt      # English lyrics
│   └── lyrics_jp.txt      # Japanese lyrics
├── src/
│   ├── main.js            # Entry point
│   ├── conf.js            # Configuration constants
│   ├── style.css          # Styles
│   ├── core/
│   │   ├── App.js         # Main orchestration
│   │   └── Renderer.js    # Canvas 2D render engine
│   └── managers/
│       ├── AssetManager.js    # Streaming binary + text loader
│       ├── AudioManager.js    # Audio playback & sync
│       └── UIManager.js       # DOM UI overlay
└── dist/                  # Production build output
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+ with `opencv-python` and `numpy`

### Install

```bash
npm install
```

### Extract Frames (if needed)

```bash
python extract_frames.py song.mp4 public/frames.bin
```

This reads the video, binarizes each frame, and writes the RLE-compressed `frames.bin`. The file is already included in this repo, so you can skip this step unless you want to re-extract.

### Development

```bash
npm run dev
```

Open the local URL shown in the terminal. Click **PLAY** to start.

### Production Build

```bash
npm run build
```

Deploy the `dist/` folder to any static host (GitHub Pages, Vercel, Netlify, Cloudflare Pages).

### Preview Production Build

```bash
npm run preview
```

## Performance

- **Frame-limiting** — locked to 30 FPS regardless of display refresh rate
- **Object pooling** — zero GC stutters in the render loop
- **Integer coordinate locking** — no sub-pixel anti-aliasing overhead
- **Batched Canvas ops** — exactly 3 context switches per frame
- **Chunked streaming** — playback starts within ~5 seconds while data continues loading

## Credits

- **Lagtrain** — music and video by the original creator
- **Pretext** — [Cheng Lou](https://github.com/chenglou)
- **Reference implementation** — [frmlinn/bad-apple-pretext](https://github.com/frmlinn/bad-apple-pretext)

## License

MIT
