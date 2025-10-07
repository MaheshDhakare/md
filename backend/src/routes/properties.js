const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uploadToS3 } = require('../storage');
const { v4: uuidv4 } = require('uuid');

router.get('/', async (req, res) => {
  const q = req.query.q || '';
  const page = parseInt(req.query.page||'1',10);
  const limit = parseInt(req.query.limit||'20',10);
  try {
    const items = await db('properties')
      .modify(q && ((qb)=> qb.whereILike('title', `%${q}%`)))
      .limit(limit).offset((page-1)*limit);
    res.json({ items });
  } catch(e){ console.error(e); res.status(500).json({ error: 'failed' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await db('properties').where({ id: req.params.id }).first();
    if(!p) return res.status(404).json({ error: 'not found' });
    const attachments = await db('attachments').where({ property_id: req.params.id });
    const assignments = await db('assignments').where({ property_id: req.params.id });
    res.json({ property: p, attachments, assignments });
  } catch(e){ console.error(e); res.status(500).json({ error: 'failed' }); }
});

// save (converted from client-side saveProperty)
router.post('/save', auth, async (req, res) => {
  const payload = req.body || {};
  const id = (payload.id || '').trim();
  const title = (payload.title || '').trim();
  if(!id || !title) return res.status(400).json({ error: 'id & title required' });

  let trx;
  try {
    trx = await db.transaction();
    const existing = await trx('properties').where({ id }).first();
    const createdAt = existing && existing.created_at ? existing.created_at : (payload.createdAt ? new Date(payload.createdAt) : new Date());
    const owner = existing && existing.owner ? existing.owner : (payload.owner || (req.user && req.user.sub) || 'anonymous');

    // images
    const images = Array.isArray(payload.images) ? payload.images : [];
    const imagesStored = [];
    for(const img of images){
      if(!img || !img.src) continue;
      if(typeof img.src === 'string' && img.src.startsWith('data:')){
        const m = img.src.match(/^data:(.+);base64,(.*)$/);
        if(!m) continue;
        const mime = m[1];
        const buf = Buffer.from(m[2], 'base64');
        const key = `properties/${id}/images/${Date.now()}-${(img.name||'img').replace(/[^a-zA-Z0-9_.-]/g,'_')}`;
        const r = await uploadToS3(key, buf, mime);
        imagesStored.push({ key: r.key, url: r.url, name: img.name||'', size: img.size||buf.length, visible: !!img.visible });
      } else {
        imagesStored.push({ key: null, url: img.src, name: img.name||'', size: img.size||null, visible: !!img.visible });
      }
    }

    // attachments
    const atts = Array.isArray(payload.attachments) ? payload.attachments : [];
    for(const a of atts){
      if(!a) continue;
      if(a.dataUrl && String(a.dataUrl).startsWith('data:')){
        const m = String(a.dataUrl).match(/^data:(.*);base64,(.*)$/);
        if(!m) continue;
        const mime = m[1];
        const buf = Buffer.from(m[2], 'base64');
        const key = `properties/${id}/attachments/${Date.now()}-${(a.name||'file').replace(/[^a-zA-Z0-9_.-]/g,'_')}`;
        const r = await uploadToS3(key, buf, mime);
        await trx('attachments').insert({ property_id: id, filename: a.name||'file', url: r.url, mime_type: mime, size: a.size||buf.length, meta: a.meta||null });
      } else if(a.url){
        await trx('attachments').insert({ property_id: id, filename: a.name||'file', url: a.url, mime_type: a.type||null, size: a.size||null, meta: a.meta||null });
      }
    }

    const finalMap = Object.assign({}, existing && existing.asset_visibility_map ? existing.asset_visibility_map : {}, payload.assetVisibility || payload.assetVisibilityMap || {});

    const row = {
      id,
      title: payload.title,
      summary: payload.summary||null,
      address: payload.address||null,
      status: payload.status||'Available',
      type: payload.type||'Property',
      created_by: existing && existing.created_by ? existing.created_by : (req.user && req.user.sub) || null,
      created_at: createdAt,
      images: imagesStored.length ? JSON.stringify(imagesStored) : null,
      extra_fields: payload.extra_fields ? JSON.stringify(payload.extra_fields) : (payload.extraFields ? JSON.stringify(payload.extraFields) : null),
      asset_visibility_map: Object.keys(finalMap||{}).length ? JSON.stringify(finalMap) : null,
      owner
    };

    const [saved] = await trx('properties').insert(row).onConflict('id').merge(Object.assign({}, row, { id: undefined })).returning('*');

    if (Array.isArray(payload.agents)){
      await trx('assignments').where({ property_id: id, assignee_type: 'agent' }).del();
      for(const aid of payload.agents){
        await trx('assignments').insert({ id: uuidv4(), property_id: id, assignee_id: aid, assignee_type: 'agent' });
      }
    }
    if (Array.isArray(payload.builders)){
      await trx('assignments').where({ property_id: id, assignee_type: 'builder' }).del();
      for(const bid of payload.builders){
        await trx('assignments').insert({ id: uuidv4(), property_id: id, assignee_id: bid, assignee_type: 'builder' });
      }
    }

    await trx.commit();
    const attachments = await db('attachments').where({ property_id: id });
    const assignments = await db('assignments').where({ property_id: id });
    res.json({ property: saved, attachments, assignments });
  } catch(e){
    if(trx) try{ await trx.rollback(); }catch(_){}
    console.error(e); res.status(500).json({ error: 'save failed', detail: e.message||String(e) });
  }
});

module.exports = router;
