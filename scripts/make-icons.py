# Dev-only (not shipped): writes the app icons into icons/ from the owner's logo.
# Run: python scripts/make-icons.py   (needs Pillow; nothing is installed into the project)
# Source design-reference/lockin-logo-gray.png (1254 px) stays local and is never shipped.
# Every icon is a full-bleed opaque RGB square; iOS applies its own rounded mask.
# 48 px and up: the full logo. 32 and 16 px favicons: the solid gold outline variant (owner-approved),
# because the full helmet's inner lines turn to noise at those sizes.
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design-reference' / 'lockin-logo-gray.png'
OUT = ROOT / 'icons'
import sys
# 1024 is not shipped (1 MB in the offline cache); pass --1024 to generate it on demand.
FULL = ([1024] if '--1024' in sys.argv else []) + [512, 192, 180, 167, 152, 120, 60, 48]
FAVICON = [32, 16]
FIELD = (0x25, 0x25, 0x28)  # the logo's own gray field
GOLD = (0xF4, 0xB6, 0x53)   # the logo's bright gold


def outline_variant(logo):
    """Solid gold silhouette of the helmet on the logo's field (gold strokes + black helmet, gaps closed)."""
    r, _, b = logo.split()
    warm = ImageChops.subtract(r, b).point(lambda v: 255 if v > 45 else 0)
    dark = logo.convert('L').point(lambda v: 255 if v < 22 else 0)
    figure = ImageChops.lighter(warm, dark).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    out = Image.new('RGB', logo.size, FIELD)
    out.paste(Image.new('RGB', logo.size, GOLD), mask=figure)
    return out


def save(img, size, name):
    icon = img.resize((size, size), Image.LANCZOS, reducing_gap=3.0).convert('RGB')
    icon.save(OUT / name, optimize=True)
    return name


logo = Image.open(SRC).convert('RGB')
assert logo.width == logo.height, 'logo must be square'
OUT.mkdir(exist_ok=True)
written = [save(logo, s, f'icon-{s}.png') for s in FULL]
small = outline_variant(logo)
written += [save(small, s, f'favicon-{s}.png') for s in FAVICON]
print('Wrote', ', '.join(f'icons/{n}' for n in written))
