document.documentElement.classList.add('js');
document.querySelectorAll('[data-print]').forEach(button=>button.addEventListener('click',()=>window.print()));
document.querySelectorAll('.copy-button').forEach(button=>button.addEventListener('click',async()=>{
 const box=button.closest('.draft');
 const text=[...box.querySelectorAll('blockquote p')].map(p=>p.textContent).join('\n\n');
 const status=box.querySelector('.copy-status');
 try{await navigator.clipboard.writeText(text);status.textContent='Copied';}
 catch{const range=document.createRange();range.selectNodeContents(box.querySelector('blockquote'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);status.textContent='Text selected — copy to use.';}
}));
const sections=[...document.querySelectorAll('.report-section')];
const links=[...document.querySelectorAll('.toc a[href^="#"]')];
const progress=document.querySelector('.reading-progress');
let scheduled=false;
function update(){
 scheduled=false;
 if(progress){const max=document.documentElement.scrollHeight-window.innerHeight;progress.style.width=`${max>0?Math.min(100,window.scrollY/max*100):0}%`;progress.style.top=document.querySelector('.site-header').getBoundingClientRect().height+'px';}
 if(sections.length){const current=sections.filter(s=>s.getBoundingClientRect().top<window.innerHeight*.4).at(-1)||sections[0];for(const a of links){const active=a.hash==='#'+current.dataset.section;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}}
}
window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true});
window.addEventListener('resize',update);update();
window.addEventListener('beforeprint',()=>document.querySelectorAll('details').forEach(d=>{d.dataset.wasOpen=d.open?'true':'false';d.open=true;}));
window.addEventListener('afterprint',()=>document.querySelectorAll('details').forEach(d=>{d.open=d.dataset.wasOpen==='true';delete d.dataset.wasOpen;}));
