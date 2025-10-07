const db = require('../src/db');
const bcrypt = require('bcrypt');

(async ()=> {
  try {
    const hash = await bcrypt.hash('password', 10);
    const [user] = await db('users').insert({ name: 'Admin', email: 'admin@example.com', password_hash: hash, role: 'admin' }).returning(['id','name','role']);
    console.log('Seeded admin', user);
    await db('properties').insert({ id: 'PR-0000000001', title: 'Sample Villa', summary: 'Seed sample', address: 'Bangalore', status: 'Available', type: 'Property', created_by: user.id });
    console.log('Seeded property');
    process.exit(0);
  } catch(e){ console.error(e); process.exit(1); }
})();
