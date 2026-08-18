(() => {
  const P = window.PRODUCTS || [];
  const C = window.STORE_CONFIG || {};
  let lang = localStorage.getItem("ktir_lang") || "en";
  let category = "all";
  let search = "";
  let cart = JSON.parse(localStorage.getItem("ktir_cart") || "{}");

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const ATLAS_POS = {
    "201202":[0,0],"201203":[33.333,0],"250203":[66.667,0],"471000":[100,0],
    "420000":[0,25],"401000":[33.333,25],"641620":[66.667,25],"640000":[100,25],
    "604500":[0,50],"861000":[33.333,50],"999159":[66.667,50],"999049":[100,50],
    "999095":[0,75],"999018":[33.333,75],"999040":[66.667,75],"999107":[100,75],
    "999132":[0,100],"999134":[33.333,100]
  };
  const atlasStyle = code => { const p=ATLAS_POS[code]||[0,0]; return `background-image:url(assets/products-atlas.webp);background-size:400% 500%;background-position:${p[0]}% ${p[1]}%;background-repeat:no-repeat;background-color:white`; };

  const cats = [["all","All","الكل"],["beauty","Beauty","جمال"],["kitchen","Kitchen","مطبخ"],["car","Car","سيارة"],["home","Home","منزل"],["outdoor","Outdoor","رحلات"],["tools","Tools","عدة"],["wellness","Wellness","راحة"]];
  const t = (en, ar) => lang === "ar" ? ar : en;
  const money = n => `${C.currency || "$"}${Number(n).toFixed(Number(n)%1?2:0)}`;
  const prodByCode = code => P.find(p => p.code === code);

  function saveCart(){ localStorage.setItem("ktir_cart", JSON.stringify(cart)); renderCartCount(); }
  function renderCartCount(){ const count = Object.values(cart).reduce((a,b)=>a+b,0); $("#cartCount").textContent = count; }

  function applyLanguage(){
    document.body.classList.toggle("rtl", lang === "ar"); document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    $("#langBtnText").textContent = lang === "ar" ? "English" : "العربية";
    $("#deliveryTop").textContent = t(C.deliveryTextEn, C.deliveryTextAr);
    $("#heroEyebrow").textContent = t("Everyday essentials • Low prices","احتياجات يومية • أسعار منخفضة");
    $("#heroTitle").textContent = t("Big variety. Small prices.","تشكيلة كبيرة. أسعار أخف.");
    $("#heroText").textContent = t("Shop useful everyday products for home, car, kitchen, beauty and more — delivered all over Lebanon.","تسوّق منتجات يومية للمنزل والسيارة والمطبخ والجمال وأكثر — مع توصيل إلى جميع أنحاء لبنان.");
    $("#shopBtn").textContent = t("Shop now","تسوّق الآن"); $("#productsTitle").textContent = t("Shop products","تسوّق المنتجات");
    $("#productsSub").textContent = t(`${P.length} products available`,`متوفر ${P.length} منتج`); $("#searchInput").placeholder = t("Search products or product code…","ابحث عن منتج أو كود المنتج…");
    $("#cartLabel").textContent = t("Bag","السلة"); $("#cartTitle").textContent = t("Your bag","سلة المشتريات"); $("#totalLabel").textContent = t("Total","المجموع");
    $("#checkoutBtn").textContent = t("Checkout","إتمام الطلب"); $("#checkoutTitle").textContent = t("Checkout","إتمام الطلب"); $("#nameLabel").textContent = t("Name","الاسم");
    $("#phoneLabel").textContent = t("Phone number","رقم الهاتف"); $("#areaLabel").textContent = t("Area / City","المنطقة / المدينة"); $("#addressLabel").textContent = t("Address / Delivery details","العنوان / تفاصيل التوصيل");
    $("#notesLabel").textContent = t("Notes (optional)","ملاحظات (اختياري)"); $("#sendOrderBtn").textContent = t("Send order on WhatsApp","إرسال الطلب على واتساب"); $("#copyOrderBtn").textContent = t("Copy order","نسخ الطلب");
    $("#footerAboutTitle").textContent = t("About Ktir rkhis","عن Ktir rkhis"); $("#footerAbout").textContent = t("Useful products, straightforward prices, and delivery across Lebanon.","منتجات مفيدة، أسعار واضحة، وتوصيل إلى جميع أنحاء لبنان.");
    $("#footerShopTitle").textContent = t("Shop","المتجر"); $("#footerDeliveryTitle").textContent = t("Delivery","التوصيل"); $("#footerDelivery").textContent = t(C.deliveryTextEn, C.deliveryTextAr);
    renderCategories(); renderProducts(); renderCart();
  }

  function renderCategories(){ $("#categories").innerHTML = cats.map(([key,en,ar]) => `<button class="chip ${key===category?"active":""}" data-cat="${key}">${t(en,ar)}</button>`).join(""); $$("#categories .chip").forEach(b => b.onclick = () => { category = b.dataset.cat; renderCategories(); renderProducts(); }); }
  function renderProducts(){
    const q = search.trim().toLowerCase(); const list = P.filter(p => { const catOk = category === "all" || p.category === category; const hay = [p.code,p.name_en,p.name_ar,p.desc_en,p.desc_ar].join(" ").toLowerCase(); return catOk && (!q || hay.includes(q)); });
    $("#productsGrid").innerHTML = list.length ? list.map(p => `<article class="product-card"><div class="image-wrap"><div class="product-img" role="img" aria-label="${lang==="ar"?p.name_ar:p.name_en}" style="${atlasStyle(p.code)}"></div><span class="code-badge">${p.code}</span></div><div class="product-body"><h3>${lang==="ar"?p.name_ar:p.name_en}</h3><p>${lang==="ar"?p.desc_ar:p.desc_en}</p><div class="tags">${(lang==="ar"?p.tags_ar:p.tags_en).map(x=>`<span class="tag">${x}</span>`).join("")}</div><div class="price-row"><span class="price">${money(p.price)}</span><button class="add-btn" data-add="${p.code}">${t("Add to bag","أضف للسلة")}</button></div></div></article>`).join("") : `<div class="empty">${t("No products found.","لم يتم العثور على منتجات.")}</div>`;
    $$('[data-add]').forEach(btn => btn.onclick = () => addToCart(btn.dataset.add));
  }
  function addToCart(code){ cart[code] = (cart[code] || 0) + 1; saveCart(); renderCart(); toast(t("Added to bag","تمت الإضافة إلى السلة")); }
  function changeQty(code, delta){ cart[code] = (cart[code] || 0) + delta; if(cart[code] <= 0) delete cart[code]; saveCart(); renderCart(); }
  function removeItem(code){ delete cart[code]; saveCart(); renderCart(); }
  function cartTotal(){ return Object.entries(cart).reduce((sum,[code,qty]) => { const p = prodByCode(code); return sum + (p ? p.price * qty : 0) },0); }
  function renderCart(){ const entries = Object.entries(cart).filter(([code,qty]) => prodByCode(code) && qty>0); $("#cartItems").innerHTML = entries.length ? entries.map(([code,qty]) => { const p = prodByCode(code); return `<div class="cart-item"><div class="cart-thumb" style="${atlasStyle(code)}"></div><div><h4>${lang==="ar"?p.name_ar:p.name_en}</h4><small>${t("Code","الكود")}: ${code} • ${money(p.price)}</small><div class="qty"><button data-minus="${code}">−</button><b>${qty}</b><button data-plus="${code}">+</button></div></div><div style="text-align:${lang==="ar"?"left":"right"}"><b>${money(p.price*qty)}</b><br><button class="remove" data-remove="${code}">${t("Remove","حذف")}</button></div></div>`; }).join("") : `<div class="cart-empty">${t("Your bag is empty.","سلتك فارغة.")}</div>`; $("#cartTotal").textContent = money(cartTotal()); $$('[data-minus]').forEach(b => b.onclick = ()=>changeQty(b.dataset.minus,-1)); $$('[data-plus]').forEach(b => b.onclick = ()=>changeQty(b.dataset.plus,1)); $$('[data-remove]').forEach(b => b.onclick = ()=>removeItem(b.dataset.remove)); renderCartCount(); }
  function openCart(){ $("#overlay").classList.add("show"); $("#cartDrawer").classList.add("show"); } function closeCart(){ $("#overlay").classList.remove("show"); $("#cartDrawer").classList.remove("show"); }
  function buildOrderText(){ const name=$("#name").value.trim(), phone=$("#phone").value.trim(), area=$("#area").value.trim(), address=$("#address").value.trim(), notes=$("#notes").value.trim(); const lines=Object.entries(cart).map(([code,qty])=>{ const p=prodByCode(code); return `${qty} × ${p.name_en} (${code}) — ${money(p.price*qty)}`; }); return ["🛍️ NEW KTIR RKHIS ORDER","",`Customer: ${name}`,`Phone: ${phone}`,`Area: ${area}`,`Address: ${address || "-"}`,`Notes: ${notes || "-"}`,"","Items:",...lines.map(x=>"• "+x),"",`TOTAL: ${money(cartTotal())}`,"","Delivery: Lebanon"].join("\n"); }
  function updatePreview(){ $("#orderPreview").textContent = buildOrderText(); }
  function openCheckout(){ if(!Object.keys(cart).length){ toast(t("Your bag is empty","سلتك فارغة")); return; } closeCart(); $("#overlay").classList.add("show"); $("#checkoutModal").classList.add("show"); updatePreview(); const configured = String(C.whatsappNumber || "").replace(/\D/g,"").length >= 8; $("#waWarning").style.display = configured ? "none" : "block"; }
  function closeCheckout(){ $("#overlay").classList.remove("show"); $("#checkoutModal").classList.remove("show"); }
  function validateCheckout(){ for(const id of ["name","phone","area"]){ if(!$("#"+id).value.trim()){ $("#"+id).focus(); toast(t("Please fill in the required fields","يرجى تعبئة الحقول المطلوبة")); return false; } } return true; }
  async function copyOrder(){ if(!validateCheckout()) return; const text = buildOrderText(); try{ await navigator.clipboard.writeText(text); toast(t("Order copied","تم نسخ الطلب")); } catch{ prompt(t("Copy this order:","انسخ هذا الطلب:"), text); } }
  function sendOrder(){ if(!validateCheckout()) return; const number = String(C.whatsappNumber || "").replace(/\D/g,""); const text = buildOrderText(); if(number.length < 8){ copyOrder(); toast(t("WhatsApp number is not configured yet. Order copied instead.","رقم واتساب المتجر غير مضاف بعد. تم نسخ الطلب.")); return; } window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank"); }
  function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),1800); }
  $("#searchInput").addEventListener("input", e => { search=e.target.value; renderProducts(); }); $("#langBtn").onclick=()=>{lang=lang==="en"?"ar":"en";localStorage.setItem("ktir_lang",lang);applyLanguage()}; $("#cartBtn").onclick=openCart; $("#closeCart").onclick=closeCart; $("#overlay").onclick=()=>{closeCart();closeCheckout()}; $("#checkoutBtn").onclick=openCheckout; $("#closeCheckout").onclick=closeCheckout; $("#copyOrderBtn").onclick=copyOrder; $("#sendOrderBtn").onclick=sendOrder; ["name","phone","area","address","notes"].forEach(id=>$("#"+id).addEventListener("input",updatePreview)); $("#shopBtn").onclick=()=>$("#shop").scrollIntoView({behavior:"smooth"}); $("#year").textContent=new Date().getFullYear(); applyLanguage();
})();
