export class AudioManager {
  constructor(onEndedCallback) {
    this.audio = new Audio('song.mp3');
    this.isPlaying = false;

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.audio.currentTime = 0;
      if (onEndedCallback) onEndedCallback();
    });
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
