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
      const incoming=body.order; if(!incoming||!incoming.id) return json_({ok:false,error:'Missing order'});
      const idx=orders.findIndex(x=>x.id===incoming.id);
      let o=incoming;
      if(idx>=0){
        const previous=orders[idx];
        o.adminEmailSent=previous.adminEmailSent||false;
        o.customerEmailSent=previous.customerEmailSent||false;
        o.emailSent=!!(o.adminEmailSent && o.customerEmailSent);
        orders[idx]=o;
      }else{
        o.adminEmailSent=false;
        o.customerEmailSent=false;
        o.emailSent=false;
        orders.unshift(o);
      }
      putOrders_(orders);
      const mailResult=sendOrderEmail_(o);
      o.adminEmailSent=mailResult.adminSent;
      o.customerEmailSent=mailResult.customerSent;
      o.emailSent=!!(o.adminEmailSent && o.customerEmailSent);
      const savedIdx=orders.findIndex(x=>x.id===o.id);
      if(savedIdx>=0) orders[savedIdx]=o;
      putOrders_(orders);
      return json_({ok:true,order:o,emailSent:o.emailSent,adminEmailSent:o.adminEmailSent,customerEmailSent:o.customerEmailSent});
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
  const c=o.customer||{};
  const adminSubject='Harshiyaan Collections — New Order '+o.id;
  const customerSubject='Harshiyaan Collections — Order Confirmed '+o.id;
  const itemLines=(Array.isArray(o.items)&&o.items.length?o.items.map((it,i)=>{
    return (i+1)+'. '+(it.name||'Jewellery Item')+' | Product ID: '+(it.id||'—')+' | Qty: '+(it.qty||1)+' | ₹'+Number(it.price||0).toLocaleString('en-IN');
  }).join('\n'):(o.product||'Jewellery Item'));
  const address=[c.house,c.street,c.area,c.city,c.district,c.state,c.pincode].filter(Boolean).join(', ');
  const trackUrl='https://vuppalapatinithish-lenin.github.io/Harshiyaan-Collections-Store/#track';
  const common=[
    'Order ID: '+(o.id||''),
    'Amount Paid: ₹'+Number(o.amount||0).toLocaleString('en-IN'),
    'Payment Status: PAID',
    'Payment Method: '+(o.payment||'Razorpay Live'),
    'Razorpay Order ID: '+(o.razorpayOrderId||''),
    'Razorpay Payment ID: '+(o.razorpayPaymentId||''),
    'Status: '+(o.status||'Confirmed'),
    'Expected Delivery: '+(o.delivery||''),
    '',
    'ITEMS',
    itemLines,
    '',
    'CUSTOMER',
    'Name: '+(c.name||''),
    'Mobile: '+(c.mobile||''),
    'Email: '+(c.email||''),
    'Address: '+(address||'Not provided'),
    'Maps: '+(c.mapsLink||'Not provided'),
    '',
    'TRACK YOUR ORDER',
    'Track ID / Order ID: '+(o.id||''),
    'Registered Mobile: '+(c.mobile||''),
    'Track here: '+trackUrl
  ].join('\n');
  let adminSent=!!o.adminEmailSent, customerSent=!!o.customerEmailSent;
  try{ if(!adminSent){ MailApp.sendEmail(EMAIL_TO,adminSubject,'NEW ORDER RECEIVED\n\n'+common); adminSent=true; } }catch(err){ console.log('Admin email failed: '+err); }
  if(c.email && !customerSent){ try{ MailApp.sendEmail(c.email,customerSubject,'Thank you for shopping with Harshiyaan Collections!\n\n'+common+'\n\nPlease keep your Track ID / Order ID: '+(o.id||'')); customerSent=true; }catch(err){ console.log('Customer email failed: '+err); } }
  return {adminSent,customerSent};
}
