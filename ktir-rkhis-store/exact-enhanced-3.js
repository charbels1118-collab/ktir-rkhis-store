(() => {
  const P = window.PRODUCTS || [];
  const fileMap = {
    "999139":"assets/enhanced3/999139.svg",
    "999065":"assets/enhanced3/999065.svg",
    "999151":"assets/enhanced3/999151.svg",
    "999155":"assets/enhanced3/999155.svg",
    "290400":"assets/enhanced3/290400.svg",
    "999204":"assets/enhanced3/999204.svg"
  };
  const embedded = new Set(["200000","201200","201208","211300"]);
  const enhanceEmbedded = src => {
    const safe = String(src || "").replace(/&/g,"&amp;").replace(/\"/g,"&quot;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><clipPath id="c"><rect width="1000" height="1000" rx="28"/></clipPath><filter id="f"><feColorMatrix type="saturate" values="1.12"/><feComponentTransfer><feFuncR type="linear" slope="1.08" intercept="-0.025"/><feFuncG type="linear" slope="1.08" intercept="-0.025"/><feFuncB type="linear" slope="1.08" intercept="-0.025"/></feComponentTransfer></filter></defs><rect width="1000" height="1000" fill="white"/><g clip-path="url(#c)" filter="url(#f)" transform="translate(-70,-28) scale(1.14)"><image href="${safe}" width="1000" height="1000" preserveAspectRatio="xMidYMid slice"/></g></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
  for (const p of P) {
    if (fileMap[p.code]) p.image = fileMap[p.code];
    else if (embedded.has(p.code) && String(p.image || "").startsWith("data:image/")) p.image = enhanceEmbedded(p.image);
  }
})();
