import { hafas, toStationResult } from './_hafas.js';

export default async function handler(req, res) {
  try {
    const q = (req.query.query || '').trim();
    if (!q) return res.status(400).json({ error: 'query required' });
    const results = await hafas.locations(q, { results: 8 });
    const stations = results
      .filter(r => (r.type === 'stop' || r.type === 'station') && (r.id || r.evaNumber))
      .map(toStationResult);
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
    return res.status(200).json(stations);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'locations failed' });
  }
}