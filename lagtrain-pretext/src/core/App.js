import { CONF } from '../conf.js';
import { AssetManager } from '../managers/AssetManager.js';
import { AudioManager } from '../managers/AudioManager.js';
import { UIManager } from '../managers/UIManager.js';
import { Renderer } from './Renderer.js';

export class App {
  constructor() {
    this.assets = new AssetManager();
    this.audio = null;
    this.ui = null;
    this.renderer = null;
    this.activeSongId = 'song1';

    this.lastRenderedFrame = -1;
    this.isBuffering = false;

    this.animationFrameId = null;
    this.isStarting = false;

    this.renderLoop = this.renderLoop.bind(this);
  }

  init() {
    try {
      const songIds = Object.keys(CONF.SONGS);
      this.ui = new UIManager({
        onPlay: () => this.startPlaying(),
        onReset: () => this.resetSimulation(),
        onResize: () => this.handleResize(),
        onCanvasClick: () => this.togglePlay(),
        onSongChange: (songId) => this.switchSong(songId)
      });
      this.ui.setupSongOptions(songIds, this.activeSongId);
      this.loadSong(this.activeSongId);
    } catch (error) {
      const errEl = document.getElementById('loading');
      if (errEl) errEl.innerText = "Error loading resources";
      console.error("Initialization Error:", error);
    }
  }

  async loadSong(songId) {
    const song = CONF.SONGS[songId] || CONF.SONGS.song1;
    this.activeSongId = song.id;
    this.ui.setSongSelection(song.id);

    this.isBuffering = false;
    this.lastRenderedFrame = -1;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    const onProgress = (progress) => this.ui.updateProgress(progress);
    const onReady = () => this.onAssetsReady(song.id);

    this.assets.loadSong(song.id, onProgress, onReady);
  }

  onAssetsReady(songId) {
    const song = CONF.SONGS[songId] || CONF.SONGS.song1;

    if (!this.audio) {
      this.audio = new AudioManager(song.audio, () => {
        this.ui.showUIOnEnd();
        this.ui.showSceneSelector();
        this.lastRenderedFrame = -1;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      });
    } else {
      this.audio.setTrack(song.audio);
    }

    if (!this.renderer) {
      this.renderer = new Renderer(document.getElementById('canvas'), this.assets);
    } else {
      this.renderer.assets = this.assets;
    }

    this.renderer.handleResize();
    this.ui.showReadyState();
    this.ui.showSceneSelector();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.audio && this.audio.isPlaying) {
        this.audio.pause();
        this.ui.showReadyState();
        this.ui.showSceneSelector();
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      }
    });
  }

  handleResize() {
    if (!this.renderer) return;
    this.renderer.handleResize();
    
    if (this.audio && !this.audio.isPlaying && this.lastRenderedFrame > -1) {
      this.renderer.renderFrame(this.lastRenderedFrame);
    }
  }

  async switchSong(songId) {
    if (!songId || songId === this.activeSongId) return;

    this.audio?.pause();
    this.ui.showReadyState();
    this.loadSong(songId);
  }

  async startPlaying() {
    if (!this.audio || this.isStarting) return;

    this.isStarting = true;
    this.ui.hideSceneSelector();

    if (await this.audio.play()) {
      this.ui.hideUIForPlayback();

      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = requestAnimationFrame(this.renderLoop);
    }

    this.isStarting = false;
  }

  togglePlay() {
    if (!this.audio) return;
    if (this.audio.isPlaying) {
      this.audio.pause();
      this.ui.showReadyState();
      this.ui.showSceneSelector();
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    } else {
      this.startPlaying();
    }
  }

  resetSimulation() {
    if (!this.audio) return;
    this.audio.reset();
    this.lastRenderedFrame = -1;
    this.isBuffering = false;

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.renderer) this.renderer.clearScreen();
    this.ui.showReadyState();
    this.ui.showSceneSelector();
  }

  renderLoop() {
    if (!this.audio || !this.audio.isPlaying) return;
    
    const currentTime = this.audio.getCurrentTime();
    const targetFrame = Math.round(currentTime * CONF.FPS_VIDEO);
    const downloadedFrames = this.assets.frameOffsets.length;

    const duration = this.audio.audio.duration;
    const isNearEnd = duration && (duration - currentTime < 0.2);

    if (targetFrame >= downloadedFrames) {
      if (isNearEnd && downloadedFrames > 0) {
        if (this.lastRenderedFrame !== downloadedFrames - 1) {
          this.renderer.renderFrame(downloadedFrames - 1);
          this.lastRenderedFrame = downloadedFrames - 1;
        }
        this.animationFrameId = requestAnimationFrame(this.renderLoop);
        return;
      }

      if (!this.isBuffering) {
        this.audio.audio.pause();
        if (this.ui.loadingText) {
          this.ui.loadingText.innerText = "Buffering...";
          this.ui.loadingText.style.display = 'block';
        }
        this.isBuffering = true;
      }
      this.animationFrameId = requestAnimationFrame(this.renderLoop);
      return;
    }

    if (this.isBuffering) {
      if (downloadedFrames > targetFrame + (CONF.FPS_VIDEO * 1.5)) {
        this.audio.audio.play();
        if (this.ui.loadingText) this.ui.loadingText.style.display = 'none';
        this.isBuffering = false;
      } else {
        this.animationFrameId = requestAnimationFrame(this.renderLoop);
        return;
      }
    }

    if (targetFrame === this.lastRenderedFrame) {
      this.animationFrameId = requestAnimationFrame(this.renderLoop);
      return;
    }

    this.lastRenderedFrame = targetFrame;
    this.renderer.renderFrame(targetFrame);
    
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  }
}
