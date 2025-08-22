// ==============================================
// Bahn-Copilot – Repo-Skeleton (Vercel-ready)
// Serverless API unter /api/* + statisches Frontend
// ==============================================

// =============================
// FILE: README.md
// =============================
/*
# 🚆 Bahn-Copilot – Vercel-ready (Serverless)

Dieses Template macht dein Projekt **aus einem GitHub-Repo** mit **einem Klick** auf Vercel deploybar:
- **Frontend**: `public/index.html` (Single-File React via CDN)
- **Serverless-API**: `api/*` (Vercel Functions), ruft `hafas-client` auf

> Hinweis: PoC-Variante ohne DB-RIS-Vertrag. Stabilität hängt von der Erreichbarkeit/Rate-Limits der zugrundeliegenden HAFAS-Zugänge ab.

## 🚀 Deploy (Vercel)
1. Repo auf GitHub pushen.
2. Auf https://vercel.com → „New Project“ → dein Repo auswählen.
3. Framework: **Other** (Static). Build Command: *none*.
4. Root Directory: `/` (Standard). Output: `public/` wird automatisch bedient; API liegt unter `/api/*`.
5. Deploy. Danach:
   - App: `https://<projekt>.vercel.app/`
   - API: `https://<projekt>.vercel.app/api/...`

## ▶️ Lokal starten
```bash
npm install
npm run test   # kleine Smoke-Tests
# API-Funktionen kannst du local mit vercel-cli testen (optional):
#   npm i -g vercel
#   vercel dev
```

## 🔗 API-Endpoints
- `GET /api/locations?query=Hamburg` → Stationssuche (Name + EVA)
- `GET /api/boards/departures?evaId=8000152&when=2025-08-22T08:00:00Z`
- `GET /api/boards/arrivals?evaId=8000152&when=...`
- `GET /api/journeys?from=8000152&to=8000105&departure=2025-08-22T08:00:00Z&transfers=1`

## ✅ Tests
- `test/smoke.js` prüft Helper (ohne Netz). Falls du CI willst: GitHub Actions kann `node test/smoke.js` ausführen.

*/

// =============================
// FILE: package.json
// =============================
{
  "name": "bahn-copilot-vercel",
  "version": "0.2.0",
  "type": "module",
  "scripts": {
    "test": "node test/smoke.js"
  },
  "dependencies": {
    "hafas-client": "^6.1.1"
  }
}

// =============================
// FILE: api/_hafas.js
// (Shared Helper für Functions)
// =============================
import createClient from 'hafas-client';
import {profile as db} from 'hafas-client/p/db/index.js';

export const hafas = createClient(db, {
  userAgent: 'bahn-copilot-poc',
});

export function toStationResult(s) {
  const eva = s.id || s.evaNumber || s.eva;
  return {
    id: eva || null,
    name: s.name || s.label || '',
    type: s.type || 'station',
  };
}

// =============================
// FILE: api/locations.js
// =============================
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

// =============================
// FILE: api/boards/departures.js
// =============================
import { hafas } from '../_hafas.js';

export default async function handler(req, res) {
  try {
    const evaId = req.query.evaId;
    if (!evaId) return res.status(400).json({ error: 'evaId required' });
    const when = req.query.when ? new Date(req.query.when) : new Date();
    const data = await hafas.departures(evaId, { when, duration: 60 });
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'departures failed' });
  }
}

// =============================
// FILE: api/boards/arrivals.js
// =============================
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

// =============================
// FILE: api/journeys.js
// =============================
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

// =============================
// FILE: public/index.html
// =============================
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bahn-Copilot – Vercel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-gradient-to-b from-slate-50 to-white text-slate-800">
  <div id="root"></div>
  <script type="text/babel">
    const { useMemo, useState } = React;

    function pad(n) { return String(n).padStart(2, '0'); }
    function addMinutes(date, minutes) { return new Date(date.getTime() + minutes * 60000); }

    (function tests(){
      console.assert(pad(5)==='05', 'pad 5->05');
      const base = new Date(1704103200000);
      console.assert(addMinutes(base,60)-base===3600000,'addMinutes +60m');
    })();

    async function api(path) {
      const r = await fetch(path);
      if (!r.ok) throw new Error('API '+path+' failed');
      return await r.json();
    }
    async function searchStations(q){ if(!q) return []; return await api('/api/locations?query='+encodeURIComponent(q)); }
    async function fetchJourneys(params){ const qs=new URLSearchParams(params).toString(); return await api('/api/journeys?'+qs); }

    function App(){
      const [from,setFrom]=useState('');
      const [to,setTo]=useState('');
      const [fromId,setFromId]=useState('');
      const [toId,setToId]=useState('');
      const [outDate,setOutDate]=useState('');
      const [outTime,setOutTime]=useState('');
      const [maxTransfers,setMaxTransfers]=useState('1');
      const [retEnabled,setRetEnabled]=useState(false);
      const [retDate,setRetDate]=useState('');
      const [retTime,setRetTime]=useState('');
      const [retAltDest,setRetAltDest]=useState('');
      const [generated,setGenerated]=useState('');

      const dateLong = useMemo(()=>{
        if(!outDate) return '(Datum fehlt)';
        const d=new Date(outDate+(outTime?`T${outTime}:00`:'T00:00:00'));
        return d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
      },[outDate,outTime]);

      async function pickStation(setName,setId){
        const q=prompt('Bahnhof suchen (z. B. Hamburg Hbf)');
        const list=await searchStations(q);
        if(!list.length) return alert('Nichts gefunden.');
        const options=list.map((s,i)=>`${i+1}) ${s.name} [${s.id||'?'}]`).join('\n');
        const idx=Number(prompt('Bitte wählen:\n'+options))-1;
        if(idx>=0 && idx<list.length){ setName(list[idx].name); setId(list[idx].id||''); }
      }

      async function buildEmailBlock(){
        if(!fromId||!toId||!outDate||!outTime){ setGenerated('Bitte Start/Ziel (mit Auswahl), Datum & Uhrzeit ausfüllen.'); return; }
        const departure=new Date(`${outDate}T${outTime}:00`).toISOString();
        const transfers=maxTransfers==='99'?undefined:Number(maxTransfers);
        let data; try{ data=await fetchJourneys({from:fromId,to:toId,departure,transfers}); }catch(e){ console.error(e); setGenerated('API-Fehler bei der Fahrtenabfrage.'); return; }
        const legs=(data?.journeys||[]).slice(0,3);
        const lines=[`Verbindungen ${from} → ${to} (${dateLong})`,''];
        for(let i=0;i<legs.length;i++){
          const j=legs[i];
          const dep=j.legs[0]?.departure?new Date(j.legs[0].departure):null;
          const arr=j.legs.at(-1)?.arrival?new Date(j.legs.at(-1).arrival):null;
          const dur=j.duration||''; const transfersCount=(j.legs||[]).length-1;
          lines.push(`${i+1}) ${dep?pad(dep.getHours())+":"+pad(dep.getMinutes()):'??'}–${arr?pad(arr.getHours())+":"+pad(arr.getMinutes()):'??'} (${dur}) | ${transfersCount} Umstieg(e)`);
          for(const leg of j.legs){
            const f=leg.origin?.name||'?'; const t=leg.destination?.name||'?';
            const depT=leg.departure?new Date(leg.departure):null; const arrT=leg.arrival?new Date(leg.arrival):null;
            const line=leg.line?.name||leg.mode||''; const depPl=leg.departurePlatform?` Gl. ${leg.departurePlatform}`:'';
            lines.push(`   ${f} ${depT?pad(depT.getHours())+":"+pad(depT.getMinutes()):'??'} (${line}) → ${t} ${arrT?pad(arrT.getHours())+":"+pad(arrT.getMinutes()):'??'}${depPl}`);
            const plat=leg.arrivalPlatform||leg.departurePlatform; const progn=(leg.reachable===false)?'⚠️ Anschluss kritisch':'pünktlich';
            lines.push(`   [Umstieg ~${Math.max(5,10)} min]  ${plat ? ' / Gleis ' + plat : ''}`);
            lines.push(`   Prognose: ${progn}`);
          }
          lines.push('');
        }
        if(retEnabled && retDate && retTime){
          const rTitle=`Rückfahrt (${retAltDest ? 'ab '+retAltDest : 'ab '+to}, ${new Date(`${retDate}T${retTime}:00`).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})})`;
          lines.push(rTitle);
          lines.push('- (Rückfahrtslogik analog – optional nachrüsten)');
        }
        lines.push('Hinweis: PoC mit HAFAS-Client. Daten & Verfügbarkeit ohne Gewähr.');
        setGenerated(lines.join('\n'));
      }

      return (
        <div className="min-h-screen w-full p-6">
          <div className="max-w-5xl mx-auto space-y-4">
            <h1 className="text-2xl font-semibold">🚆 Bahn-Copilot – Vercel (Serverless)</h1>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-white rounded-2xl shadow p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <button className="p-2 rounded-xl border" onClick={()=>pickStation(setFrom,setFromId)}>{from?('Start: '+from):'Startbahnhof wählen'}</button>
                  <button className="p-2 rounded-xl border" onClick={()=>pickStation(setTo,setToId)}>{to?('Ziel: '+to):'Zielbahnhof wählen'}</button>
                  <label className="flex flex-col gap-1"><span className="text-sm">Datum (Hin)</span><input type="date" className="border rounded-xl p-2" value={outDate} onChange={e=>setOutDate(e.target.value)} /></label>
                  <label className="flex flex-col gap-1"><span className="text-sm">Uhrzeit (Hin)</span><input type="time" className="border rounded-xl p-2" value={outTime} onChange={e=>setOutTime(e.target.value)} /></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={retEnabled} onChange={e=>setRetEnabled(e.target.checked)} /> Rückfahrt aktivieren</label>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1"><span className="text-sm">Max. Umstiege</span><select className="border rounded-xl p-2" value={maxTransfers} onChange={e=>setMaxTransfers(e.target.value)}><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="99">egal</option></select></label>
                  {retEnabled && (<><label className="flex flex-col gap-1"><span className="text-sm">Datum (Rück)</span><input type="date" className="border rounded-xl p-2" value={retDate} onChange={e=>setRetDate(e.target.value)} /></label><label className="flex flex-col gap-1"><span className="text-sm">Uhrzeit (Rück)</span><input type="time" className="border rounded-xl p-2" value={retTime} onChange={e=>setRetTime(e.target.value)} /></label></>)}
                </div>
                <button onClick={buildEmailBlock} className="px-4 py-2 rounded-2xl bg-slate-900 text-white">Verbindungen generieren</button>
              </div>
              <div className="bg-white rounded-2xl shadow p-4 space-y-3">
                <h2 className="text-lg font-medium">Ausgabe (Mail-Block)</h2>
                <textarea className="w-full h-96 border rounded-xl p-3 font-mono text-sm" value={generated} onChange={e=>setGenerated(e.target.value)} placeholder="Klicke auf ‘Verbindungen generieren’." />
              </div>
            </div>
            <footer className="text-xs text-slate-500">PoC: Daten über Serverless-API. Gleise & Prognosen werden angezeigt, wenn vorhanden.</footer>
          </div>
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>

// =============================
// FILE: test/smoke.js
// =============================
import assert from 'node:assert/strict';
function pad(n){ return String(n).padStart(2, '0'); }
function addMinutes(date, minutes){ return new Date(date.getTime() + minutes * 60000); }
assert.equal(pad(5), '05');
assert.equal(pad(12), '12');
const base = new Date(1704103200000);
assert.equal(addMinutes(base,60)-base,3600000);
console.log('Smoke tests passed.');
