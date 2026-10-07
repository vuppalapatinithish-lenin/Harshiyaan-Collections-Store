(function(){
  'use strict';
  const DEFAULT_API_BASE='https://harshiyaan-collections-store.vercel.app';
  function apiBase(){
    return String(window.HC_RAZORPAY_API_BASE || DEFAULT_API_BASE).replace(/\/$/,'');
  }
  async function loadCheckout(){
    if(window.Razorpay) return;
    const existing=document.querySelector('script[data-hc-razorpay]');
    if(existing){
      await new Promise((resolve,reject)=>{let t=setTimeout(()=>reject(new Error('Razorpay Checkout loading timed out.')),15000);existing.addEventListener('load',()=>{clearTimeout(t);resolve()}, {once:true});existing.addEventListener('error',()=>{clearTimeout(t);reject(new Error('Razorpay Checkout could not load.'))},{once:true});});
      if(window.Razorpay)return;
    }
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script'); s.src='https://checkout.razorpay.com/v1/checkout.js'; s.async=true; s.dataset.hcRazorpay='1';
      let done=false; const finish=(fn,v)=>{if(done)return;done=true;fn(v)};
      const timer=setTimeout(()=>finish(reject,new Error('Razorpay Checkout loading timed out.')),15000);
      s.onload=()=>{clearTimeout(timer);finish(resolve)};
      s.onerror=()=>{clearTimeout(timer);finish(reject,new Error('Razorpay Checkout could not load.'))};
      document.head.appendChild(s);
    });
    if(!window.Razorpay) throw new Error('Razorpay Checkout is unavailable.');
  }
  async function jsonFetch(url,payload){
    let r;
    try{r=await fetch(url,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});}
    catch(e){throw new Error('Cannot reach payment server. Please try again.');}
    const text=await r.text(); let data={}; try{data=text?JSON.parse(text):{}}catch(_){data={error:text||'Invalid server response'}}
    if(!r.ok) throw new Error(data.error || ('Payment server returned HTTP '+r.status));
    return data;
  }
  async function createOrder(payload){
    const data=await jsonFetch(apiBase()+'/api/create-order',payload);
    if(!data.id) throw new Error(data.error || 'Unable to create Razorpay order.');
    return data;
  }
  async function verifyPayment(payload){
    const data=await jsonFetch(apiBase()+'/api/verify-payment',payload);
    if(!data.verified) throw new Error(data.error || 'Payment verification failed.');
    return data;
  }
  window.hcOpenRazorpayCheckout=async function(opts){
    opts=opts||{};
    const amount=Number(opts.amount);
    if(!Number.isFinite(amount)||amount<=0) throw new Error('Invalid payment amount.');
    await loadCheckout();
    const created=await createOrder({amount:Math.round(amount*100),currency:'INR',receipt:opts.receipt||('HC-'+Date.now()),notes:opts.notes||{}});
    const customer=opts.customer||{};
    return await new Promise((resolve,reject)=>{
      let settled=false;
      const fail=e=>{if(settled)return;settled=true;reject(e instanceof Error?e:new Error(String(e)))};
      const rzp=new window.Razorpay({
        key:created.key_id, amount:created.amount, currency:created.currency,
        name:'Harshiyaan Collections', description:opts.description||'Harshiyaan Collections Jewellery', order_id:created.id,
        prefill:{name:customer.name||'',email:customer.email||'',contact:String(customer.mobile||'').replace(/[^0-9+]/g,'')},
        notes:opts.notes||{}, theme:{color:'#B88A32'},
        handler:async response=>{
          try{
            const verified=await verifyPayment({order_id:response.razorpay_order_id,payment_id:response.razorpay_payment_id,signature:response.razorpay_signature});
            if(settled)return; settled=true; resolve({created,response,verified});
          }catch(e){fail(e)}
        },
        modal:{ondismiss:()=>fail(new Error('Payment window closed. No payment was completed.'))}
      });
      rzp.on('payment.failed',resp=>fail(new Error(resp?.error?.description||'Razorpay payment failed.')));
      try{rzp.open()}catch(e){fail(new Error(e?.message||'Could not open Razorpay checkout.'))}
    });
  };
})();
