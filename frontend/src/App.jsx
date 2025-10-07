import React, { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_BASE || '';

export default function App(){
  const [status, setStatus] = useState('checking...');
  const [propsList, setPropsList] = useState([]);
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [token, setToken] = useState('');

  useEffect(()=>{
    fetch(API + '/api/healthz').then(r=>r.json()).then(()=> setStatus('ok')).catch(()=> setStatus('offline'));
    loadProps();
  },[]);

  async function login(){
    const r = await fetch(API + '/api/auth/login', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email, password }) });
    const j = await r.json();
    if(j.token){ setToken(j.token); alert('Logged in'); } else { alert('Login failed'); }
  }

  async function loadProps(){
    const r = await fetch(API + '/api/properties');
    const j = await r.json();
    setPropsList(j.items || []);
  }

  async function createSample(){
    if(!token) return alert('Login first');
    const body = { id: 'PR-' + Date.now(), title:'New Property', address:'Test Street', summary:'Created from React' };
    const r = await fetch(API + '/api/properties/save', { method:'POST', headers:{'content-type':'application/json','authorization': 'Bearer '+token}, body: JSON.stringify(body)});
    const j = await r.json();
    if(r.ok){ alert('Saved'); loadProps(); } else { alert('Failed: ' + JSON.stringify(j)); }
  }

  return (
    <div style={{padding:20,fontFamily:'system-ui'}}>
      <h2>Property Manager (Codespaces)</h2>
      <div>Status: {status}</div>
      <hr/>
      <div>
        <h3>Login</h3>
        <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button onClick={login}>Login</button>
      </div>
      <hr/>
      <div>
        <button onClick={createSample}>Create property</button>
      </div>
      <h3>Properties</h3>
      <ul>
        {propsList.map(p => <li key={p.id}>{p.id} — {p.title}</li>)}
      </ul>
    </div>
  );
}
