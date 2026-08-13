import { CONF } from '../conf.js';

export class AssetManager {
  constructor() {
    this.rawTextEN = '';
    this.rawTextJP = '';
    this.uint16Data = null;
    this.frameOffsets = [];

    this.isLittleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
  }

  async loadSong(songId, onProgress, onReady) {
    const song = CONF.SONGS[songId] || CONF.SONGS.song1;

    this.rawTextEN = '';
    this.rawTextJP = '';
    this.uint16Data = null;
    this.frameOffsets = [];

    try {
      const [resEN, resJP] = await Promise.all([
        fetch(song.lyricsEN),
        fetch(song.lyricsJP)
      ]);

      if (!resEN.ok || !resJP.ok) throw new Error(`Failed to load text assets for ${songId}`);

      this.rawTextEN = await resEN.text();
      this.rawTextJP = new TextDecoder('utf-8').decode(await resJP.arrayBuffer());

      const resBin = await fetch(song.frames);
      if (!resBin.ok) throw new Error(`HTTP Error: ${resBin.status} on ${song.frames}`);

      const contentLength = parseInt(resBin.headers.get('content-length'), 10) || (5 * 1024 * 1024);
      await this.loadStream(resBin, contentLength, onProgress, onReady);
    } catch (error) {
      console.error("Asset Load Aborted:", error);
      throw error;
    }
  }

  async loadAll(onProgress, onReady) {
    return this.loadSong('song1', onProgress, onReady);
  }

  async loadStream(resBin, initialLength, onProgress, onReady) {
    let currentCapacity = initialLength;
    let buffer = new ArrayBuffer(currentCapacity);
    let uint8View = new Uint8Array(buffer);
    this.uint16Data = new Uint16Array(buffer);
    
    const reader = resBin.body.getReader();
    let bytesRead = 0;
    let parsedPtr = 0;
    let framesParsed = 0;
    let readyFired = false;
    let lastSwappedByte = 0;
    
    let estimatedTotal = initialLength;
    const MIN_FRAMES_TO_PLAY = CONF.FPS_VIDEO * 5;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        if (onProgress) onProgress(1.0);
        break;
      }

      if (bytesRead + value.length > currentCapacity) {
        currentCapacity = Math.max(currentCapacity * 2, bytesRead + value.length + (1024 * 1024));
        const newBuffer = new ArrayBuffer(currentCapacity);
        const newUint8View = new Uint8Array(newBuffer);
        newUint8View.set(uint8View.subarray(0, bytesRead));
        
        buffer = newBuffer;
        uint8View = newUint8View;
        this.uint16Data = new Uint16Array(buffer);
      }

      uint8View.set(value, bytesRead);
      bytesRead += value.length;

      if (!this.isLittleEndian) {
        const swappableBytes = Math.floor(bytesRead / 2) * 2;
        for (let i = lastSwappedByte; i < swappableBytes; i += 2) {
          const temp = uint8View[i];
          uint8View[i] = uint8View[i + 1];
          uint8View[i + 1] = temp;
        }
        lastSwappedByte = swappableBytes;
      }

      const availableUint16 = Math.floor(bytesRead / 2);

      while (parsedPtr < availableUint16) {
        const numSegments = this.uint16Data[parsedPtr];
        const frameLength = 1 + (numSegments * 4);

        if (parsedPtr + frameLength <= availableUint16) {
          this.frameOffsets.push(parsedPtr);
          parsedPtr += frameLength;
          framesParsed++;
        } else {
          break;
        }
      }

      if (onProgress) {
        if (bytesRead > estimatedTotal) estimatedTotal = bytesRead * 1.5;
        onProgress(Math.min(bytesRead / estimatedTotal, 0.99));
      }

      if (!readyFired && framesParsed >= MIN_FRAMES_TO_PLAY) {
        readyFired = true;
        if (onReady) onReady();
      }
    }

    if (!readyFired && onReady) onReady();
  }
}
