const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let contacts=[], onlyIssues=false, seq=0, ready=false;
async function api(url,options){const r=await fetch(url,options);let d;try{d=await r.json()}catch{throw Error('Falha na comunicação com o servidor.')}if(!r.ok)throw Error(d.error||'Não foi possível concluir.');return d}
function notify(s){$('#notice').textContent=s}
function whatsappNumber(value, ddd=''){
  const raw=String(value).trim();let digits=raw.replace(/\D/g,'');
  if(raw.startsWith('+')&&!digits.startsWith('55'))return digits.length>=8&&digits.length<=15?digits:null;
  if(digits.startsWith('0055'))digits=digits.slice(4);
  else if(digits.startsWith('55')&&digits.length>=12)digits=digits.slice(2);
  if(digits.startsWith('0')&&[13,14].includes(digits.length))digits=digits.slice(3);
  else if(digits.startsWith('0')&&[11,12].includes(digits.length))digits=digits.slice(1);
  if([8,9].includes(digits.length)){if(!/^[1-9]\d$/.test(ddd))return null;digits=ddd+digits;}
  return /^[1-9]\d{9,10}$/.test(digits)?'55'+digits:null;
}
const whatsappIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.52 3.48A11.9 11.9 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.64a11.9 11.9 0 0 0 5.77 1.47h.01C18.63 23.83 24 18.48 24 11.9c0-3.18-1.24-6.17-3.48-8.42ZM12.05 21.8a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.72.98.99-3.63-.23-.38a9.87 9.87 0 0 1-1.52-5.25c0-5.47 4.45-9.92 9.93-9.92a9.85 9.85 0 0 1 7 2.9 9.83 9.83 0 0 1 2.91 7c0 5.47-4.47 9.89-9.95 9.89Zm5.44-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.22 1.36.19 1.87.11.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z"/></svg>';
function phoneRow(p){const number=whatsappNumber(p);const label='Abrir WhatsApp de '+p;
  const control=number?`<a class="whatsapp" href="https://wa.me/${number}" target="_blank" rel="noopener noreferrer" title="${esc(label)}" aria-label="${esc(label)}">${whatsappIcon}</a>`:`<button type="button" class="whatsapp" data-whatsapp="${esc(p)}" title="Informar DDD ou revisar número para abrir WhatsApp" aria-label="${esc(label)}">${whatsappIcon}</button>`;
  return `<div class="phone-row"><span>${esc(p)}</span>${control}</div>`;
}
$('#results').addEventListener('click',e=>{
  const button=e.target.closest('[data-whatsapp]');if(!button)return;
  const ddd=prompt('Informe o DDD com 2 dígitos para este telefone (ex.: 31).');if(ddd===null)return;
  const number=whatsappNumber(button.dataset.whatsapp,ddd.trim());
  if(!number){alert('Confira o telefone no cadastro. É necessário um número completo, com DDD.');return;}
  window.open('https://wa.me/'+number,'_blank','noopener,noreferrer');
});
function highlight(value){
  const text=String(value??''), tokens=$('#search').value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/\s+/).filter(Boolean);
  let normalized='', positions=[];let offset=0;
  for(const char of text){const n=char.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();normalized+=n;for(let i=0;i<n.length;i++)positions.push([offset,offset+char.length]);offset+=char.length;}
  const selected=new Set();
  for(const token of tokens){let at=normalized.indexOf(token);while(at!==-1){for(let j=at;j<at+token.length;j++)for(let k=positions[j][0];k<positions[j][1];k++)selected.add(k);at=normalized.indexOf(token,at+1);}}
  let html='',active=false;
  for(let i=0;i<text.length;i++){const hit=selected.has(i);if(hit!==active){html+=hit?'<mark>':'</mark>';active=hit;}html+=esc(text[i]);}
  return html+(active?'</mark>':'');
}
async function refresh(){const n=++seq;try{let rows=await api('/api/contacts?q='+encodeURIComponent($('#search').value)+'&issues='+(onlyIssues?'1':'0'));if(n!==seq)return;contacts=rows;$('#count').textContent=rows.length+' contatos encontrados';$('#results').innerHTML=rows.length?rows.map(d=>`<article class="contact" tabindex="0" role="button" data-id="${d.id}" aria-label="Editar ${esc(d.name)}"><div class="avatar">${esc(d.name.split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase())}</div><div class="contact-info"><h3>${highlight(d.name)}</h3><p>${esc([d.company,d.department,d.title].filter(Boolean).join(' · ')||d.emails||'Sem informações adicionais')}</p><div class="source">${esc(d.sources.join(' · '))}</div></div><div class="numbers">${d.phones.map(phoneRow).join('')}${d.checks.some(p=>p.issue)?'<span class="badge">Revisar telefone</span>':''}</div></article>`).join(''):'<div class="empty">Nenhum contato encontrado. Importe uma planilha ou cadastre um contato.</div>'}catch(e){notify(e.message)}}
let timer;$('#search').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(refresh,140)});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus()}});
function mode(flag){onlyIssues=flag;$('#heading').textContent=flag?'Telefones para revisar':'Todos os contatos';$('#all').classList.toggle('active',!flag);$('#issues').classList.toggle('active',flag);refresh()}
$('#all').onclick=()=>mode(false);$('#issues').onclick=()=>mode(true);
function openEditor(d={}){const f=$('#contactForm');f.reset();for(const k of ['id','revision','name','company','department','title','emails','notes'])f.elements[k].value=d[k]??'';f.elements.phones.value=(d.phones||[]).join('\n');$('#editTitle').textContent=d.id?'Detalhes do contato':'Novo contato';$('#sourceInfo').textContent=d.sources?'Origens: '+d.sources.join(', '):'';$('#phoneCheck').textContent=(d.checks||[]).filter(p=>p.issue).map(p=>p.value+': '+p.issue).join(' • ');$('#editor').showModal()}
$('#new').onclick=()=>openEditor();$('#results').onclick=e=>{if(e.target.closest('.numbers'))return;const row=e.target.closest('[data-id]');if(row)openEditor(contacts.find(d=>d.id===Number(row.dataset.id)))};$('#results').onkeydown=e=>{if(e.key==='Enter'&&e.target.matches('.contact'))e.target.click()};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#contactForm').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.revision=Number(d.revision);try{await api('/api/contacts'+(d.id?'/'+d.id:''),{method:d.id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});$('#editor').close();notify('Contato salvo.');refresh()}catch(e){alert(e.message)}};
$('#importBtn').onclick=async()=>{ready=false;$('#preview').textContent='';$('#importSubmit').textContent='Verificar arquivo';$('#importDialog').showModal();try{const h=await api('/api/imports');$('#sources').innerHTML=[...new Set(h.map(x=>x.source))].map(s=>`<option value="${esc(s)}">`).join('')}catch(e){notify(e.message)}};
$('#importForm').oninput=()=>{ready=false;$('#preview').textContent='';$('#importSubmit').textContent='Verificar arquivo'};
$('#importForm').onsubmit=async e=>{e.preventDefault();const button=$('#importSubmit');button.disabled=true;const data=new FormData(e.target);data.append('preview',ready?'0':'1');try{const r=await api('/api/import',{method:'POST',body:data});if(!ready){$('#preview').innerHTML=`<strong>${r.total} contatos lidos</strong><br>${r.issues} contatos com telefones para revisar.<br>Exemplos: ${r.sample.map(d=>esc(d.name)).join(', ')}<p>Contatos existentes e edições manuais serão preservados. Nomes iguais com telefone ou e-mail em comum serão consolidados. Demais registros serão mantidos separados.</p>`;ready=true;button.textContent='Confirmar importação'}else{$('#importDialog').close();notify(`Importação concluída: ${r.added} novos, ${r.updated} atualizados, ${r.skipped} sem alteração.`);refresh()}}catch(e){alert(e.message)}finally{button.disabled=false}};
$('#historyBtn').onclick=async()=>{try{const rows=await api('/api/imports');$('#history').innerHTML=rows.map(r=>`<div class="history-row"><strong>${esc(r.source)}</strong> · ${esc(r.created.replace('T',' '))}<br>${esc(r.filename)}<br>${r.added} novos · ${r.updated} atualizados · ${r.skipped} sem alteração</div>`).join('')||'Nenhuma importação realizada.';$('#historyDialog').showModal()}catch(e){notify(e.message)}};
$('#backup').onclick=async()=>{try{notify((await api('/api/backup',{method:'POST'})).message)}catch(e){notify(e.message)}};
refresh();
