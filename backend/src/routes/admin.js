const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uploadToS3 } = require('../storage');

router.get('/export', auth, async (req, res) => {
  try {
    if(req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    const users = await db('users').select();
    const properties = await db('properties').select();
    const attachments = await db('attachments').select();
    const assignments = await db('assignments').select();
    res.json({ users, properties, attachments, assignments });
  } catch(e){ console.error(e); res.status(500).json({ error: 'export failed' }); }
});

router.post('/import', auth, async (req, res) => {
  try {
    if(req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    const obj = req.body || {};
    if(Array.isArray(obj.users)){
      for(const u of obj.users){
        await db('users').insert({ id: u.id, name: u.name||'Imported', email: u.email||null, phone: u.phone||null, role: u.role||'user' }).onConflict('id').ignore();
      }
    }
    if(Array.isArray(obj.properties)){
      for(const p of obj.properties){
        await db('properties').insert({
          id: p.id, title: p.title, summary: p.summary, address: p.address, status: p.status||'Available',
          type: p.type||'Property', created_by: p.created_by||null, images: p.images||null, extra_fields: p.extra_fields||null,
          asset_visibility_map: p.asset_visibility_map||null, owner: p.owner||null
        }).onConflict('id').ignore();
      }
    }
    if(Array.isArray(obj.attachments)){
      for(const a of obj.attachments){
        let url = a.url;
        if(a.dataUri){
          const m = a.dataUri.match(/^data:(.*);base64,(.*)$/);
          if(m){
            const mime = m[1]; const buf = Buffer.from(m[2], 'base64');
            const key = `imports/${Date.now()}-${(a.filename||'file').replace(/[^a-zA-Z0-9_.-]/g,'_')}`;
            const r = await uploadToS3(key, buf, mime);
            url = r.url;
          }
        }
        await db('attachments').insert({ property_id: a.property_id, filename: a.filename, url, mime_type: a.mime_type||null, size: a.size||null, meta: a.meta||null }).onConflict('id').ignore();
      }
    }
    if(Array.isArray(obj.assignments)){
      for(const asg of obj.assignments){
        await db('assignments').insert({ id: asg.id, property_id: asg.property_id, assignee_id: asg.assignee_id, assignee_type: asg.assignee_type }).onConflict('id').ignore();
      }
    }
    res.json({ ok: true });
  } catch(e){ console.error(e); res.status(500).json({ error: 'import failed' }); }
});

module.exports = router;
