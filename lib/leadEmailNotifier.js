'use strict';
const crypto=require('crypto');
const db=require('../db');
const {waitForResendSlot}=require('./resendRateLimit');
const MAX_ATTEMPTS=5;
let delivering=false,deliveryRequested=false;
function configuration(){
  const recipient=String(process.env.LEAD_EMAIL_TO||'thangdd@ueh.edu.vn').trim();
  const from=String(process.env.LEAD_EMAIL_FROM||process.env.SUBSCRIBER_EMAIL_FROM||'').trim();
  const apiKey=String(process.env.RESEND_API_KEY||'').trim();
  return {recipient,from,apiKey,configured:!!apiKey&&!!from&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient)};
}
function publicConfiguration(){const {recipient,from,configured}=configuration();return {recipient,from,configured};}
function queueLeadEmail(leadId){
  const now=new Date().toISOString();
  db.prepare(`INSERT OR IGNORE INTO lead_email_notifications(lead_id,recipient,idempotency_key,created_at,updated_at) VALUES(?,?,?,?,?)`)
    .run(leadId,configuration().recipient,'new-lead/'+leadId+'/'+crypto.randomUUID(),now,now);
}
const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function emailPayload(row){
  const base=String(process.env.BASE_URL||process.env.SITE_URL||'https://soldream.edu.vn').replace(/\/$/,'');
  const group={course:'Tư vấn khóa học',study_abroad:'Tư vấn chương trình du học',school_info:'Đăng ký nhận thông tin trường'}[row.lead_type]||'Tư vấn';
  const sourcePath=/^\/(?!\/)/.test(row.source_path||'')?row.source_path:'/';
  const fields=[['Nhóm đăng ký',group],['Họ và tên',row.name],['Điện thoại',row.phone],['Email',row.email],['Nhu cầu',row.interest],['Thông tin cụ thể',row.interest_detail],['Trang đăng ký',row.source_title||sourcePath],['Thời gian',new Date(row.notification_created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})]].filter(([,value])=>value);
  const subject='[SolDream] Đăng ký tư vấn mới #'+row.lead_id+' – '+String(row.name).replace(/[\r\n]+/g,' ');
  const html='<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2c1b3d;max-width:680px;margin:auto"><h1 style="font-size:24px">Có đăng ký tư vấn mới</h1><table style="border-collapse:collapse;width:100%">'+fields.map(([label,value])=>'<tr><th style="padding:10px;border-bottom:1px solid #eee;text-align:left;vertical-align:top">'+escape(label)+'</th><td style="padding:10px;border-bottom:1px solid #eee">'+escape(value)+'</td></tr>').join('')+'</table><p><a href="'+escape(base+'/admin/lien-he')+'">Mở yêu cầu liên hệ trong CMS</a></p><p><a href="'+escape(base+sourcePath)+'">Xem trang người đăng ký quan tâm</a></p></div>';
  return {to:[row.recipient],subject,html,text:'Có đăng ký tư vấn mới\n\n'+fields.map(([label,value])=>label+': '+value).join('\n')+'\n\nQuản lý: '+base+'/admin/lien-he',...(row.email?{reply_to:row.email}:{})};
}
async function deliverPendingLeadEmails(limit=5){
  const config=configuration();if(!config.configured)return {configured:false,sent:0,failed:0};
  if(delivering){deliveryRequested=true;return {configured:true,sent:0,failed:0};}
  delivering=true;let sent=0,failed=0;
  try{
    const now=Date.now();
    db.prepare("UPDATE lead_email_notifications SET status=CASE WHEN attempts>=? THEN 'failed' ELSE 'pending' END,lease_until_ms=0 WHERE status='sending' AND lease_until_ms<?").run(MAX_ATTEMPTS,now);
    const rows=db.prepare(`SELECT n.*,n.created_at notification_created_at,l.name,l.phone,l.email,l.interest,l.interest_detail,l.lead_type,l.source_path,l.source_title FROM lead_email_notifications n JOIN leads l ON l.id=n.lead_id WHERE n.status='pending' AND n.attempts<? AND n.next_attempt_ms<=? ORDER BY n.created_at LIMIT ?`).all(MAX_ATTEMPTS,now,Math.max(1,Math.min(20,Number(limit)||5)));
    for(const row of rows){
      const claimed=db.prepare("UPDATE lead_email_notifications SET status='sending',attempts=attempts+1,lease_until_ms=?,updated_at=? WHERE lead_id=? AND status='pending' AND next_attempt_ms<=?").run(Date.now()+120000,new Date().toISOString(),row.lead_id,Date.now());
      if(!claimed.changes)continue;
      await waitForResendSlot();
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
      try{
        const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+config.apiKey,'Idempotency-Key':row.idempotency_key},body:JSON.stringify({from:config.from,...emailPayload(row)}),signal:controller.signal});
        const body=await response.json().catch(()=>({}));
        if(!response.ok||!body.id)throw new Error('Resend HTTP '+response.status+(/^[a-z_]{1,60}$/i.test(body.name||'')?' ('+body.name+')':''));
        const stamp=new Date().toISOString();db.prepare("UPDATE lead_email_notifications SET status='sent',provider_message_id=?,sent_at=?,last_error='',lease_until_ms=0,updated_at=? WHERE lead_id=?").run(String(body.id),stamp,stamp,row.lead_id);sent++;
      }catch(error){
        const attempts=row.attempts+1;
        const message=error.name==='AbortError'?'Resend chưa phản hồi trong thời gian chờ.':/^Resend HTTP \d+/.test(error.message)?error.message:'Chưa kết nối được dịch vụ gửi email.';
        db.prepare("UPDATE lead_email_notifications SET status=?,next_attempt_ms=?,last_error=?,lease_until_ms=0,updated_at=? WHERE lead_id=?").run(attempts>=MAX_ATTEMPTS?'failed':'pending',Date.now()+Math.min(3600000,60000*2**(attempts-1)),message,new Date().toISOString(),row.lead_id);failed++;
      }finally{clearTimeout(timer);}
      if(rows.length>1)await new Promise(resolve=>setTimeout(resolve,650));
    }
  }finally{delivering=false;if(deliveryRequested){deliveryRequested=false;requestDelivery();}}
  return {configured:true,sent,failed};
}
function requestDelivery(){setImmediate(()=>deliverPendingLeadEmails().catch(error=>console.error('[lead-email]',error.message)));}
function retryLeadEmail(leadId){
  queueLeadEmail(leadId);
  db.prepare("UPDATE lead_email_notifications SET status='pending',attempts=0,next_attempt_ms=0,last_error='',updated_at=? WHERE lead_id=? AND status='failed'").run(new Date().toISOString(),leadId);
  requestDelivery();
}
function startLeadEmailWorker(){
  const run=()=>deliverPendingLeadEmails().catch(error=>console.error('[lead-email]',error.message));
  const timer=setInterval(run,30000);timer.unref?.();setTimeout(run,5000).unref?.();return timer;
}
module.exports={queueLeadEmail,deliverPendingLeadEmails,requestDelivery,retryLeadEmail,startLeadEmailWorker,publicConfiguration,emailPayload};
