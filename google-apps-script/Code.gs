const STORE_KEY = 'HC_ORDERS_V1';
const EMAIL_TO = 'Darlingfareed@gmail.com';
const STATUSES = ['Confirmed','Processing','Shipped','Out for Delivery','Delivered'];

function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function getOrders_(){const raw=PropertiesService.getScriptProperties().getProperty(STORE_KEY);try{return raw?JSON.parse(raw):[];}catch(e){return [];}}
function putOrders_(orders){PropertiesService.getScriptProperties().setProperty(STORE_KEY,JSON.stringify(orders));}
function doGet(e){
  const action=(e&&e.parameter&&e.parameter.action)||'list'; const orders=getOrders_();
  if(action==='list') return json_({ok:true,orders});
  if(action==='track'){const id=(e.parameter.id||'').trim().toUpperCase();const mobile=(e.parameter.mobile||'').replace(/\D/g,'');const o=orders.find(x=>String(x.id).toUpperCase()===id && String(x.customer&&x.customer.mobile||'').replace(/\D/g,'')===mobile);return o?json_({ok:true,order:o}):json_({ok:false,error:'Order not found'});}
  return json_({ok:false,error:'Unknown action'});
}
function doPost(e){
  const lock=LockService.getScriptLock(); lock.waitLock(15000);
  try{
    const body=JSON.parse((e&&e.postData&&e.postData.contents)||'{}'); const action=body.action||'create'; let orders=getOrders_();
    if(action==='create'){
      const o=body.order; if(!o||!o.id) return json_({ok:false,error:'Missing order'});
      const idx=orders.findIndex(x=>x.id===o.id); if(idx>=0) orders[idx]=o; else orders.unshift(o); putOrders_(orders); sendOrderEmail_(o); return json_({ok:true,order:o});
    }
    if(action==='update'){
      const idx=orders.findIndex(x=>x.id===body.id); if(idx<0)return json_({ok:false,error:'Order not found'}); if(!STATUSES.includes(body.status))return json_({ok:false,error:'Invalid status'}); orders[idx].status=body.status; orders[idx].updatedAt=new Date().toISOString(); putOrders_(orders); return json_({ok:true,order:orders[idx]});
    }
    if(action==='delete'){
      orders=orders.filter(x=>x.id!==body.id); putOrders_(orders); return json_({ok:true});
    }
    return json_({ok:false,error:'Unknown action'});
  }finally{lock.releaseLock();}
}
function sendOrderEmail_(o){
  const c=o.customer||{}; const subject='Harshiyaan Collections — New Order '+o.id;
  const body=[
    'NEW ORDER RECEIVED','',
    'Order ID: '+o.id,
    'Amount Paid: ₹'+Number(o.amount||0).toLocaleString('en-IN'),
    'Status: '+(o.status||'Confirmed'),
    'Payment: '+(o.payment||'Razorpay Live'),
    'Razorpay Order ID: '+(o.razorpayOrderId||''),
    'Razorpay Payment ID: '+(o.razorpayPaymentId||''),'',
    'Product: '+(o.product||''),'',
    'Customer: '+(c.name||''),
    'Mobile: '+(c.mobile||''),
    'Email: '+(c.email||'(not provided)'),
    'Address: '+[c.house,c.street,c.area,c.city,c.district,c.state,c.pincode].filter(Boolean).join(', '),
    'Maps: '+(c.mapsLink||'(manual address)'),
    'Expected Delivery: '+(o.delivery||'')
  ].join('\n');
  try{MailApp.sendEmail(EMAIL_TO,subject,body);}catch(err){console.log(err);}
}
