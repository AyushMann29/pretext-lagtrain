import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext';
import { CONF } from '../conf.js';

export class Renderer {
  constructor(canvasElement, assetManager) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.assets = assetManager;

    this.physicalScaleX = 1;
    this.physicalLineHeight = 1;
    
    this.drawOps = {
      whiteRects: [],
      textEN: [],
      textJP: []
    };
  }

  handleResize() {
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;

    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;

    const dpr = window.devicePixelRatio || 1;
    const physWidth = Math.floor(cssWidth * dpr);
    const physHeight = Math.floor(cssHeight * dpr);

    this.canvas.width = physWidth;
    this.canvas.height = physHeight;

    this.physicalScaleX = physWidth / CONF.LOGICAL_WIDTH;
    this.physicalLineHeight = physHeight / CONF.TEXT_ROWS;

    const fontSize = Math.floor(this.physicalLineHeight * 0.95);
    this.currentFontEN = `bold ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    this.currentFontJP = `bold ${fontSize}px "Noto Sans JP", sans-serif`;

    if (this.assets.rawTextEN && this.assets.rawTextJP) {
      this.preparedEN = prepareWithSegments(this.assets.rawTextEN, this.currentFontEN);
      this.preparedJP = prepareWithSegments(this.assets.rawTextJP, this.currentFontJP);
    }
  }

  clearScreen() {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderFrame(targetFrame) {
    if (targetFrame >= this.assets.frameOffsets.length) return;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.clearScreen();

    const offset = this.assets.frameOffsets[targetFrame];
    const numSegments = this.assets.uint16Data[offset];
    let ptr = offset + 1;

    let cursorEN = { segmentIndex: 0, graphemeIndex: 0 };
    let cursorJP = { segmentIndex: 0, graphemeIndex: 0 };

    this.drawOps.whiteRects.length = 0;
    this.drawOps.textEN.length = 0;
    this.drawOps.textJP.length = 0;

    for (let i = 0; i < numSegments; i++) {
      const logicalY = this.assets.uint16Data[ptr++];
      const colorType = this.assets.uint16Data[ptr++];
      const logicalStartX = this.assets.uint16Data[ptr++];
      const logicalEndX = this.assets.uint16Data[ptr++];

      const startX = Math.floor(logicalStartX * this.physicalScaleX);
      const endX = Math.floor(logicalEndX * this.physicalScaleX);
      const realY = Math.floor(logicalY * this.physicalLineHeight);
      const segmentWidth = endX - startX;

      if (segmentWidth <= 0) continue;

      if (colorType === 1) {
        this.drawOps.whiteRects.push([startX, realY, segmentWidth]);

        let line = layoutNextLine(this.preparedEN, cursorEN, segmentWidth);
        if (!line) {
          cursorEN = { segmentIndex: 0, graphemeIndex: 0 };
          line = layoutNextLine(this.preparedEN, cursorEN, segmentWidth);
        }
        if (line) {
          this.drawOps.textEN.push([line.text, startX, realY]);
          cursorEN = line.end;
        }
      } else {
        let line = layoutNextLine(this.preparedJP, cursorJP, segmentWidth);
        if (!line) {
          cursorJP = { segmentIndex: 0, graphemeIndex: 0 };
          line = layoutNextLine(this.preparedJP, cursorJP, segmentWidth);
        }
        if (line) {
          this.drawOps.textJP.push([line.text, startX, realY]);
          cursorJP = line.end;
        }
      }
    }

    this.executeDrawBatch();
  }

  executeDrawBatch() {
    this.ctx.textBaseline = 'top';
    const h = Math.ceil(this.physicalLineHeight);

    const whiteLen = this.drawOps.whiteRects.length;
    if (whiteLen > 0) {
      this.ctx.fillStyle = 'white';
      for (let i = 0; i < whiteLen; i++) {
        const r = this.drawOps.whiteRects[i];
        this.ctx.fillRect(r[0], r[1], r[2], h);
      }
    }

    const enLen = this.drawOps.textEN.length;
    if (enLen > 0) {
      this.ctx.fillStyle = 'black';
      this.ctx.font = this.currentFontEN;
      for (let i = 0; i < enLen; i++) {
        const t = this.drawOps.textEN[i];
        this.ctx.fillText(t[0], t[1], t[2]);
      }
    }

    const jpLen = this.drawOps.textJP.length;
    if (jpLen > 0) {
      this.ctx.fillStyle = 'white';
      this.ctx.font = this.currentFontJP;
      for (let i = 0; i < jpLen; i++) {
        const t = this.drawOps.textJP[i];
        this.ctx.fillText(t[0], t[1], t[2]);
      }
    }
  }
}
