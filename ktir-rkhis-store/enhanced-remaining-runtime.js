(() => {
  const targets = new Set([
    "999139","999065","999151","999155","290400","999204","470100","470200",
    "483600","483700","260100","260102","260211","260212","484810","484820",
    "484821","260215","261103","261400","281100","230210","230221","230300",
    "230302","211701","220100","221102","230203","290100","291100","291311",
    "291500","200000","291501","291600","403100","410000","201200","201208",
    "211300","211303","411000","440101","450200","470001","251100","231202"
  ]);
  const fallback = {
    "999139":"assets/999139.jpg","999065":"assets/999065.jpg","999151":"assets/999151.svg",
    "999155":"assets/999155.jpg","290400":"assets/290400.jpg","999204":"assets/999204.svg"
  };
  const esc = s => String(s || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;");
  const enhance = src => {
    const safe = esc(src);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
      <defs>
        <radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f4f6f8"/></radialGradient>
        <filter id="fx" x="-10%" y="-10%" width="120%" height="120%">
          <feColorMatrix type="saturate" values="1.16"/>
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.10" intercept="-0.025"/>
            <feFuncG type="linear" slope="1.10" intercept="-0.025"/>
            <feFuncB type="linear" slope="1.10" intercept="-0.025"/>
          </feComponentTransfer>
        </filter>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-opacity="0.14"/></filter>
        <clipPath id="clip"><rect x="22" y="22" width="956" height="956" rx="36"/></clipPath>
      </defs>
      <rect width="1000" height="1000" fill="url(#bg)"/>
      <g clip-path="url(#clip)" filter="url(#shadow)">
        <g filter="url(#fx)" transform="translate(-145,-45) scale(1.29)">
          <image href="${safe}" width="1000" height="1000" preserveAspectRatio="xMidYMin meet"/>
        </g>
      </g>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
  for (const p of (window.PRODUCTS || [])) {
    if (!targets.has(p.code)) continue;
    const src = p.image || fallback[p.code];
    if (src) p.image = enhance(src);
  }
})();
