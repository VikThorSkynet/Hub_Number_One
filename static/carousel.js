(() => {
  const card=document.getElementById('noticeCarousel'), content=document.getElementById('slideContent');
  const status=document.getElementById('carouselStatus');
  const welcome={id:0,title:'Seu dia começa aqui.',body:'Pessoas, ferramentas e informações. Tudo conectado para a nossa equipe.',color:'purple',seconds:8};
  let slides=[welcome], index=0, timer;
  function schedule(){clearTimeout(timer);if(slides.length>1)timer=setTimeout(()=>show((index+1)%slides.length),slides[index].seconds*1000);}
  function show(next){index=next;const slide=slides[index];card.dataset.color=slide.color;content.replaceChildren(element('div','eyebrow','NUMBER ONE · LAGOA SANTA'),element('h1','',slide.title),element('p','',slide.body));const stamp=element('span','hero-stamp','#1');stamp.setAttribute('aria-hidden','true');content.append(stamp);card.setAttribute('aria-label',`Avisos da escola, card ${index+1} de ${slides.length}`);schedule();}
  async function load(){try{const notices=await api('/api/notices');const next=[welcome,...notices];if(JSON.stringify(next)!==JSON.stringify(slides)){const currentId=slides[index].id;slides=next;show(Math.max(0,slides.findIndex(slide=>slide.id===currentId)));}status.textContent='';}catch{status.textContent='Não foi possível atualizar os avisos. Tentaremos novamente em instantes.';}}
  load();setInterval(()=>{if(!document.hidden)load();},30000);
})();
