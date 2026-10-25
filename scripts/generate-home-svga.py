"""Generate original vector-only SVGA 2.0 ticket artwork (no external images).
Wire fields follow https://github.com/svga/SVGA-Format/blob/master/proto/svga.proto.
Run: python3 scripts/generate-home-svga.py
"""
import math
import struct
import zlib
from pathlib import Path


def varint(value):
    data = bytearray()
    while value > 127:
        data.append((value & 127) | 128)
        value >>= 7
    data.append(value)
    return bytes(data)


def integer(field, value):
    return varint(field << 3) + varint(value)


def number(field, value):
    return varint((field << 3) | 5) + struct.pack('<f', value)


def message(field, value):
    if isinstance(value, str):
        value = value.encode()
    return varint((field << 3) | 2) + varint(len(value)) + value


def transform(a=1, b=0, c=0, d=1, tx=0, ty=0):
    return b''.join(number(i + 1, v) for i, v in enumerate([a, b, c, d, tx, ty]))


color = b''.join(number(i + 1, v) for i, v in enumerate([.91, .87, .77, 1]))
style = message(2, color) + number(3, 1.4)
identity = transform()
path = 'M25 38 L95 38 L95 49 Q84 50 84 60 Q84 70 95 71 L95 82 L25 82 L25 71 Q36 70 36 60 Q36 50 25 49 Z M69 41 L69 79 M44 52 L59 52 M44 59 L57 59 M44 67 L59 67'
shape = integer(1, 0) + message(2, message(1, path)) + message(10, style) + message(11, identity)
ring = integer(1, 2) + message(4, number(1, 60) + number(2, 60) + number(3, 53) + number(4, 53)) + message(10, style) + message(11, identity)
frames = []
for frame in range(90):
    t = frame / 90 * math.tau
    angle = math.sin(t) * .14
    scale = 1 + math.sin(t) * .035
    a, b = math.cos(angle) * scale, math.sin(angle) * scale
    matrix = transform(a, b, -b, a, 60 - 60 * a + 60 * b, 60 - 60 * b - 60 * a)
    layout = number(3, 120) + number(4, 120)
    frames.append(message(2, number(1, 1) + message(2, layout) + message(3, matrix) + message(5, shape) + message(5, ring)))
sprite = message(1, 'tixflow-ticket.vector') + b''.join(frames)
params = number(1, 120) + number(2, 120) + integer(3, 30) + integer(4, 90)
movie = message(1, '2.0') + message(2, params) + message(4, sprite)
out = Path('apps/web/public/assets/animations/tixflow-ticket.svga')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(zlib.compress(movie))
print(f'Generated {out}: {out.stat().st_size} bytes, 90 frames, vector-only')
