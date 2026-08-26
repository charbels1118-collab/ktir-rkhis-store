from pathlib import Path
import base64
import io
import json
import re

from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "ktir-rkhis-store"
PRODUCTS = SITE / "products.js"
OUT = SITE / "assets" / "static-enhanced"
OUT.mkdir(parents=True, exist_ok=True)

TARGETS = [
    "251100","260100","260102","260211","260212","260215","261103","261400",
    "281100","290100","291100","291311","291500","291501","291600","403100",
    "410000","411000","440101","450200","470001","470100","470200","483600",
    "483700","484810","484820","484821"
]

# Read the intact original catalogue entries instead of the later consolidated
# products.js image strings. Some consolidated base64 strings were corrupted by
# previous upload/transform passes, while these original catalogue files render
# correctly and are the authoritative source images.
source_b64 = {}
source_files = sorted((SITE / "catalog-batch1").glob("*.js"))
source_files += [SITE / "new-products.js"]
for src_file in source_files:
    if not src_file.exists():
        continue
    src_text = src_file.read_text(encoding="utf-8")
    for code in TARGETS:
        if code in source_b64:
            continue
        pattern = (
            rf'code\s*:\s*["\']{re.escape(code)}["\'].*?'
            rf'image\s*:\s*["\']data:image/(?:jpeg|jpg|png|webp);base64,([^"\']+)["\']'
        )
        m = re.search(pattern, src_text, re.S)
        if m:
            source_b64[code] = m.group(1)

missing_sources = [c for c in TARGETS if c not in source_b64]
if missing_sources:
    raise SystemExit("Original catalogue source missing for: " + ", ".join(missing_sources))


def decode_catalogue(code: str) -> Image.Image:
    payload = source_b64[code].strip()
    payload += "=" * (-len(payload) % 4)
    raw = base64.b64decode(payload)
    with Image.open(io.BytesIO(raw)) as source:
        source.load()
        return source.convert("RGB")


def soften_catalogue_watermark(im: Image.Image) -> Image.Image:
    work = ImageOps.contain(im, (900, 900), Image.Resampling.LANCZOS)
    px = work.load()
    w, h = work.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            center = -0.72 * x + h * 1.08
            if abs(y - center) < h * 0.13 and (mx - mn) < 34 and 85 < mx < 238:
                blend = 0.80
                px[x, y] = (
                    int(r + (255-r) * blend),
                    int(g + (255-g) * blend),
                    int(b + (255-b) * blend),
                )
    return work


for code in TARGETS:
    im = decode_catalogue(code)
    w, h = im.size

    # Catalogue template: the useful product photo is at the top; the lower
    # coloured Arabic description and price panels are removed permanently.
    photo_h = max(1, int(h * 0.61))
    im = im.crop((0, 0, w, photo_h))

    im = soften_catalogue_watermark(im)
    im = ImageEnhance.Brightness(im).enhance(1.08)
    im = ImageEnhance.Contrast(im).enhance(1.14)
    im = ImageEnhance.Color(im).enhance(1.10)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.35, percent=140, threshold=2))

    canvas = Image.new("RGB", (760, 760), "white")
    fitted = ImageOps.contain(im, (715, 715), Image.Resampling.LANCZOS)
    x = (760 - fitted.width) // 2
    y = (760 - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    canvas.save(OUT / f"{code}.jpg", "JPEG", quality=89, optimize=True, progressive=True)

map_lines = ["(() => {", "  const m = {"]
for i, code in enumerate(TARGETS):
    comma = "," if i < len(TARGETS) - 1 else ""
    map_lines.append(f'    "{code}": "assets/static-enhanced/{code}.jpg?v=20260826-static3"{comma}')
map_lines += [
    "  };",
    "  for (const p of (window.PRODUCTS || [])) if (m[p.code]) p.image = m[p.code];",
    "})();",
    ""
]
(SITE / "static-enhanced-images.js").write_text("\n".join(map_lines), encoding="utf-8")

index = SITE / "index.html"
html = index.read_text(encoding="utf-8")
html = re.sub(r'\n\s*<script src="enhance-rest-live\.js[^\"]*\"></script>', '', html)
html = re.sub(r'\n\s*<script src="static-enhanced-images\.js[^\"]*\"></script>', '', html)
html = re.sub(
    r'<script src="app\.js[^\"]*\"></script>',
    '<script src="static-enhanced-images.js?v=20260826-static3"></script>\n  <script src="app.js?v=20260826-static3"></script>',
    html,
)
index.write_text(html, encoding="utf-8")

print("Built static enhanced JPGs from original catalogue files:", ", ".join(TARGETS))
