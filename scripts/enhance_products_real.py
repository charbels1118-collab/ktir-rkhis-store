from pathlib import Path
import base64, io, re
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "ktir-rkhis-store"
TARGETS = ["211303","211701","220100","221102","230203","230210","230221","230300","230302","231202"]
OUT = SITE / "assets" / "enhanced-real"
OUT.mkdir(parents=True, exist_ok=True)

sources = list((SITE / "catalog-batch1").glob("*.js")) + [SITE / "products.js", SITE / "new-products.js"]
found = {}
for src in sources:
    if not src.exists():
        continue
    text = src.read_text(encoding="utf-8")
    for code in TARGETS:
        if code in found:
            continue
        pat = rf'code\s*:\s*["\']{re.escape(code)}["\'].*?image\s*:\s*["\']data:image/(?:jpeg|jpg|png|webp);base64,([^"\']+)["\']'
        m = re.search(pat, text, re.S)
        if m:
            found[code] = m.group(1)

missing = [c for c in TARGETS if c not in found]
if missing:
    raise SystemExit(f"Missing source images for: {missing}")

for code in TARGETS:
    raw = base64.b64decode(found[code])
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    w, h = im.size
    product_h = max(1, int(h * 0.70))
    im = im.crop((0, 0, w, product_h))
    im = ImageEnhance.Brightness(im).enhance(1.05)
    im = ImageEnhance.Contrast(im).enhance(1.12)
    im = ImageEnhance.Color(im).enhance(1.08)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=125, threshold=2))
    canvas = Image.new("RGB", (720, 720), "white")
    fitted = ImageOps.contain(im, (680, 680), Image.Resampling.LANCZOS)
    x = (720 - fitted.width) // 2
    y = (720 - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    canvas.save(OUT / f"{code}.jpg", "JPEG", quality=84, optimize=True, progressive=True)

mapping = ["(() => {", "  const m = {"]
for i, code in enumerate(TARGETS):
    comma = "," if i < len(TARGETS)-1 else ""
    mapping.append(f'    "{code}": "assets/enhanced-real/{code}.jpg?v=20260820-real"{comma}')
mapping += ["  };", "  for (const p of (window.PRODUCTS || [])) if (m[p.code]) p.image = m[p.code];", "})();", ""]
(SITE / "real-enhanced-batch4.js").write_text("\n".join(mapping), encoding="utf-8")

index = SITE / "index.html"
html = index.read_text(encoding="utf-8")
html = re.sub(r'\n\s*<script src="real-enhanced-batch4\.js[^\"]*\"></script>', '', html)
needle = '<script src="app.js?v=20260820-enhanced4"></script>'
replacement = '<script src="real-enhanced-batch4.js?v=20260820-real"></script>\n  <script src="app.js?v=20260820-real4"></script>'
if needle in html:
    html = html.replace(needle, replacement)
elif '<script src="app.js?v=20260820-real4"></script>' not in html:
    html = html.replace('</body>', '  <script src="real-enhanced-batch4.js?v=20260820-real"></script>\n  <script src="app.js?v=20260820-real4"></script>\n</body>')
index.write_text(html, encoding="utf-8")

print("Enhanced real JPGs:", ", ".join(TARGETS))
# trigger 2026-08-20
