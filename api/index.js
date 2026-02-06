// Vercel Serverless Function - Main API Handler
export default function handler(req, res) {
  res.status(200).json({ 
    ok: true, 
    message: 'API is working',
    path: req.url,
    timestamp: new Date().toISOString()
  });
}
