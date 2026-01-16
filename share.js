function qs(k){ return new URLSearchParams(location.search).get(k); }

function decodePayload(encoded){
  try{
    const raw = atob(encoded);
    const json = decodeURIComponent(raw);
    return JSON.parse(json);
  }catch(e){
    return null;
  }
}

function escapeHtml(s){
  return String(s||'')
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

(function init(){
  const d = qs('d');
  const t = qs('t') || '';

  const payload = d ? decodePayload(d) : null;

  if (!payload){
    document.body.innerHTML = "<div style='padding:18px;font-weight:700'>Invalid share link.</div>";
    return;
  }

  document.getElementById('subtitle').textContent = t ? ("Shared: " + t.replace(/-/g,' ')) : "Shared Property";

  document.getElementById('title').textContent = payload.title || '';
  document.getElementById('area').textContent = payload.area || '';
  document.getElementById('typePill').textContent = payload.type || '';
  document.getElementById('catPill').textContent = payload.category || '';

  // Summary
  document.getElementById('summary').textContent = payload.summary || '';

  // Images
  const imgs = Array.isArray(payload.images) ? payload.images : [];
  const imgSec = document.getElementById('imgSec');
  const imgGrid = document.getElementById('imgGrid');

  if (!imgs.length){
    imgSec.style.display = "none";
  } else {
    imgGrid.innerHTML = imgs.map(src => `<img src="${escapeHtml(src)}"/>`).join('');
  }

  // Attachments
  const atts = Array.isArray(payload.attachments) ? payload.attachments : [];
  const attSec = document.getElementById('attSec');
  const attList = document.getElementById('attList');

  if (!atts.length){
    attSec.style.display = "none";
  } else {
    attList.innerHTML = atts.map(a => {
      const name = escapeHtml(a?.name || "file");
      const src = escapeHtml(a?.src || "");
      return `
        <div class="att">
          <div style="min-width:0;flex:1;">
            <div class="name">${name}</div>
            <div class="src">${src}</div>
          </div>
          <a href="${src}" target="_blank" rel="noopener">Open</a>
        </div>
      `;
    }).join('');
  }

  // Copy text
  document.getElementById('copyBtn').addEventListener('click', async () => {
    const txt =
`Title: ${payload.title || ''}
Area: ${payload.area || ''}
Category: ${payload.category || ''}

Summary:
${payload.summary || ''}`;
    try{
      await navigator.clipboard.writeText(txt);
      alert("Copied!");
    }catch(e){
      alert(txt);
    }
  });

  // open in browser
  document.getElementById('openBtn').addEventListener('click', () => {
    try { window.open(location.href, "_blank"); } catch(_) {}
  });
})();
