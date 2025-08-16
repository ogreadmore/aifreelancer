// Standalone contact form handler (separate from chatbot widget)
(function(){
  function initContactForm(){
    const form = document.getElementById('contact-form');
    const modal = document.getElementById('thank-you-modal');
    const closeBtn = document.getElementById('close-modal-button');
    if (!form || !modal) return;

    function showModal(){
      modal.classList.remove('hidden');
      const content = modal.querySelector('#modal-content');
      if (content){
        content.style.transform = 'scale(0.95)';
        content.style.opacity = '0';
        requestAnimationFrame(()=>{
          content.style.transition = 'all 0.3s ease-out';
          content.style.transform = 'scale(1)';
          content.style.opacity = '1';
        });
      }
    }

    function hideModal(){
      const content = modal.querySelector('#modal-content');
      if (content){
        content.style.transform = 'scale(0.95)';
        content.style.opacity = '0';
        setTimeout(()=> modal.classList.add('hidden'), 300);
      } else {
        modal.classList.add('hidden');
      }
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      const fd = new FormData(form);
      fetch(form.action, { method:'POST', body:fd, headers:{'Accept':'application/json'} })
        .then(resp => {
          if (resp.ok){
            try{ form.reset(); }catch(e){}
            showModal();
            if (typeof window.gtag === 'function') window.gtag('event','form_submit',{form_name:'contact'});
          } else {
            resp.json().then(data => {
              if (Object.hasOwn(data,'errors')) alert(data.errors.map(err=>err.message).join(', '));
              else alert('Sorry, there was a problem sending your message.');
            }).catch(()=> alert('Sorry, there was a problem sending your message.'));
          }
        }).catch(()=> alert('Sorry, there was a problem sending your message.'));
    });

    closeBtn?.addEventListener('click', hideModal);
    modal?.addEventListener('click', e => { if (e.target === modal) hideModal(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initContactForm);
  else initContactForm();
})();

