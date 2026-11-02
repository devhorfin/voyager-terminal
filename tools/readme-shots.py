# Builds the README gallery from headless screenshots (real renders, no drawing).
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
def jpg(name, dst, w=None):
    im = Image.open(f'{src}/{name}').convert('RGB')
    if w and im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(f'{out}/{dst}', quality=86, optimize=True, progressive=True)
for a, b in [('gate.png','gate.jpg'),('ch-0.png','launch.jpg'),('ch-0.667.png','now.jpg'),('ch-1.0.png','gliese.jpg'),('tm40k.png','plus40k.jpg'),('log.png','mission-log.jpg')]:
    jpg(a, b, 1280)
for a, b in [('id3-d-02.png','jupiter.jpg'),('id3-d-04.png','pale-blue-dot.jpg')]:
    im = Image.open(f'qa/{a}').convert('RGB'); im.save(f'{out}/{b}', quality=86, optimize=True, progressive=True)
# phone pair: two 430x932 renders side by side on black
l, r = Image.open(f'{src}/m-jup.png').convert('RGB'), Image.open(f'{src}/m-now.png').convert('RGB')
gap = 40; pair = Image.new('RGB', (l.width + r.width + gap * 3, max(l.height, r.height) + gap * 2), (0, 0, 0))
pair.paste(l, (gap, gap)); pair.paste(r, (l.width + gap * 2, gap)); pair.save(f'{out}/phone.jpg', quality=86, optimize=True, progressive=True)
og = Image.open('assets/og.png').convert('RGB'); og.save(f'{out}/banner.jpg', quality=88, optimize=True, progressive=True)
print('ok')
