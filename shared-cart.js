(function(){
  'use strict';
  const STORAGE='hc_cart';
  const API_BASE='https://harshiyaan-collections-store.vercel.app';
  const DEFAULT_PRODUCTS=[
    {id:1001,name:'Temple Heritage Set',price:1999,old:2500,img:'products/product1.png',category:'New Arrivals'},
    {id:1002,name:'Royal Ruby Pendant Set',price:3499,old:4200,img:'products/product2.png',category:'Bridal'},
    {id:1003,name:'Classic Black Bead Gold',price:2599,old:3100,img:'products/product3.png',category:'Black Beads'},
    {id:1004,name:'Floral Layered Collection',price:2999,old:3800,img:'products/product4.png',category:'Long Haram'}
  ];
  const readProducts=()=>{try{const p=JSON.parse(localStorage.getItem('hc_products')||'null');return Array.isArray(p)&&p.length?p:DEFAULT_PRODUCTS}catch(e){return DEFAULT_PRODUCTS}};
  const readCart=()=>{try{const c=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(c)?c:[]}catch(e){return[]}};
  const writeCart=c=>{localStorage.setItem(STORAGE,JSON.stringify(c));updateBadge();window.dispatchEvent(new CustomEvent('hc-cart-updated',{detail:c}))};
  const productById=id=>readProducts().find(p=>String(p.id)===String(id));
  const pathFor=img=>{
    if(!img)return '';
    if(/^(https?:|data:|blob:|\.\.?\/)/.test(img))return img;
    return location.pathname.includes('/category-pages/')?'../'+img:img;
  };
  const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
  function updateBadge(){
    const n=readCart().reduce((a,x)=>a+Number(x.qty||0),0);
    document.querySelectorAll('#cartBadge,#hcFloatingCartBadge,.hc-cart-badge-global').forEach(b=>b.textContent=n);
    const f=document.getElementById('hcFloatingCart'); if(f&&n>0){f.classList.remove('hc-cart-pulse');void f.offsetWidth;f.classList.add('hc-cart-pulse')}
  }
  function toast(msg){if(typeof window.showToast==='function'){window.showToast(msg);return}let e=document.getElementById('toast');if(!e){e=document.createElement('div');e.id='toast';e.className='toast';document.body.appendChild(e)}e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2600)}
  function addToCart(id){
    const p=productById(id); if(!p){toast('Product could not be added');return false}
    const cart=readCart(); const item=cart.find(x=>String(x.id)===String(p.id));
    if(item){item.qty=Number(item.qty||0)+1}else{cart.push({id:Number(p.id),qty:1,name:p.name,price:Number(p.price||0),old:Number(p.old||0),img:p.img||'',category:p.category||''})}
    writeCart(cart);toast('✓ '+p.name+' added to cart');try{navigator.vibrate&&navigator.vibrate(25)}catch(e){} return true;
  }
  function addOfferToCart(id,btn){
    const ok=addToCart(id); if(ok&&btn){const old=btn.innerHTML;btn.innerHTML='✓ Added to Cart';btn.classList.add('added');setTimeout(()=>{btn.innerHTML=old;btn.classList.remove('added')},1200)} return ok;
  }
  function changeQty(id,d){const cart=readCart();const i=cart.find(x=>String(x.id)===String(id));if(!i)return;i.qty=Number(i.qty||0)+Number(d);const next=cart.filter(x=>Number(x.qty)>0);writeCart(next);renderCart()}
  function renderCart(){
    const c=document.getElementById('cartContent');if(!c)return;const cart=readCart();
    if(!cart.length){c.innerHTML='<div class="admin-card">Your cart is empty.</div>';return}
    let total=0;
    c.innerHTML=cart.map(i=>{const p=productById(i.id)||i;const price=Number(p.price||i.price||0);total+=price*Number(i.qty||0);return `<div class="cart-row"><div style="display:flex;gap:10px;align-items:center"><img src="${pathFor(p.img||i.img)}" alt="" style="width:56px;height:56px;object-fit:contain;border-radius:10px;background:#f8f1e8"><div><b>${p.name||i.name}</b><div class="mini">${money(price)} each</div></div></div><div class="qty"><button type="button" onclick="changeQty(${i.id},-1)">−</button><b>${i.qty}</b><button type="button" onclick="changeQty(${i.id},1)">+</button></div><strong>${money(price*Number(i.qty||0))}</strong></div>`}).join('')+`<div class="order-summary" style="margin-top:18px"><b>Total: ${money(total)}</b></div><button class="btn gold" style="margin-top:14px;width:100%" onclick="checkoutCart()">Confirm Your Order — ${money(total)}</button>`;
  }
  function openCart(){
    renderCart();const m=document.getElementById('cartModal');if(m)m.classList.add('open');else toast('Cart is available from the shopping bag button.');
  }
  function checkoutCart(){
    const cart=readCart();if(!cart.length){toast('Your cart is empty');return}
    const total=cart.reduce((s,i)=>s+Number(i.price||productById(i.id)?.price||0)*Number(i.qty||0),0);
    const summary=document.getElementById('orderSummary');if(summary)summary.innerHTML=`<b>${cart.length} product item(s)</b><br><strong>${money(total)}</strong><br><span class="mini">Razorpay · UPI available · COD unavailable · Estimated delivery 5–7 working days</span>`;
    const cm=document.getElementById('cartModal');if(cm)cm.classList.remove('open');const om=document.getElementById('orderModal');if(om)om.classList.add('open');else toast('Order form is unavailable on this page. Open the Home page to checkout.');
  }
  function itemText(cart){return cart.map(i=>(i.name||productById(i.id)?.name||('Product '+i.id))+' × '+i.qty).join(', ')}
  async function startPayment(){
    const cart=readCart();if(!cart.length){toast('Your cart is empty');return}
    const form=document.getElementById('orderForm');if(!form||!form.reportValidity())return;
    const data=Object.fromEntries(new FormData(form).entries());
    const total=cart.reduce((s,i)=>s+Number(i.price||productById(i.id)?.price||0)*Number(i.qty||0),0);if(!total)return;
    const delivery=new Date(Date.now()+6*86400000).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
    const orderId='HC-'+String(Date.now()).slice(-8);const items=itemText(cart);
    const notes={customer_name:data.name||'',customer_mobile:data.mobile||'',customer_email:data.email||'',order_ref:orderId};
    try{
      toast('Opening secure Razorpay checkout…');
      const result=await window.hcOpenRazorpayCheckout({amount:total,receipt:orderId,description:items,customer:data,notes});
      const order={id:orderId,date:new Date().toLocaleString(),product:items,amount:total,payment:'Razorpay Live',status:'Confirmed',delivery,customer:data,items:cart,razorpayOrderId:result.response.razorpay_order_id,razorpayPaymentId:result.response.razorpay_payment_id};
      let orders=[];try{orders=JSON.parse(localStorage.getItem('hc_orders')||'[]')}catch(e){} orders.unshift(order);localStorage.setItem('hc_orders',JSON.stringify(orders));
      try{await fetch('https://script.google.com/macros/s/AKfycbwoDEDhdSwF3f0XAs-TqdnlFfF3v36ircXF3l8h0BQ-f7kRVT2hoyHW1k_7qJuyz56_1Q/exec',{method:'POST',mode:'no-cors',body:JSON.stringify(order)})}catch(e){}
      try{await fetch(API_BASE+'/api/order-sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',order})})}catch(e){}
      writeCart([]);const om=document.getElementById('orderModal');if(om)om.classList.remove('open');
      const success=(typeof window.categorySuccessHtml==='function')?window.categorySuccessHtml(order):`<div class="admin-card"><b>Payment Successful ✅</b><p>Order ID: <strong>${order.id}</strong><br>Total Paid: <strong>${money(order.amount)}</strong><br>Status: <strong>${order.status}</strong><br>Expected Delivery: <strong>${order.delivery}</strong></p></div>`;
      const target=document.getElementById('trackModalContent')||document.getElementById('trackResult');if(target)target.innerHTML=success;const tm=document.getElementById('trackModal');if(tm)tm.classList.add('open');toast('Payment successful — order confirmed');
    }catch(e){console.error(e);toast('Payment not completed: '+(e.message||'Please try again'))}
  }
  function ensureFloating(){
    if(document.getElementById('hcFloatingCart'))return;
    const b=document.createElement('button');b.type='button';b.id='hcFloatingCart';b.className='hc-floating-cart';b.setAttribute('aria-label','Open shopping cart');b.title='Open Cart';b.innerHTML='🛒<span id="hcFloatingCartBadge" class="hc-float-badge">0</span>';b.addEventListener('click',openCart);document.body.appendChild(b);
  }
  function ensureStyles(){
    if(document.getElementById('hc-global-cart-style'))return;const s=document.createElement('style');s.id='hc-global-cart-style';s.textContent=`.hc-floating-cart{position:fixed;right:22px;bottom:22px;width:58px;height:58px;border-radius:50%;border:1px solid rgba(184,138,50,.45);background:linear-gradient(135deg,#15100c,#6e4a18);color:#fff;font-size:24px;display:grid;place-items:center;z-index:99999;box-shadow:0 12px 35px rgba(0,0,0,.25);cursor:pointer}.hc-float-badge{position:absolute;right:-2px;top:-4px;min-width:21px;height:21px;padding:0 5px;border-radius:999px;background:#b88a32;color:#fff;font:700 11px Arial;display:grid;place-items:center}.hc-cart-pulse{animation:hcPulseGlobal .45s ease}@keyframes hcPulseGlobal{50%{transform:scale(1.12)}}@media(max-width:600px){.hc-floating-cart{right:16px;bottom:16px;width:56px;height:56px}}.btn.added{background:#2f7d4a!important;color:#fff!important}`;document.head.appendChild(s);
  }
  function init(){
    ensureStyles();ensureFloating();
    window.addToCart=addToCart;window.addOfferToCart=addOfferToCart;window.changeQty=changeQty;window.saveCart=()=>writeCart(readCart());window.updateCartBadge=updateBadge;window.renderCart=renderCart;window.openCart=openCart;window.checkoutCart=checkoutCart;window.startRazorpayPayment=startPayment;
    updateBadge();
    window.addEventListener('storage',e=>{if(e.key===STORAGE)updateBadge()});
    window.addEventListener('hc-cart-updated',updateBadge);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
