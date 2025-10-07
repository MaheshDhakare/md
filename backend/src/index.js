require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(bodyParser.json({ limit: '15mb' }));

app.get('/api/healthz', (req, res)=> res.json({ status:'ok' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/builders', require('./routes/builders'));
app.use('/api/admin', require('./routes/admin'));

const port = process.env.PORT || 3000;
app.listen(port, ()=> console.log('Backend on port', port));
