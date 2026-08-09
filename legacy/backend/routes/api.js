/**
 * d4rk_livemap – routes/api.js  (v2.1 – alle FiveM-Pfade unter /internal/)
 */

const express = require('express');
const fetch   = require('node-fetch');
const router  = express.Router();
const { requireAuth, requirePermission, API_KEYS } = require('../middleware/auth');

async function fetchFromFiveM(path, options = {}) {
  const base   = process.env.FIVEM_URL.replace(/\/$/, '');
  const secret = process.env.FIVEM_SECRET || '';
  const sep    = path.includes('?') ? '&' : '?';
  const url    = `${base}/d4rk_api/internal${path}${secret ? `${sep}token=${encodeURIComponent(secret)}` : ''}`;

  const res = await fetch(url, {
    headers: {
      'X-Internal-Secret': secret,
      'Accept':            'application/json',
      ...(options.headers || {}),
    },
    method:  options.method  || 'GET',
    body:    options.body    || undefined,
    timeout: options.timeout || 5000,
  });

  if (!res.ok) throw new Error(`FiveM HTTP ${res.status} for ${path}`);
  return res.json();
}

router.use(requireAuth);

// ── Grunddaten ───────────────────────────────────────────────
router.get('/data', requirePermission('read'), async (req, res) => {
  try {
    const data = await fetchFromFiveM('/data');
    res.json({ ...data, _auth: { by: req.auth.name, type: req.auth.type } });
  } catch (err) {
    console.error('[API] /data Fehler:', err.message);
    res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message });
  }
});

router.get('/server', requirePermission('read'), async (req, res) => {
  try { res.json(await fetchFromFiveM('/server')); }
  catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.get('/health', requirePermission('read'), async (req, res) => {
  try { res.json(await fetchFromFiveM('/health')); }
  catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.get('/stats', requirePermission('read'), async (req, res) => {
  try { res.json(await fetchFromFiveM('/stats')); }
  catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

// ── Spieler ──────────────────────────────────────────────────
router.get('/players', requirePermission('read'), async (req, res) => {
  try { res.json(await fetchFromFiveM('/players')); }
  catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.get('/players/near', requirePermission('read'), async (req, res) => {
  const { x, y, radius } = req.query;
  if (!x || !y) return res.status(400).json({ error: 'x und y sind Pflicht' });
  try {
    const qs = new URLSearchParams({ x, y, ...(radius && { radius }) });
    res.json(await fetchFromFiveM(`/players/near?${qs}`));
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.get('/players/invehicle', requirePermission('read'), async (req, res) => {
  try { res.json(await fetchFromFiveM('/players/invehicle')); }
  catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.get('/player/:id', requirePermission('read'), async (req, res) => {
  try { res.json(await fetchFromFiveM(`/player/${req.params.id}`)); }
  catch (err) {
    const status = err.message.includes('404') ? 404 : 502;
    res.status(status).json({ error: status === 404 ? 'Spieler nicht gefunden' : 'FiveM nicht erreichbar' });
  }
});

// ── Marker ───────────────────────────────────────────────────
router.get('/markers', requirePermission('read'), async (req, res) => {
  try { res.json(await fetchFromFiveM('/markers')); }
  catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.get('/markers/near', requirePermission('read'), async (req, res) => {
  const { x, y, radius } = req.query;
  if (!x || !y) return res.status(400).json({ error: 'x und y sind Pflicht' });
  try {
    const qs = new URLSearchParams({ x, y, ...(radius && { radius }) });
    res.json(await fetchFromFiveM(`/markers/near?${qs}`));
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.get('/markers/:id', requirePermission('read'), async (req, res) => {
  try { res.json(await fetchFromFiveM(`/markers/${encodeURIComponent(req.params.id)}`)); }
  catch (err) {
    const status = err.message.includes('404') ? 404 : 502;
    res.status(status).json({ error: status === 404 ? 'Marker nicht gefunden' : 'FiveM nicht erreichbar' });
  }
});

router.post('/markers', requirePermission('markers'), async (req, res) => {
  const { id, x, y, z, label, color, icon, group, source } = req.body;
  if (!id || x === undefined || y === undefined)
    return res.status(400).json({ error: 'id, x, y sind Pflichtfelder' });
  try {
    const params = new URLSearchParams({ id, x, y, z: z ?? 0, label: label ?? id,
      color: color ?? '#00d4aa', icon: icon ?? 'default',
      group: group ?? 'Sonstiges', source: source ?? `apikey:${req.auth.name}` });
    res.json({ success: true, id, ...await fetchFromFiveM(`/markers/add?${params}`) });
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.post('/markers/bulk', requirePermission('markers'), async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Body muss ein Array sein' });
  try {
    res.json(await fetchFromFiveM('/markers/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    }));
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.delete('/markers/:id', requirePermission('markers'), async (req, res) => {
  try {
    res.json({ success: true, id: req.params.id,
      ...await fetchFromFiveM(`/markers/remove?id=${encodeURIComponent(req.params.id)}`) });
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.delete('/markers', requirePermission('markers'), async (req, res) => {
  const { source } = req.query;
  try {
    const qs = source ? `?source=${encodeURIComponent(source)}` : '';
    res.json({ success: true, ...await fetchFromFiveM(`/markers/clear${qs}`) });
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

// ── Zonen ────────────────────────────────────────────────────
router.get('/zones', requirePermission('read'), async (req, res) => {
  try { res.json(await fetchFromFiveM('/zones')); }
  catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.post('/zones', requirePermission('markers'), async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id ist Pflicht' });
  try {
    if (req.body.type === 'polygon' && req.body.points) {
      res.json({ success: true, id,
        ...await fetchFromFiveM('/zones/bulk', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([req.body]) }) });
    } else {
      const params = new URLSearchParams({ id,
        type: req.body.type || 'circle', x: req.body.x || 0, y: req.body.y || 0,
        radius: req.body.radius || 50, label: req.body.label || id,
        color: req.body.color || '#3b82f6', fillColor: req.body.fillColor || req.body.color || '#3b82f6',
        opacity: req.body.opacity || 0.3, group: req.body.group || 'Zonen',
        source: req.body.source || `apikey:${req.auth.name}` });
      res.json({ success: true, id, ...await fetchFromFiveM(`/zones/add?${params}`) });
    }
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.post('/zones/bulk', requirePermission('markers'), async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Body muss ein Array sein' });
  try {
    res.json(await fetchFromFiveM('/zones/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    }));
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.delete('/zones/:id', requirePermission('markers'), async (req, res) => {
  try {
    await fetchFromFiveM(`/zones/remove?id=${encodeURIComponent(req.params.id)}`);
    res.json({ success: true, id: req.params.id });
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.delete('/zones', requirePermission('markers'), async (req, res) => {
  const { source } = req.query;
  try {
    const qs = source ? `?source=${encodeURIComponent(source)}` : '';
    res.json({ success: true, ...await fetchFromFiveM(`/zones/clear${qs}`) });
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

// ── Fahrzeuge ────────────────────────────────────────────────
router.get('/vehicles', requirePermission('read'), async (req, res) => {
  try { res.json(await fetchFromFiveM('/vehicles')); }
  catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

router.get('/vehicles/near', requirePermission('read'), async (req, res) => {
  const { x, y, radius } = req.query;
  if (!x || !y) return res.status(400).json({ error: 'x und y sind Pflicht' });
  try {
    const qs = new URLSearchParams({ x, y, ...(radius && { radius }) });
    res.json(await fetchFromFiveM(`/vehicles/near?${qs}`));
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

// ── Events ───────────────────────────────────────────────────
router.get('/events', requirePermission('read'), async (req, res) => {
  const { limit, type } = req.query;
  try {
    const qs = new URLSearchParams({ ...(limit && { limit }), ...(type && { type }) });
    res.json(await fetchFromFiveM(`/events${qs.toString() ? '?' + qs : ''}`));
  } catch (err) { res.status(502).json({ error: 'FiveM nicht erreichbar', message: err.message }); }
});

// ── Admin ────────────────────────────────────────────────────
router.get('/admin/keys', requirePermission('admin'), (req, res) => {
  const keys = Object.entries(API_KEYS).map(([key, data]) => ({
    key: key.substring(0, 8) + '...', name: data.name, permissions: data.permissions,
  }));
  res.json({ keys, count: keys.length });
});

router.get('/admin/sessions', requirePermission('admin'), (req, res) => {
  res.json({ currentSession: req.session?.user || null });
});

router.get('/admin/status', requirePermission('admin'), async (req, res) => {
  let fivemStatus = 'unknown', fivemData = null;
  try { fivemData = await fetchFromFiveM('/stats'); fivemStatus = 'online'; }
  catch (err) { fivemStatus = 'offline: ' + err.message; }
  res.json({
    backend: { status: 'online', uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage().heapUsed, node: process.version },
    fivem:   { status: fivemStatus, url: process.env.FIVEM_URL, data: fivemData },
    auth:    { apiKeyCount: Object.keys(API_KEYS).length },
  });
});

module.exports = router;
