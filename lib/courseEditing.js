'use strict';
function courseFinancials(body, existing={}) {
  const result={...existing,priceVndTotal:body.price_vnd_total===''?null:(Number(body.price_vnd_total)||null),priceNote:String(body.price_note||'').trim()};
  const key=existing.tuition2026?'tuition2026':'classDetails'; const spec={...(existing[key]||{})};
  for(const [field,input] of Object.entries({classSize:'class_size',textbook:'textbook',materials:'materials',instructors:'instructors'}))if(body[input]!==undefined)spec[field]=String(body[input]).trim();
  for(const [field,input] of Object.entries({sessions:'sessions',minutesPerSession:'minutes_per_session',totalHours:'total_hours',estimatedWeeks:'estimated_weeks',minimumStudents:'minimum_students'})){
    if(body[input]!==undefined){if(body[input]==='')delete spec[field];else {const n=Number(body[input]);if(!Number.isFinite(n)||n<0||n>100000)throw new Error('Thông số lớp không hợp lệ.');spec[field]=n;}}
  }
  result[key]=spec;return result;
}
function classFacts(course){const s=course.financials?.tuition2026||course.financials?.classDetails||{};return [s.classSize?`Sĩ số ${s.classSize} học viên.`:'',s.minimumStudents?`Tối thiểu ${s.minimumStudents} học viên để mở lớp.`:'',s.sessions?`${s.sessions} buổi${s.minutesPerSession?`, ${s.minutesPerSession} phút/buổi`:''}${s.totalHours?`, tổng ${s.totalHours} giờ`:''}.`:'',s.textbook?`Giáo trình: ${s.textbook}.`:'',s.materials?`Tài liệu bổ trợ: ${s.materials}.`:''].filter(Boolean).join(' ');}
function courseNarrative(value,spec={}){
  let text=String(value||'');
  if(spec.classSize)text=text.replace(/(sĩ số\s*)(?:\d+\s*[–—-]\s*\d+|\d+)(?=\s*học viên)/gi,(_,lead)=>lead+spec.classSize);
  if(spec.minimumStudents!=null)text=text.replace(/(tối thiểu\s*)\d+(?=\s*học viên)/gi,(_,lead)=>lead+spec.minimumStudents);
  if(spec.textbook)text=text.replace(/(giáo trình\s*)(?:Vitamin|Sejong|Seoul|Sogang)/gi,(_,lead)=>lead+spec.textbook);
  return text;
}
function syncCourseNarratives(body,financials,existing={}){
  const next=financials.tuition2026||financials.classDetails||{};const old=existing.tuition2026||existing.classDetails||{};
  for(const key of ['description','bluf_summary']){
    let text=courseNarrative(body[key],next);
    for(const [field,unit] of [['sessions','buổi'],['minutesPerSession','phút'],['totalHours','giờ'],['estimatedWeeks','tuần']]){
      if(old[field]!=null&&next[field]!=null&&old[field]!==next[field])text=text.replace(new RegExp(`\\b${old[field]}\\s*${unit}(?!\\s*\\/\\s*tuần)`,'gi'),`${next[field]} ${unit}`);
    }
    body[key]=text;
  }
}
module.exports={courseFinancials,classFacts,courseNarrative,syncCourseNarratives};
