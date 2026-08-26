from pathlib import Path
import base64
import io
import json
import re

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "ktir-rkhis-store"
PRODUCTS = SITE / "products.js"
OUT = SITE / "assets" / "static-enhanced"
OUT.mkdir(parents=True, exist_ok=True)

# These are the catalogue-style photos that were still visibly unchanged.
TARGETS = [
    "251100","260100","260102","260211","260212","260215","261103","261400",
    "281100","290100","291100","291311","291500","291501","291600","403100",
    "410000","411000","440101","450200","470001","470100","470200","483600",
    "483700","484810","484820","484821"
]

text = PRODUCTS.read_text(encoding="utf-8")
start = text.find("[")
end = text.rfind("]")
if start < 0 or end < start:
    raise SystemExit("Could not parse products.js")
products = json.loads(text[start:end + 1])
by_code = {str(p.get("code")): p for p in products}


def open_source(src: str) -> Image.Image:
    if src.startswith("data:image/"):
        payload = src.split(",", 1)[1]
        return Image.open(io.BytesIO(base64.b64decode(payload))).convert("RGB")
    clean = src.split("?", 1)[0]
    path = SITE / clean
    return Image.open(path).convert("RGB")


def soften_catalogue_watermark(im: Image.Image) -> Image.Image:
    # Work at a moderate resolution. The catalogue watermark is a low-saturation
    # grey diagonal; lighten only those pixels inside its usual diagonal band.
    work = ImageOps.contain(im, (900, 900), Image.Resampling.LANCZOS)
    px = work.load()
    w, h = work.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            # Broad diagonal running bottom-left to upper-right.
            center = -0.72 * x + h * 1.08
            if abs(y - center) < h * 0.13 and (mx - mn) < 34 and 85 < mx < 238:
                blend = 0.78
                px[x, y] = (
                    int(r + (255-r) * blend),
                    int(g + (255-g) * blend),
                    int(b + (255-b) * blend),
                )
    return work


missing = []
for code in TARGETS:
    p = by_code.get(code)
    if not p or not p.get("image"):
        missing.append(code)
        continue

    im = open_source(str(p["image"]))
    w, h = im.size

    # The original catalogue template places the actual product photo in the
    # upper ~61% and the coloured description/price card below it. Remove the
    # lower catalogue section completely, making a visibly different image.
    if h / max(w, 1) > 0.82:
        photo_h = max(1, int(h * 0.61))
        im = im.crop((0, 0, w, photo_h))

    im = soften_catalogue_watermark(im)
    im = ImageEnhance.Brightness(im).enhance(1.07)
    im = ImageEnhance.Contrast(im).enhance(1.13)
    im = ImageEnhance.Color(im).enhance(1.10)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.3, percent=135, threshold=2))

    canvas = Image.new("RGB", (760, 760), "white")
    fitted = ImageOps.contain(im, (710, 710), Image.Resampling.LANCZOS)
    x = (760 - fitted.width) // 2
    y = (760 - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    canvas.save(OUT / f"{code}.jpg", "JPEG", quality=88, optimize=True, progressive=True)

if missing:
    raise SystemExit("Missing source images: " + ", ".join(missing))

# Override product image paths BEFORE app.js renders the product cards.
map_lines = ["(() => {", "  const m = {"]
for i, code in enumerate(TARGETS):
    comma = "," if i < len(TARGETS) - 1 else ""
    map_lines.append(f'    "{code}": "assets/static-enhanced/{code}.jpg?v=20260826-static"{comma}')
map_lines += [
    "  };",
    "  for (const p of (window.PRODUCTS || [])) if (m[p.code]) p.image = m[p.code];",
    "})();",
    ""
]
(SITE / "static-enhanced-images.js").write_text("\n".join(map_lines), encoding="utf-8")

# Build the deploy-time HTML. Remove the old browser-side enhancer and load
# the static mapping before app.js so the new JPGs are used from first render.
index = SITE / "index.html"
html = index.read_text(encoding="utf-8")
html = re.sub(r'\n\s*<script src="enhance-rest-live\.js[^\"]*\"></script>', '', html)
html = re.sub(r'\n\s*<script src="static-enhanced-images\.js[^\"]*\"></script>', '', html)
html = re.sub(r'<script src="app\.js[^\"]*\"></script>',
              '<script src="static-enhanced-images.js?v=20260826-static"></script>\n  <script src="app.js?v=20260826-static"></script>',
              html)
index.write_text(html, encoding="utf-8")

print(f"Built {len(TARGETS)} static enhanced JPGs")
