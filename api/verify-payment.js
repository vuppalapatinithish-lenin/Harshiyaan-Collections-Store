import crypto from 'node:crypto';
export default async function handler(req, res) {
  setCors(req,res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { order_id, payment_id, signature } = req.body || {};
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return res.status(500).json({ error: 'Razorpay secret is not configured' });
    if (!order_id || !payment_id || !signature) return res.status(400).json({ error: 'Missing payment verification fields' });
    const expected = crypto.createHmac('sha256', secret).update(`${order_id}|${payment_id}`).digest('hex');
    const a=Buffer.from(expected); const b=Buffer.from(String(signature));
    const verified=a.length===b.length && crypto.timingSafeEqual(a,b);
    if (!verified) return res.status(400).json({ verified:false, error:'Invalid Razorpay signature' });
    return res.status(200).json({ verified:true, order_id, payment_id });
  } catch (e) {
    return res.status(500).json({ error:e?.message || 'Verification error' });
  }
}
function setCors(req,res){
  const origin=req.headers.origin || '';
  const allowed=['https://harshiyaan-collections.vercel.app','https://harshiyaan-collections-igbnf4dda-nithish-746f.vercel.app','https://vuppalapatinithish-lenin.github.io','http://localhost:3000','http://localhost:5173'];
  if(allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}
