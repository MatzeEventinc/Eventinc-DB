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