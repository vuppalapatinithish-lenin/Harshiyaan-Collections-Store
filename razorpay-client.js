(function(){
  const DEFAULT_API_BASE = 'https://harshiyaan-collections.vercel.app';
  function apiBase(){ return (window.HC_RAZORPAY_API_BASE || DEFAULT_API_BASE).replace(/\/$/,''); }
  function loadCheckout(){
    if(window.Razorpay) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://checkout.razorpay.com/v1/checkout.js';
      s.onload=resolve; s.onerror=()=>reject(new Error('Razorpay Checkout could not load.'));
      document.head.appendChild(s);
    });
  }
  async function createOrder(payload){
    const r=await fetch(apiBase()+'/api/create-order',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok || !data.id) throw new Error(data.error || 'Unable to create Razorpay order.');
    return data;
  }
  async function verifyPayment(payload){
    const r=await fetch(apiBase()+'/api/verify-payment',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok || !data.verified) throw new Error(data.error || 'Payment verification failed.');
    return data;
  }
  window.hcOpenRazorpayCheckout = async function(opts){
    const amount=Number(opts.amount);
    if(!Number.isFinite(amount) || amount<=0) throw new Error('Invalid payment amount.');
    await loadCheckout();
    const created=await createOrder({
      amount:Math.round(amount*100),
      currency:'INR',
      receipt:opts.receipt || ('HC-'+Date.now()),
      notes:opts.notes || {}
    });
    const customer=opts.customer || {};
    return new Promise((resolve,reject)=>{
      let settled=false;
      const finishReject=(e)=>{if(settled)return;settled=true;reject(e instanceof Error?e:new Error(String(e)))};
      const rzp=new Razorpay({
        key:created.key_id,
        amount:created.amount,
        currency:created.currency,
        name:'Harshiyaan Collections',
        description:opts.description || 'Harshiyaan Collections Jewellery',
        order_id:created.id,
        prefill:{name:customer.name||'',email:customer.email||'',contact:customer.mobile||''},
        notes:opts.notes || {},
        theme:{color:'#B88A32'},
        handler:async function(response){
          try{
            const verified=await verifyPayment({
              order_id:response.razorpay_order_id,
              payment_id:response.razorpay_payment_id,
              signature:response.razorpay_signature
            });
            if(settled)return;
            settled=true;
            resolve({created,response,verified});
          }catch(e){ finishReject(e); }
        },
        modal:{ondismiss:function(){ finishReject(new Error('Payment window closed. No order was placed.')); }}
      });
      rzp.on('payment.failed',function(resp){
        finishReject(new Error((resp && resp.error && resp.error.description) || 'Razorpay payment failed.'));
      });
      rzp.open();
    });
  };
})();
