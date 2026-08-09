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

LOGICAL_WIDTH = 1000
TEXT_ROWS = 120
FPS_TARGET = 30
THRESHOLD = 128


def extract_frames(video_path, output_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Cannot open video {video_path}")
        sys.exit(1)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    source_fps = cap.get(cv2.CAP_PROP_FPS)
    print(f"Video: {total_frames} frames @ {source_fps:.2f} fps")
    print(f"Target: {FPS_TARGET} fps, {LOGICAL_WIDTH}x{TEXT_ROWS} grid")

    frame_interval = source_fps / FPS_TARGET
    frame_data = bytearray()
    frame_count = 0
    processed = 0

    if frame_interval >= 1:
        step = int(round(frame_interval))
        step = max(step, 1)
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            processed += 1
            if processed % step != 1:
                continue

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

            num_segments = len(segments)
            frame_data.extend(struct.pack('<H', num_segments))
            for y, color, start_x, end_x in segments:
                frame_data.extend(struct.pack('<HHHH', y, color, start_x, end_x))

            frame_count += 1
            progress = frame_count / (total_frames / step) * 100
            print(f"\rEncoded frame {frame_count} ({progress:.1f}%)", end='', flush=True)
    else:
        dup_factor = int(round(1.0 / frame_interval))
        dup_factor = max(dup_factor, 1)
        total_output_frames = int(total_frames * dup_factor)
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            processed += 1

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

            num_segments = len(segments)
            for _ in range(dup_factor):
                frame_data.extend(struct.pack('<H', num_segments))
                for y, color, start_x, end_x in segments:
                    frame_data.extend(struct.pack('<HHHH', y, color, start_x, end_x))

            frame_count += dup_factor
            progress = frame_count / total_output_frames * 100
            print(f"\rEncoded frame {frame_count} ({progress:.1f}%)", end='', flush=True)

    cap.release()
    print()

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(frame_data)

    size_mb = len(frame_data) / (1024 * 1024)
    print(f"Done! {frame_count} frames encoded, {size_mb:.2f} MB written to {output_path}")


if __name__ == '__main__':
    video = sys.argv[1] if len(sys.argv) > 1 else '../song.mp4'
    output = sys.argv[2] if len(sys.argv) > 2 else 'public/frames.bin'
    extract_frames(video, output)
