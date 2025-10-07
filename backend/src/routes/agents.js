const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try { const agents = await db('users').where({ role: 'agent' }).select('id','name','email','phone'); res.json({ agents }); }
  catch(e){ console.error(e); res.status(500).json({ error: 'failed' }); }
});

router.post('/', auth, async (req, res) => {
  try { if(req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    const { name, email, phone } = req.body;
    const [u] = await db('users').insert({ name, email, phone, role: 'agent' }).returning(['id','name','email']); res.json({ agent: u });
  } catch(e){ console.error(e); res.status(500).json({ error: 'create failed' }); }
});

router.put('/:id', auth, async (req, res) => {
  try { if(req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    await db('users').where({ id: req.params.id, role: 'agent' }).update(req.body); res.json({ ok: true });
  } catch(e){ console.error(e); res.status(500).json({ error: 'update failed' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try { if(req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    await db('users').where({ id: req.params.id, role: 'agent' }).del(); res.json({ ok: true });
  } catch(e){ console.error(e); res.status(500).json({ error: 'delete failed' }); }
});

module.exports = router;
