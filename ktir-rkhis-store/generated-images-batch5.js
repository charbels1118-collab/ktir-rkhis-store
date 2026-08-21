// Product image overrides for generated batch 5.
// Images are loaded from assets/generated-batch5/ and applied before app.js.
(() => {
  const map = {
    "231204": "assets/generated-batch5/231204.webp?v=20260821",
    "231300": "assets/generated-batch5/231300.webp?v=20260821",
    "240100": "assets/generated-batch5/240100.webp?v=20260821",
    "240200": "assets/generated-batch5/240200.webp?v=20260821",
    "241201": "assets/generated-batch5/241201.webp?v=20260821",
    "250200": "assets/generated-batch5/250200.webp?v=20260821",
    "250206": "assets/generated-batch5/250206.webp?v=20260821",
    "250243": "assets/generated-batch5/250243.webp?v=20260821",
    "250245": "assets/generated-batch5/250245.webp?v=20260821",
    "250300": "assets/generated-batch5/250300.webp?v=20260821"
  };
  for (const p of (window.PRODUCTS || [])) if (map[p.code]) p.image = map[p.code];
})();
