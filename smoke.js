import assert from 'node:assert/strict';
function pad(n){ return String(n).padStart(2, '0'); }
function addMinutes(date, minutes){ return new Date(date.getTime() + minutes * 60000); }
assert.equal(pad(5), '05');
assert.equal(pad(12), '12');
const base = new Date(1704103200000);
assert.equal(addMinutes(base,60)-base,3600000);
console.log('Smoke tests passed.');