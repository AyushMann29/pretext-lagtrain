export class UIManager {
  constructor(callbacks) {
    this.ui = document.getElementById('ui');
    this.loadingText = document.getElementById('loading');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressBar = document.getElementById('progressBar');
    this.btnPlay = document.getElementById('btnPlay');
    this.btnReset = document.getElementById('btnReset');
    this.songSelectorWrap = document.getElementById('songSelectorWrap');
    this.songSelect = document.getElementById('songSelect');

    this.callbacks = callbacks;
    this.resizeTimeout = null;

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.callbacks.onResize(), 150);
    });

    const bindEvent = (element, handler) => {
      if (!element) return;
      element.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        handler();
      }, { passive: false });
    };

    bindEvent(this.btnPlay, this.callbacks.onPlay);
    bindEvent(this.btnReset, this.callbacks.onReset);
    bindEvent(document.getElementById('canvas'), this.callbacks.onCanvasClick);

    if (this.songSelect) {
      this.songSelect.addEventListener('change', (event) => {
        if (this.callbacks.onSongChange) this.callbacks.onSongChange(event.target.value);
      });
    }
  }

  setupSongOptions(songIds, activeSongId) {
    if (!this.songSelect) return;

    this.songSelect.innerHTML = songIds
      .map((songId) => `<option value="${songId}">${songId === 'song1' ? 'Scene 1' : 'Scene 2'}</option>`)
      .join('');

    this.songSelect.value = activeSongId;
  }

  setSongSelection(songId) {
    if (this.songSelect) this.songSelect.value = songId;
  }

  updateProgress(progress) {
    const percentage = Math.min(100, Math.floor(progress * 100));

    if (this.loadingText) this.loadingText.innerText = `Loading resources... ${percentage}%`;
    if (this.progressBar) this.progressBar.style.width = `${percentage}%`;
  }

  showReadyState() {
    if (this.loadingText) this.loadingText.style.display = 'none';
    if (this.progressContainer) this.progressContainer.style.display = 'none';

    this.ui.style.display = 'flex';
    this.ui.style.opacity = '1';

    if (this.btnPlay) this.btnPlay.style.display = 'block';
    if (this.btnReset) this.btnReset.style.display = 'block';
  }

  hideUIForPlayback() {
    this.ui.style.opacity = '0';
    this.hideSceneSelector();
    setTimeout(() => this.ui.style.display = 'none', 300);
  }

  showUIOnEnd() {
    this.ui.style.display = 'flex';
    this.ui.style.opacity = '1';
    this.showSceneSelector();
  }

  showSceneSelector() {
    if (this.songSelectorWrap) {
      this.songSelectorWrap.style.display = 'flex';
      this.songSelectorWrap.style.visibility = 'visible';
      this.songSelectorWrap.style.opacity = '1';
      this.songSelectorWrap.style.pointerEvents = 'auto';
    }
    if (this.songSelect) {
      this.songSelect.style.opacity = '1';
      this.songSelect.style.pointerEvents = 'auto';
    }
  }

  hideSceneSelector() {
    if (this.songSelectorWrap) {
      this.songSelectorWrap.style.display = 'none';
      this.songSelectorWrap.style.visibility = 'hidden';
      this.songSelectorWrap.style.opacity = '0';
      this.songSelectorWrap.style.pointerEvents = 'none';
    }
    if (this.songSelect) {
      this.songSelect.style.opacity = '0';
      this.songSelect.style.pointerEvents = 'none';
    }
  }
}
