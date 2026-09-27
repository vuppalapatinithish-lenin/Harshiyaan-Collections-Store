export default async function handler(req,res){
  const origin=req.headers.origin||''; setCors(req,res,origin);
  if(req.method==='OPTIONS') return res.status(204).end();
  const base=process.env.HC_ORDERS_SCRIPT_URL;
  if(!base) return res.status(500).json({error:'HC_ORDERS_SCRIPT_URL is not configured'});
  try{
    if(req.method==='GET'){
      const url=new URL(base); url.searchParams.set('action',req.query?.action||'list'); if(req.query?.id)url.searchParams.set('id',req.query.id); if(req.query?.mobile)url.searchParams.set('mobile',req.query.mobile);
      const r=await fetch(url); const data=await r.json(); return res.status(r.status).json(data);
    }
    if(req.method==='POST'){
      const r=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(req.body||{})}); const data=await r.json(); return res.status(r.status).json(data);
    }
    return res.status(405).json({error:'Method not allowed'});
  }catch(e){return res.status(500).json({error:e?.message||'Order sync error'})}
}
function setCors(req,res,origin){const ok=origin==='https://vuppalapatinithish-lenin.github.io'||origin.endsWith('.vercel.app')||origin==='http://localhost:3000'||origin==='http://localhost:5173';if(ok)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
