(() => {
  const products = window.PRODUCTS || [];
  const byCode = new Map(products.map(p => [String(p.code), p]));
  const cache = new Map();
  const pending = new Map();

  const baseSource = p => p.image || `assets/${p.code}.png`;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function rowDeviation(data, width, y) {
    let sr=0, sg=0, sb=0, n=0;
    const step = 2;
    for (let x=0; x<width; x+=step) {
      const i=(y*width+x)*4;
      sr+=data[i]; sg+=data[i+1]; sb+=data[i+2]; n++;
    }
    const mr=sr/n, mg=sg/n, mb=sb/n;
    let dev=0;
    for (let x=0; x<width; x+=step) {
      const i=(y*width+x)*4;
      dev += Math.abs(data[i]-mr)+Math.abs(data[i+1]-mg)+Math.abs(data[i+2]-mb);
    }
    const brightness=(mr+mg+mb)/3;
    return { dev: dev/(n*3), brightness };
  }

  function detectPhotoBottom(img) {
    const w=180;
    const h=Math.max(90, Math.round(img.naturalHeight*w/img.naturalWidth));
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const x=c.getContext('2d', {willReadFrequently:true});
    x.drawImage(img,0,0,w,h);
    const d=x.getImageData(0,0,w,h).data;
    const start=Math.floor(h*0.48), end=Math.floor(h*0.86);
    for (let y=start; y<end-7; y++) {
      let sum=0, bright=0;
      for (let k=0;k<7;k++) {
        const r=rowDeviation(d,w,y+k); sum+=r.dev; bright+=r.brightness;
      }
      if ((sum/7)<12 && (bright/7)<247) {
        const ratio=y/h;
        if (ratio>=0.55 && ratio<=0.82) return ratio;
      }
    }
    return 1;
  }

  async function makeClean(code) {
    code=String(code);
    if (cache.has(code)) return cache.get(code);
    if (pending.has(code)) return pending.get(code);
    const p=byCode.get(code);
    if (!p) return null;
    const job=(async()=>{
      try {
        const img=await loadImage(baseSource(p));
        const ratio=detectPhotoBottom(img);
        const cropH=Math.max(1, Math.round(img.naturalHeight*ratio));
        const size=420, margin=10;
        const c=document.createElement('canvas'); c.width=size; c.height=size;
        const ctx=c.getContext('2d');
        ctx.fillStyle='#fafafa'; ctx.fillRect(0,0,size,size);
        const scale=Math.min((size-margin*2)/img.naturalWidth,(size-margin*2)/cropH);
        const dw=img.naturalWidth*scale, dh=cropH*scale;
        const dx=(size-dw)/2, dy=(size-dh)/2;
        ctx.filter='contrast(1.05) saturate(1.05)';
        ctx.drawImage(img,0,0,img.naturalWidth,cropH,dx,dy,dw,dh);
        ctx.filter='none';
        const url=c.toDataURL('image/jpeg',0.82);
        cache.set(code,url); p.image=url;
        return url;
      } catch(e) {
        console.warn('Could not clean product image', code, e);
        return null;
      } finally { pending.delete(code); }
    })();
    pending.set(code,job); return job;
  }

  function codeForCard(card) {
    const badge=card.querySelector('.code-badge');
    return badge ? badge.textContent.trim() : null;
  }

  async function cleanCard(card) {
    if (!card || card.dataset.imageCleaned==='1') return;
    const code=codeForCard(card), img=card.querySelector('.image-wrap img');
    if (!code || !img) return;
    const url=await makeClean(code);
    if (url && img.isConnected) { img.src=url; card.dataset.imageCleaned='1'; }
  }

  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ io.unobserve(e.target); cleanCard(e.target); } });
  }, {rootMargin:'500px'}) : null;

  function scan() {
    document.querySelectorAll('.product-card').forEach(card => {
      if (card.dataset.imageQueued==='1') return;
      card.dataset.imageQueued='1';
      if(io) io.observe(card); else cleanCard(card);
    });
    document.querySelectorAll('.cart-item').forEach(item => {
      const txt=item.textContent||''; const m=txt.match(/\b\d{6}\b/); const img=item.querySelector('img');
      if(!m||!img) return;
      makeClean(m[0]).then(url=>{if(url&&img.isConnected) img.src=url;});
    });
  }

  const grid=document.getElementById('productsGrid');
  if(grid) new MutationObserver(scan).observe(grid,{childList:true,subtree:true});
  const cart=document.getElementById('cartItems');
  if(cart) new MutationObserver(scan).observe(cart,{childList:true,subtree:true});
  scan();
})();
