(function(){
  const MIN_LOADING_TIME = 2000;
  let loadingStartedAt = 0;
  let hideTimer = null;

  function init(){
    if(document.getElementById('aspiraLoading')) return;
    const el=document.createElement('div');
    el.id='aspiraLoading';
    el.className='aspira-loading';
    el.hidden=true;
    el.innerHTML='<div class="aspira-loading-card"><div class="aspira-spinner"></div><strong id="aspiraLoadingText">Menyimpan perubahan...</strong><span>Mohon tunggu sebentar</span></div>';
    document.body.appendChild(el);
  }

  window.showAspiraLoading=function(text){
    init();
    clearTimeout(hideTimer);
    const el=document.getElementById('aspiraLoading');
    document.getElementById('aspiraLoadingText').textContent=text||'Menyimpan perubahan...';
    el.hidden=false;
    document.body.classList.add('is-loading');
    loadingStartedAt=Date.now();
  };

  window.hideAspiraLoading=function(){
    const el=document.getElementById('aspiraLoading');
    if(!el) return;
    const elapsed=Date.now()-loadingStartedAt;
    const remaining=Math.max(0, MIN_LOADING_TIME-elapsed);
    clearTimeout(hideTimer);
    hideTimer=setTimeout(function(){
      el.hidden=true;
      document.body.classList.remove('is-loading');
    }, remaining);
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
