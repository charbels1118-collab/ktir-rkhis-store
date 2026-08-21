(() => {
  const target = new Set(["211303","211701","220100","221102","230203","230210","230221","230300","230302","231202"]);
  const clean = src => {
    const safe = String(src || "").replace(/&/g,"&amp;").replace(/\"/g,"&quot;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><clipPath id="clip"><rect width="1000" height="1000" rx="26"/></clipPath><filter id="clean" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="saturate" values="1.22"/><feComponentTransfer><feFuncR type="linear" slope="1.13" intercept="-0.04"/><feFuncG type="linear" slope="1.13" intercept="-0.04"/><feFuncB type="linear" slope="1.13" intercept="-0.04"/></feComponentTransfer></filter></defs><rect width="1000" height="1000" fill="#fff"/><g clip-path="url(#clip)" filter="url(#clean)"><image href="${safe}" x="-215" y="0" width="1430" height="1430" preserveAspectRatio="xMidYMin meet"/></g></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
  for (const p of (window.PRODUCTS || [])) {
    if (target.has(p.code) && String(p.image || "").startsWith("data:image/")) p.image = clean(p.image);
  }
})();
