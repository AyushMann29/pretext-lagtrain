"""
Extract frames from video and encode as RLE-compressed binary for Pretext rendering.

Binary format (all values are uint16, little-endian):
  Per frame:
    - numSegments (1 uint16)
    - For each segment: logicalY, colorType, logicalStartX, logicalEndX (4 uint16s)
      colorType: 0 = black area (JP text), 1 = white area (EN text)

Output: frames.bin written to the public/ directory.
"""

import cv2
import numpy as np
import struct
import sys
import os

try:
    from mutagen.mp3 import MP3
except ImportError:
    MP3 = None

LOGICAL_WIDTH = 1000
TEXT_ROWS = 120
FPS_TARGET = 30
THRESHOLD = 128


def get_audio_duration(video_path):
    audio_path = os.path.splitext(video_path)[0] + '.mp3'
    if not os.path.exists(audio_path):
        return None

    if MP3 is None:
        return None

    try:
        return MP3(audio_path).info.length
    except Exception:
        return None


def extract_frames(video_path, output_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Cannot open video {video_path}")
        sys.exit(1)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    source_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    audio_duration = get_audio_duration(video_path)
    if audio_duration:
        target_frame_count = max(1, round(audio_duration * FPS_TARGET))
    else:
        target_frame_count = None

    print(f"Video: {total_frames} frames @ {source_fps:.2f} fps")
    print(f"Target: {FPS_TARGET} fps, {LOGICAL_WIDTH}x{TEXT_ROWS} grid")
    if target_frame_count is not None:
        print(f"Audio duration target: {audio_duration:.2f}s -> {target_frame_count} frames")

    frame_data = bytearray()
    frame_count = 0
    source_index = 0
    target_index = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (LOGICAL_WIDTH, TEXT_ROWS), interpolation=cv2.INTER_AREA)
        binary = (resized >= THRESHOLD).astype(np.uint8)

        segments = []
        for y in range(TEXT_ROWS):
            row = binary[y]
            if len(row) == 0:
                continue

            x = 0
            while x < LOGICAL_WIDTH:
                color = int(row[x])
                start_x = x
                while x < LOGICAL_WIDTH and int(row[x]) == color:
                    x += 1
                end_x = x
                segments.append((y, color, start_x, end_x))

        next_target_index = int(round((source_index + 1) * FPS_TARGET / source_fps))
        repeat_count = max(1, next_target_index - target_index)

        if target_frame_count is not None and frame_count + repeat_count > target_frame_count:
            repeat_count = max(1, target_frame_count - frame_count)

        for _ in range(repeat_count):
            num_segments = len(segments)
            frame_data.extend(struct.pack('<H', num_segments))
            for y, color, start_x, end_x in segments:
                frame_data.extend(struct.pack('<HHHH', y, color, start_x, end_x))
            frame_count += 1
            target_index += 1

        source_index += 1
        progress = (source_index / total_frames) * 100
        if source_index % 50 == 0 or source_index == total_frames:
            print(f"\rEncoded frame {frame_count} ({progress:.1f}%)", end='', flush=True)

    cap.release()
    print()

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(frame_data)

    size_mb = len(frame_data) / (1024 * 1024)
    print(f"Done! {frame_count} frames encoded, {size_mb:.2f} MB written to {output_path}")


if __name__ == '__main__':
    video = sys.argv[1] if len(sys.argv) > 1 else 'song.mp4'
    output = sys.argv[2] if len(sys.argv) > 2 else 'public/frames.bin'
    extract_frames(video, output)
