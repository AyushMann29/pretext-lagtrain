export class UIManager {
  constructor(callbacks) {
    this.ui = document.getElementById('ui');
    this.loadingText = document.getElementById('loading');
    this.progressContainer = document.getElementById('progressContainer');
    this.progressBar = document.getElementById('progressBar');
    this.btnPlay = document.getElementById('btnPlay');
    this.btnReset = document.getElementById('btnReset');
    
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
    setTimeout(() => this.ui.style.display = 'none', 300);
  }

  showUIOnEnd() {
    this.ui.style.display = 'flex';
    this.ui.style.opacity = '1';
  }
}
