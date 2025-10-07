const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
module.exports = function(req, res, next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({ error: 'missing auth' });
  const parts = auth.split(' ');
  if(parts.length !== 2) return res.status(401).json({ error: 'invalid auth' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch(err) {
    return res.status(401).json({ error: 'invalid token' });
  }
};
