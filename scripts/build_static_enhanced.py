from pathlib import Path
import base64
import io
import re

from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageFile, ImageDraw

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "ktir-rkhis-store"
OUT = SITE / "assets" / "static-enhanced"
OUT.mkdir(parents=True, exist_ok=True)

# These 10 get a visibly redesigned e-commerce treatment in this build.
PREMIUM = {
    "291100","291311","291500","291501","291600",
    "403100","410000","411000","440101","450200"
}

# Products 251100 through 290100 use the generated replacement pack and are
# intentionally excluded here so this build cannot overwrite them.
TARGETS = [
    "291100","291311","291500","291501","291600","403100",
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
    work = ImageOps.contain(im, (1000, 1000), Image.Resampling.LANCZOS)
    px = work.load()
    w, h = work.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            center = -0.72 * x + h * 1.08
            if abs(y - center) < h * 0.14 and (mx - mn) < 38 and 75 < mx < 242:
                blend = 0.88
                px[x, y] = (
                    int(r + (255-r) * blend),
                    int(g + (255-g) * blend),
                    int(b + (255-b) * blend),
                )
    return work


def premium_canvas(im: Image.Image) -> Image.Image:
    """Make a visibly different, clean square e-commerce presentation."""
    size = 820

    # Soft background derived from the product photo, then washed toward white.
    bg = ImageOps.fit(im, (size, size), Image.Resampling.LANCZOS)
    bg = bg.filter(ImageFilter.GaussianBlur(30))
    bg = ImageEnhance.Brightness(bg).enhance(1.28)
    bg = ImageEnhance.Color(bg).enhance(0.72)
    wash = Image.new("RGB", (size, size), (250, 250, 252))
    bg = Image.blend(bg, wash, 0.58)

    # Foreground image sits on a rounded floating card.
    fitted = ImageOps.contain(im, (720, 560), Image.Resampling.LANCZOS)
    card_w = fitted.width + 54
    card_h = fitted.height + 54
    card = Image.new("RGBA", (card_w, card_h), (0, 0, 0, 0))
    mask = Image.new("L", (card_w, card_h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, card_w-1, card_h-1), radius=34, fill=255)

    white = Image.new("RGBA", (card_w, card_h), (255, 255, 255, 246))
    white.putalpha(mask)
    card.alpha_composite(white)
    card.alpha_composite(fitted.convert("RGBA"), ((card_w-fitted.width)//2, (card_h-fitted.height)//2))

    # Soft shadow under the card.
    shadow = Image.new("RGBA", (card_w+50, card_h+50), (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((25, 25, 25+card_w, 25+card_h), radius=38, fill=(0,0,0,55))
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))

    out = bg.convert("RGBA")
    sx = (size-shadow.width)//2
    sy = (size-shadow.height)//2 + 12
    out.alpha_composite(shadow, (sx, sy))
    cx = (size-card_w)//2
    cy = (size-card_h)//2 - 8
    out.alpha_composite(card, (cx, cy))

    # Thin highlight frame makes the change obvious but stays clean.
    draw = ImageDraw.Draw(out)
    draw.rounded_rectangle((18,18,size-19,size-19), radius=38, outline=(255,255,255,210), width=4)
    return out.convert("RGB")


built = []
failed = []
for code in TARGETS:
    try:
        try:
            if code not in source_b64:
                raise ValueError("catalogue source not found")
            im = decode_catalogue(code)
            w, h = im.size
            # Remove the catalogue description / price strip entirely.
            im = im.crop((0, 0, w, max(1, int(h * 0.61))))
            im = soften_watermark(im)
            im = ImageEnhance.Brightness(im).enhance(1.10)
            im = ImageEnhance.Contrast(im).enhance(1.18)
            im = ImageEnhance.Color(im).enhance(1.12)
            im = im.filter(ImageFilter.UnsharpMask(radius=1.45, percent=155, threshold=2))

            if code in PREMIUM:
                canvas = premium_canvas(im)
            else:
                canvas = Image.new("RGB", (760, 760), "white")
                fitted = ImageOps.contain(im, (715, 715), Image.Resampling.LANCZOS)
                canvas.paste(fitted, ((760-fitted.width)//2, (760-fitted.height)//2))
        except Exception as catalogue_error:
            canvas = read_fallback(code)
            if canvas is None:
                raise catalogue_error

        canvas.save(OUT / f"{code}.jpg", "JPEG", quality=91, optimize=True, progressive=True)
        built.append(code)
        print("BUILT", code, "PREMIUM" if code in PREMIUM else "STANDARD")
    except Exception as exc:
        failed.append(code)
        print("SKIPPED", code, repr(exc))

if not built:
    raise SystemExit("No static enhanced images could be built")

map_lines = ["(() => {", "  const m = {"]
for i, code in enumerate(built):
    comma = "," if i < len(built)-1 else ""
    map_lines.append(f'    "{code}": "assets/static-enhanced/{code}.jpg?v=20260826-static8"{comma}')
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
    '<script src="static-enhanced-images.js?v=20260826-static8"></script>\n  <script src="app.js?v=20260826-static8"></script>',
    html,
)
index.write_text(html, encoding="utf-8")

print("STATIC ENHANCED BUILT:", ",".join(built))
print("STATIC ENHANCED SKIPPED:", ",".join(failed) if failed else "none")
