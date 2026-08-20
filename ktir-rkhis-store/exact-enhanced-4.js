(() => {
  const P = window.PRODUCTS || [];
  const target = new Set(["211303","211701","220100","221102","230203","230210","230221","230300","230302","231202"]);
  const enhance = src => {
    const safe = String(src || "").replace(/&/g,"&amp;").replace(/\"/g,"&quot;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><clipPath id="c"><rect width="1000" height="1000" rx="32"/></clipPath><filter id="f" x="-10%" y="-10%" width="120%" height="120%"><feColorMatrix type="saturate" values="1.16"/><feComponentTransfer><feFuncR type="linear" slope="1.10" intercept="-0.035"/><feFuncG type="linear" slope="1.10" intercept="-0.035"/><feFuncB type="linear" slope="1.10" intercept="-0.035"/></feComponentTransfer><feGaussianBlur stdDeviation="0.18" result="b"/><feBlend in="SourceGraphic" in2="b" mode="screen"/></filter></defs><rect width="1000" height="1000" fill="white"/><g clip-path="url(#c)" filter="url(#f)" transform="translate(-80,-38) scale(1.16)"><image href="${safe}" width="1000" height="1000" preserveAspectRatio="xMidYMid slice"/></g></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
  for (const p of P) {
    if (target.has(p.code) && String(p.image || "").startsWith("data:image/")) p.image = enhance(p.image);
  }
})();
