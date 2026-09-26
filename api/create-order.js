export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { amount, currency = 'INR', receipt, notes = {} } = req.body || {};
    const paise = Number(amount);
    if (!Number.isInteger(paise) || paise < 100) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const key = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key || !secret) return res.status(500).json({ error: 'Razorpay server credentials are not configured' });
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const upstream = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: paise, currency, receipt: String(receipt || `HC-${Date.now()}`), notes })
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.description || 'Razorpay order creation failed' });
    return res.status(200).json({ id: data.id, amount: data.amount, currency: data.currency, key_id: key });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}
function setCors(req,res){
  const origin=req.headers.origin || '';
  const allowed=['https://harshiyaan-collections.vercel.app','https://vuppalapatinithish-lenin.github.io','http://localhost:3000','http://localhost:5173'];
  if(allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
}
