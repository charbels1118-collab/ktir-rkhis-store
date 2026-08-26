from pathlib import Path
import base64
import io
import re

from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "ktir-rkhis-store"
OUT = SITE / "assets" / "static-enhanced"
OUT.mkdir(parents=True, exist_ok=True)

TARGETS = [
    "251100","260100","260102","260211","260212","260215","261103","261400",
    "281100","290100","291100","291311","291500","291501","291600","403100",
    "410000","411000","440101","450200","470001","470100","470200","483600",
    "483700","484810","484820","484821"
]

source_b64 = {}
for src_file in sorted((SITE / "catalog-batch1").glob("*.js")) + [SITE / "new-products.js"]:
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


def decode_bytes(payload: str) -> bytes:
    payload = payload.strip()
    payload += "=" * (-len(payload) % 4)
    return base64.b64decode(payload)


def decode_catalogue(code: str) -> Image.Image:
    raw = decode_bytes(source_b64[code])
    with Image.open(io.BytesIO(raw)) as source:
        source.load()
        return source.convert("RGB")


def read_fallback(code: str) -> Image.Image | None:
    # Prefer the compact fallback when present; this avoids GitHub/API
    # truncation of a legacy oversized base64 text fallback.
    candidates = [
        OUT / f"{code}-small.jpg.b64",
        OUT / f"{code}.jpg.b64",
    ]
    for fallback in candidates:
        if not fallback.exists():
            continue
        try:
            raw = decode_bytes(fallback.read_text(encoding="utf-8"))
            with Image.open(io.BytesIO(raw)) as source:
                source.load()
                return source.convert("RGB")
        except Exception:
            continue
    return None


def soften_watermark(im: Image.Image) -> Image.Image:
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


built = []
failed = []
for code in TARGETS:
    try:
        try:
            if code not in source_b64:
                raise ValueError("catalogue source not found")
            im = decode_catalogue(code)
            w, h = im.size
            im = im.crop((0, 0, w, max(1, int(h * 0.61))))
            im = soften_watermark(im)
            im = ImageEnhance.Brightness(im).enhance(1.08)
            im = ImageEnhance.Contrast(im).enhance(1.14)
            im = ImageEnhance.Color(im).enhance(1.10)
            im = im.filter(ImageFilter.UnsharpMask(radius=1.35, percent=140, threshold=2))

            canvas = Image.new("RGB", (760, 760), "white")
            fitted = ImageOps.contain(im, (715, 715), Image.Resampling.LANCZOS)
            canvas.paste(fitted, ((760-fitted.width)//2, (760-fitted.height)//2))
        except Exception as catalogue_error:
            canvas = read_fallback(code)
            if canvas is None:
                raise catalogue_error

        canvas.save(OUT / f"{code}.jpg", "JPEG", quality=89, optimize=True, progressive=True)
        built.append(code)
        print("BUILT", code)
    except Exception as exc:
        failed.append(code)
        print("SKIPPED", code, repr(exc))

if not built:
    raise SystemExit("No static enhanced images could be built")

map_lines = ["(() => {", "  const m = {"]
for i, code in enumerate(built):
    comma = "," if i < len(built)-1 else ""
    map_lines.append(f'    "{code}": "assets/static-enhanced/{code}.jpg?v=20260826-static6"{comma}')
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
    '<script src="static-enhanced-images.js?v=20260826-static6"></script>\n  <script src="app.js?v=20260826-static6"></script>',
    html,
)
index.write_text(html, encoding="utf-8")

print("STATIC ENHANCED BUILT:", ",".join(built))
print("STATIC ENHANCED SKIPPED:", ",".join(failed) if failed else "none")
