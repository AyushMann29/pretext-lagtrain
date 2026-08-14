export class AudioManager {
  constructor(songPath, onEndedCallback) {
    this.onEndedCallback = onEndedCallback;
    this.audio = new Audio(songPath || 'song1.mp3');
    this.isPlaying = false;

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.audio.currentTime = 0;
      if (this.onEndedCallback) this.onEndedCallback();
    });
  }

  setTrack(songPath) {
    this.pause();
    this.audio.src = songPath || 'song1.mp3';
    this.audio.load();
    this.audio.currentTime = 0;
    this.isPlaying = false;
  }

  async play() {
    try {
      await this.audio.play();
      this.isPlaying = true;
      return true;
    } catch (err) {
      console.warn("Playback blocked by browser policy:", err);
      this.isPlaying = false;
      return false;
    }
  }

  pause() {
    this.audio.pause();
    this.isPlaying = false;
  }

  reset() {
    this.pause();
    this.audio.currentTime = 0;
  }

  getCurrentTime() {
    return this.audio.currentTime;
  }
}
