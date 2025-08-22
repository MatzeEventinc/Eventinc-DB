import { hafas } from '../_hafas.js';

export default async function handler(req, res) {
  try {
    const evaId = req.query.evaId;
    if (!evaId) return res.status(400).json({ error: 'evaId required' });
    const when = req.query.when ? new Date(req.query.when) : new Date();
    const data = await hafas.arrivals(evaId, { when, duration: 60 });
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'arrivals failed' });
  }
}