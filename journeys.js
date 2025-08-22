import { hafas } from './_hafas.js';

export default async function handler(req, res) {
  try {
    const { from, to, departure, transfers } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from & to required (EVA-IDs)' });
    const opt = {
      stopovers: true,
      transfers: transfers ? parseInt(transfers, 10) : undefined,
      departure: departure ? new Date(departure) : new Date(),
      results: 5,
      products: { nationalExp: true, national: true, regional: true },
    };
    const data = await hafas.journeys(from, to, opt);
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'journeys failed' });
  }
}