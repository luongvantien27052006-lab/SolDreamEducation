// Mobile menu
var burger=document.getElementById('burger'),menu=document.getElementById('menu'),backdrop=document.getElementById('backdrop'),menuClose=document.getElementById('menu-close');
function setMenu(open){
  if(!burger||!menu)return;
  document.body.classList.toggle('nav-open',open);
  menu.classList.toggle('open',open);
  burger.setAttribute('aria-expanded',String(open));
  burger.setAttribute('aria-label',open?'Đóng menu':'Mở menu');
}
function toggleMenu(){setMenu(!document.body.classList.contains('nav-open'));}
if(burger&&menu){
  burger.addEventListener('click',toggleMenu);
  if(menuClose)menuClose.addEventListener('click',function(){setMenu(false);});
  if(backdrop)backdrop.addEventListener('click',function(){setMenu(false);});
  menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){setMenu(false);});});
  document.addEventListener('keydown',function(event){if(event.key==='Escape')setMenu(false);});
  window.addEventListener('resize',function(){if(window.innerWidth>720)setMenu(false);});
}

// Scroll reveal
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
document.querySelectorAll('.reveal').forEach(function(el){io.observe(el);});

// Ảnh bìa từ nguồn bên ngoài có thể chặn hot-link hoặc hết hạn. Đổi sang logo
// cục bộ ngay trong lần tải lỗi để giao diện không bao giờ hiện biểu tượng ảnh vỡ.
document.addEventListener('error',function(event){
  var image=event.target;
  if(!image||image.tagName!=='IMG'||!image.classList.contains('post__cover')||image.dataset.coverFallback==='1')return;
  image.dataset.coverFallback='1';
  image.classList.add('post__cover--fallback');
  image.src='/img/research-cover.svg';
},{capture:true});

// Count-up stats
function animCount(el){
  var target=+el.dataset.count,prefix=el.dataset.prefix||'',suffix=el.dataset.suffix||'',dur=1400,start=0,t0=null;
  function fmt(n){return n>=1000?n.toLocaleString('vi-VN'):n;}
  function step(ts){if(!t0)t0=ts;var p=Math.min((ts-t0)/dur,1);var v=Math.floor(start+(target-start)*(1-Math.pow(1-p,3)));el.textContent=prefix+fmt(v)+suffix;if(p<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
}
var sObs=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){animCount(e.target.querySelector('b'));sObs.unobserve(e.target);}});},{threshold:.5});
document.querySelectorAll('.stats .stat').forEach(function(s){sObs.observe(s);});

// Brand journey motion: the boarding pass becomes a plane; the timeline starts only when scrolled into view.
var flightTicket=document.querySelector('[data-flight-ticket]'),flightStage=flightTicket&&flightTicket.closest('.hero__visual'),flightPlane=flightStage&&flightStage.querySelector('.ticket-flight__plane'),hcmMarker=flightStage&&flightStage.querySelector('[data-hcm-marker]'),seoulMarker=flightStage&&flightStage.querySelector('[data-seoul-marker]'),journey=document.querySelector('[data-journey]'),flightTimer=null,planeMotion=null;
function playJourney(){if(!journey)return;journey.classList.remove('journey--active');void journey.offsetWidth;journey.classList.add('journey--active');}
function resetFlight(){if(!flightStage||!flightTicket)return;if(planeMotion){planeMotion.cancel();planeMotion=null;}flightStage.classList.remove('flight-sequence','flight-sequence--fallback');['--flight-sx','--flight-sy','--flight-dx','--flight-dy','--flight-angle'].forEach(function(name){flightStage.style.removeProperty(name);});flightTicket.removeAttribute('aria-disabled');flightTimer=null;}
function animateFlightPlane(){
  if(!flightPlane||!hcmMarker||!seoulMarker)return;
  var from=flightPlane.getBoundingClientRect(),start=hcmMarker.getBoundingClientRect(),to=seoulMarker.getBoundingClientRect();
  var baseX=from.left+from.width/2,baseY=from.top+from.height/2;
  var sx=start.left+start.width/2-baseX,sy=start.top+start.height/2-baseY;
  var dx=to.left+to.width/2-baseX,dy=to.top+to.height/2-baseY;
  var landingAngle=Math.atan2(dy-sy,dx-sx)*180/Math.PI+90;
  flightStage.style.setProperty('--flight-sx',sx.toFixed(2)+'px');flightStage.style.setProperty('--flight-sy',sy.toFixed(2)+'px');flightStage.style.setProperty('--flight-dx',dx.toFixed(2)+'px');flightStage.style.setProperty('--flight-dy',dy.toFixed(2)+'px');flightStage.style.setProperty('--flight-angle',landingAngle.toFixed(2)+'deg');
  if(typeof flightPlane.animate!=='function'){flightStage.classList.add('flight-sequence--fallback');return;}
  var frames=[],count=84,distanceX=dx-sx,distanceY=dy-sy,arch=Math.max(34,Math.min(92,Math.abs(distanceX)*.2));
  for(var i=0;i<=count;i++){
    var p=i/count,u=Math.min(1,Math.max(0,(p-.06)/.88)),t=u*u*(3-2*u),inv=1-t;
    var c1x=sx+distanceX*.27,c1y=sy-arch,c2x=sx+distanceX*.73,c2y=dy-arch*.36;
    var x=inv*inv*inv*sx+3*inv*inv*t*c1x+3*inv*t*t*c2x+t*t*t*dx;
    var y=inv*inv*inv*sy+3*inv*inv*t*c1y+3*inv*t*t*c2y+t*t*t*dy;
    var vx=3*inv*inv*(c1x-sx)+6*inv*t*(c2x-c1x)+3*t*t*(dx-c2x);
    var vy=3*inv*inv*(c1y-sy)+6*inv*t*(c2y-c1y)+3*t*t*(dy-c2y);
    var angle=Math.atan2(vy,vx)*180/Math.PI+90;
    var scale=u<.14?.18+u*4.8:.85-(Math.max(0,u-.76)/.24)*.34;
    var opacity=p<.045?p/.045:(p>.94?Math.max(0,(1-p)/.06):1);
    frames.push({offset:p,opacity:opacity,transform:'translate3d('+x.toFixed(2)+'px,'+y.toFixed(2)+'px,0) rotate('+angle.toFixed(2)+'deg) scale('+scale.toFixed(3)+')'});
  }
  planeMotion=flightPlane.animate(frames,{duration:3300,delay:820,easing:'linear',fill:'both'});
}
function launchFlight(){
  if(!flightTicket||!flightStage||flightStage.classList.contains('flight-sequence'))return;
  if(flightTimer)clearTimeout(flightTimer);
  flightTicket.setAttribute('aria-disabled','true');
  flightStage.classList.remove('flight-sequence');void flightStage.offsetWidth;flightStage.classList.add('flight-sequence');
  requestAnimationFrame(animateFlightPlane);
  flightTimer=setTimeout(resetFlight,4600);
}
if(flightTicket){flightTicket.addEventListener('click',launchFlight);flightTicket.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();launchFlight();}});}
if(journey){var journeyObserver=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){playJourney();journeyObserver.unobserve(entry.target);}});},{threshold:.24});journeyObserver.observe(journey);}

// Consultation forms: the home form and the delayed content pop-up share one safe flow.
document.querySelectorAll('[data-lead-form]').forEach(function(leadForm){
  var formStartedAt=leadForm.querySelector('[name="formStartedAt"]'),button=leadForm.querySelector('[data-lead-submit]'),status=leadForm.querySelector('[data-lead-status]'),defaultButtonText=button?button.textContent:'Gửi đăng ký';
  var interestSelect=leadForm.querySelector('[data-interest-select]'),detailField=leadForm.querySelector('[data-interest-detail-field]'),detailInput=leadForm.querySelector('[data-interest-detail]'),detailLabel=leadForm.querySelector('[data-interest-detail-label]');
  function syncInterestDetail(){
    if(!interestSelect||!detailField||!detailInput)return;
    var value=interestSelect.value||'',isSchool=/thông tin trường/i.test(value),isStudy=/du học|chương trình/i.test(value),show=isSchool||isStudy;
    detailField.hidden=!show;detailInput.disabled=!show;detailInput.required=isSchool;
    if(isSchool){detailLabel.textContent='Bạn muốn nhận thông tin trường nào?';detailInput.placeholder='Ví dụ: Đại học Hannam';}
    else if(isStudy){detailLabel.textContent='Bạn muốn tìm hiểu chương trình hoặc kỳ tuyển sinh nào?';detailInput.placeholder='Ví dụ: Hệ tiếng kỳ tháng 9';}
  }
  if(interestSelect){interestSelect.addEventListener('change',syncInterestDetail);syncInterestDetail();}
  if(formStartedAt)formStartedAt.value=String(Date.now());
  leadForm.addEventListener('submit',async function(event){
    event.preventDefault();button.disabled=true;button.textContent='Đang gửi…';status.textContent='';
    var data=Object.fromEntries(new FormData(leadForm).entries());data.sourcePath=location.pathname;var sent=false;
    try{var response=await fetch('/api/contact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});var payload=await response.json();if(!response.ok)throw new Error(payload.error||'Không thể gửi yêu cầu.');status.textContent=payload.message;status.classList.add('success');leadForm.reset();sent=true;try{localStorage.setItem('soldream-lead-popup-completed',String(Date.now()));}catch(e){}}
    catch(error){status.textContent=error.message+' Bạn có thể gọi Hotline 0364 648 282.';status.classList.remove('success');}
    finally{button.disabled=sent;button.textContent=sent?'Đã gửi đăng ký':defaultButtonText;if(sent)setTimeout(syncInterestDetail,0);if(!sent&&formStartedAt)formStartedAt.value=String(Date.now());}
  });
});

// Keep wide data tables inside their article instead of widening the mobile page.
document.querySelectorAll('main table').forEach(function(table){
  if(table.parentElement&&table.parentElement.classList.contains('table-scroll'))return;
  if(table.closest('.knowledge-table-wrap,.chatbot__table-wrap'))return;
  var scroller=document.createElement('div');scroller.className='table-scroll';scroller.tabIndex=0;scroller.setAttribute('aria-label','Bảng thông tin, vuốt ngang để xem đầy đủ');
  table.parentNode.insertBefore(scroller,table);scroller.appendChild(table);
});

// Admin-configured site pop-up.
var sitePopup=document.querySelector('[data-site-popup]');
if(sitePopup){
  var popupKey='soldream-popup-'+sitePopup.dataset.popupId,showOnce=sitePopup.dataset.popupOnce==='1';
  function closePopup(){sitePopup.hidden=true;document.body.classList.remove('popup-open');if(showOnce)try{localStorage.setItem(popupKey,'1');}catch(e){}}
  function openPopup(){sitePopup.hidden=false;document.body.classList.add('popup-open');var close=sitePopup.querySelector('.site-popup__close');if(close)close.focus();}
  var already=false;try{already=showOnce&&localStorage.getItem(popupKey)==='1';}catch(e){}
  if(!already)setTimeout(openPopup,Math.max(0,Number(sitePopup.dataset.popupDelay)||0)*1000);
  sitePopup.querySelectorAll('[data-popup-close]').forEach(function(button){button.addEventListener('click',closePopup);});
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!sitePopup.hidden)closePopup();});
}

// Show the admin-configured information-registration form on detail pages only.
var leadPopup=document.querySelector('[data-lead-popup]');
if(leadPopup&&/^\/(?:tin-tuc|du-hoc|truong-dai-hoc|khoa-hoc)\/.+/.test(location.pathname)){
  var leadPopupKey='soldream-lead-popup-completed',dismissKey='soldream-lead-popup-dismissed-session',remindKey='soldream-lead-popup-remind-at',lastCompleted=0,dismissed=false,remindAt=0,leadPopupTimer;
  try{lastCompleted=Number(localStorage.getItem(leadPopupKey)||0);dismissed=sessionStorage.getItem(dismissKey)==='1';remindAt=Number(sessionStorage.getItem(remindKey)||0);}catch(e){}
  function closeLeadPopup(){leadPopup.hidden=true;if(!document.querySelector('.site-popup:not([hidden])'))document.body.classList.remove('popup-open');}
  function openLeadPopup(){leadPopup.hidden=false;document.body.classList.add('popup-open');var field=leadPopup.querySelector('input[name="name"]');if(field)field.focus();}
  function scheduleLeadPopup(delay){if(leadPopupTimer)clearTimeout(leadPopupTimer);leadPopupTimer=setTimeout(openLeadPopup,Math.max(0,delay));}
  if((!lastCompleted||Date.now()-lastCompleted>7*24*60*60*1000)&&!dismissed){var initialDelay=Math.max(0,Number(leadPopup.dataset.popupDelay)||0)*1000;scheduleLeadPopup(remindAt>Date.now()?remindAt-Date.now():initialDelay);}
  leadPopup.querySelectorAll('[data-lead-popup-close]').forEach(function(button){button.addEventListener('click',closeLeadPopup);});
  var dismissButton=leadPopup.querySelector('[data-lead-dismiss-session]');if(dismissButton)dismissButton.addEventListener('click',function(){try{sessionStorage.setItem(dismissKey,'1');sessionStorage.removeItem(remindKey);}catch(e){}if(leadPopupTimer)clearTimeout(leadPopupTimer);closeLeadPopup();});
  var remindButton=leadPopup.querySelector('[data-lead-remind]');if(remindButton)remindButton.addEventListener('click',function(){var next=Date.now()+10*60*1000;try{sessionStorage.setItem(remindKey,String(next));}catch(e){}closeLeadPopup();scheduleLeadPopup(10*60*1000);});
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!leadPopup.hidden)closeLeadPopup();});
}
