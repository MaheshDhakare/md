const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const [user] = await db('users').insert({ name, email, password_hash: hash }).returning(['id','name','email','role']);
    res.json({ user });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db('users').where({ email }).first();
    if(!user) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash || '');
    if(!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    const refresh = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, refresh, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error(e); res.status(500).json({ error: 'login failed' });
  }
});

module.exports = router;
