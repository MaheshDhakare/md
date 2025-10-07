const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const db = require('../db');
const { uploadToS3 } = require('../storage');
const router = express.Router();

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if(!req.file) return res.status(400).json({ error: 'no file' });
    const key = `uploads/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g,'_')}`;
    const result = await uploadToS3(key, req.file.buffer, req.file.mimetype);
    const property_id = req.body.property_id;
    if(property_id){
      await db('attachments').insert({
        property_id,
        filename: req.file.originalname,
        url: result.url,
        mime_type: req.file.mimetype,
        size: req.file.size
      });
    }
    res.json({ ok: true, url: result.url });
  } catch(e){ console.error(e); res.status(500).json({ error: 'upload failed' }); }
});

module.exports = router;
