const icons={home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',phone:'<path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z"/>',calc:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h1m3 0h1m3 0h.1M8 15h1m3 0h1m3 0h.1M8 19h1m3 0h1m3 0h.1"/>',link:'<path d="m10 13 4-4m-5 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>'};
icons.calendar='<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 10h18"/>';
icons.classes='<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20M9 10v10M15 10v10"/>';
icons.notice='<path d="M4 10v5h4l10 5V5L8 10zM8 15l2 6h3"/>';
function icon(name){return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;}
const current=document.body.dataset.page;
document.getElementById('sidebar').innerHTML=`<button id="sidebarToggle" class="sidebar-toggle" type="button" aria-controls="sidebarNavigation" aria-expanded="true" aria-label="Recolher menu" title="Recolher menu">‹</button><a class="sidebar-brand" href="/" aria-label="Number One — Início"><img class="logo" src="/static/number-one.svg" alt="Number One — Inglês Completo"></a><div class="unit">LAGOA SANTA</div><div class="nav-label">ESPAÇO DA EQUIPE</div><nav id="sidebarNavigation" aria-label="Navegação principal">${[['home','/','Início'],['phone','/lista-telefonica','Lista telefônica'],['calc','/calculadora','Calculadora de multa'],['link','/links','Links úteis'],['calendar','/calendario','Datas importantes'],['classes','/mapa-de-turmas','Mapa de turmas'],['notice','/avisos','Avisos da escola']].map(([key,url,label])=>`<a href="${url}" title="${label}" aria-label="${label}" ${key===current?'class="active" aria-current="page"':''}>${icon(key)}<span class="nav-text">${label}</span></a>`).join('')}</nav><div class="sidebar-footer">Uma equipe. Muitas conexões.<br><b>Let’s move forward, together.</b></div>`;
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const dateLabel=document.getElementById('currentDate');if(dateLabel)dateLabel.textContent=new Date().toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});
async function api(url,options={}){const response=await fetch(url,options);if(!response.ok){let message='Não foi possível concluir. Tente novamente.';try{message=(await response.json()).error||message;}catch{}throw new Error(message);}return response.json();}
function element(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}

const sidebarToggle = document.getElementById('sidebarToggle');
function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
  const label = collapsed ? 'Expandir menu' : 'Recolher menu';
  sidebarToggle.setAttribute('aria-label', label);
  sidebarToggle.title = label;
  sidebarToggle.textContent = collapsed ? '›' : '‹';
}
try { setSidebarCollapsed(localStorage.getItem('numberOneSidebarCollapsed') === 'true'); } catch {}
sidebarToggle.onclick = () => {
  const collapsed = !document.body.classList.contains('sidebar-collapsed');
  setSidebarCollapsed(collapsed);
  try { localStorage.setItem('numberOneSidebarCollapsed', String(collapsed)); } catch {}
};
