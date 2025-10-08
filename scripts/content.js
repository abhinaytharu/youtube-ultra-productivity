(function(){
  const STORAGE_KEY = 'ytMinimalEnabled';
  const TOGGLE_ID = 'yt-minimal-topbar-toggle';

  function applyState(enabled){
    if(enabled){
      document.documentElement.setAttribute('data-yt-minimal','on');
      document.documentElement.classList.add('yt-minimal-on');
    }else{
      document.documentElement.removeAttribute('data-yt-minimal');
      document.documentElement.classList.remove('yt-minimal-on');
    }
  }

  function getStoredEnabled(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw === null) return true;
      return raw === 'true';
    }catch(_e){ return true; }
  }

  function setStoredEnabled(val){
    try{ localStorage.setItem(STORAGE_KEY, String(val)); }catch(_e){}
  }

  function ensureTopbarToggle(currentEnabled){
    let host = document.querySelector('ytd-masthead #end #buttons') || document.querySelector('ytd-masthead #end');
    if(!host) return;
    let btn = document.getElementById(TOGGLE_ID);
    if(!btn){
      btn = document.createElement('button');
      btn.id = TOGGLE_ID;
      btn.type = 'button';
      btn.addEventListener('click', ()=>{
        const next = !getStoredEnabled();
        setStoredEnabled(next);
        applyState(next);
        updateToggleText(btn, next);
        // debug: log attribute and storage state so we can verify behavior in console
        try{
          console.log('yt-minimal toggle clicked ->', next, 'data-yt-minimal=', document.documentElement.getAttribute('data-yt-minimal'), 'localStorage=', localStorage.getItem(STORAGE_KEY));
        }catch(e){}
      });
      host.appendChild(btn);
    }
    updateToggleText(btn, currentEnabled);
  }

  function updateToggleText(btn, enabled){
    btn.textContent = enabled ? 'Minimal: On' : 'Minimal: Off';
    btn.setAttribute('aria-pressed', String(enabled));
    // expose a data-state attribute the CSS targets (data-state='on')
    btn.setAttribute('data-state', enabled ? 'on' : 'off');
  }

  function applyAndMount(){
    const enabled = getStoredEnabled();
    applyState(enabled);
    ensureTopbarToggle(enabled);
  }

  function init(){
    applyAndMount();
    let last = location.href;
    const obs = new MutationObserver(()=>{
      const urlChanged = location.href !== last;
      const needsBtn = !document.getElementById(TOGGLE_ID);
      if(urlChanged || needsBtn){
        last = location.href;
        setTimeout(applyAndMount, 250);
      }
    });
    obs.observe(document, {subtree:true, childList:true});
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();


