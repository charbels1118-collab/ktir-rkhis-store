(() => {
  const TARGET = new Set([
    "251100","260100","260102","260211","260212","260215","261103","261400","281100","290100",
    "291100","291311","291500","291501","291600","403100","410000","411000","440101","450200",
    "470001","470100","470200","483600","483700","484810","484820","484821"
  ]);
  const P = window.PRODUCTS || [];
  const processed = new Map();

  const loadImage = src => new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });

  async function enhanceProduct(p) {
    if (!TARGET.has(p.code) || !p.image || processed.has(p.code)) return;
    try {
      const im = await loadImage(p.image);
      const sw = im.naturalWidth || im.width;
      const sh = im.naturalHeight || im.height;
      if (!sw || !sh) return;
      const looksLikeCatalogue = sh / sw > 0.82;
      const sourceH = looksLikeCatalogue ? Math.max(1, Math.floor(sh * 0.68)) : sh;
      const workW = 780;
      const workH = Math.max(1, Math.round(sourceH * workW / sw));
      const work = document.createElement('canvas');
      work.width = workW; work.height = workH;
      const wctx = work.getContext('2d', { willReadFrequently: true });
      wctx.drawImage(im, 0, 0, sw, sourceH, 0, 0, workW, workH);
      const data = wctx.getImageData(0, 0, workW, workH);
      const d = data.data;
      for (let y = 0; y < workH; y++) {
        for (let x = 0; x < workW; x++) {
          const i = (y * workW + x) * 4;
          const r = d[i], g = d[i+1], b = d[i+2];
          const max = Math.max(r,g,b), min = Math.min(r,g,b);
          const center = -0.72 * x + workH * 1.18;
          const inBand = Math.abs(y - center) < 105;
          const grey = (max - min) < 32 && max > 80 && max < 238;
          if (inBand && grey) {
            d[i]   = Math.min(255, r + (255-r) * 0.72);
            d[i+1] = Math.min(255, g + (255-g) * 0.72);
            d[i+2] = Math.min(255, b + (255-b) * 0.72);
          }
        }
      }
      wctx.putImageData(data, 0, 0);
      const out = document.createElement('canvas');
      out.width = 700; out.height = 700;
      const octx = out.getContext('2d');
      octx.fillStyle = '#fff'; octx.fillRect(0,0,700,700);
      octx.filter = 'brightness(1.05) contrast(1.10) saturate(1.10)';
      const scale = Math.min(660 / workW, 660 / workH);
      const dw = Math.round(workW * scale), dh = Math.round(workH * scale);
      octx.drawImage(work, (700-dw)/2, (700-dh)/2, dw, dh);
      octx.filter = 'none';
      const url = out.toDataURL('image/jpeg', 0.91);
      processed.set(p.code, url);
      p.image = url;
      forceRenderedCards();
    } catch (_) {}
  }

  function forceRenderedCards() {
    document.querySelectorAll('.product-card').forEach(card => {
      const code = card.querySelector('.code-badge')?.textContent?.trim();
      const url = processed.get(code);
      const img = card.querySelector('.image-wrap img');
      if (url && img && img.src !== url) img.src = url;
    });
    document.querySelectorAll('.cart-item').forEach(item => {
      const text = item.textContent || '';
      for (const [code,url] of processed) {
        if (text.includes(code)) {
          const img = item.querySelector('img');
          if (img && img.src !== url) img.src = url;
          break;
        }
      }
    });
  }

  (async () => {
    for (const p of P) {
      if (!TARGET.has(p.code)) continue;
      await enhanceProduct(p);
      await new Promise(r => setTimeout(r, 15));
    }
    forceRenderedCards();
  })();

  const grid = document.getElementById('productsGrid');
  if (grid) new MutationObserver(forceRenderedCards).observe(grid,{childList:true,subtree:true});
  const cart = document.getElementById('cartItems');
  if (cart) new MutationObserver(forceRenderedCards).observe(cart,{childList:true,subtree:true});
})();
