(() => {
  const map = {
    "231204": "assets/generated-batch5/231204.webp?v=20260821-1113",
    "231300": "assets/generated-batch5/231300.webp?v=20260821-1113",
    "240100": "assets/generated-batch5/240100.webp?v=20260821-1113",
    "240200": "assets/generated-batch5/240200.webp?v=20260821-1113",
    "241201": "assets/generated-batch5/241201.webp?v=20260821-1113",
    "250200": "assets/generated-batch5/250200.webp?v=20260821-1113",
    "250206": "assets/generated-batch5/250206.webp?v=20260821-1113",
    "250243": "assets/generated-batch5/250243.webp?v=20260821-1113",
    "250245": "assets/generated-batch5/250245.webp?v=20260821-1113",
    "250300": "assets/generated-batch5/250300.webp?v=20260821-1113"
  };

  // Update product data first so every future render uses the new picture.
  for (const p of (window.PRODUCTS || [])) {
    if (map[p.code]) p.image = map[p.code];
  }

  function forceProductCards() {
    document.querySelectorAll('.product-card').forEach(card => {
      const code = card.querySelector('.code-badge')?.textContent?.trim();
      const img = card.querySelector('.image-wrap img');
      if (code && img && map[code] && img.getAttribute('src') !== map[code]) {
        img.src = map[code];
      }
    });

    // Keep cart thumbnails consistent too.
    document.querySelectorAll('.cart-item').forEach(item => {
      const text = item.textContent || '';
      for (const [code, src] of Object.entries(map)) {
        if (text.includes(code)) {
          const img = item.querySelector('img');
          if (img && img.getAttribute('src') !== src) img.src = src;
          break;
        }
      }
    });
  }

  forceProductCards();
  requestAnimationFrame(forceProductCards);
  setTimeout(forceProductCards, 250);
  setTimeout(forceProductCards, 1000);

  const grid = document.getElementById('productsGrid');
  if (grid) new MutationObserver(forceProductCards).observe(grid, {childList:true, subtree:true});
  const cart = document.getElementById('cartItems');
  if (cart) new MutationObserver(forceProductCards).observe(cart, {childList:true, subtree:true});
})();
