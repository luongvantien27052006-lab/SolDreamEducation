'use strict';
const CONFIRMED_SOURCE='Thống kê nội bộ SolDream. Tỷ lệ visa thành công được tính trong giai đoạn 2019–2026, trên tất cả các loại hồ sơ visa của trung tâm. Chịu trách nhiệm chính: Tiến sĩ Đào Duy Thắng — Giám đốc, Nhà sáng lập.';
function applyConfirmedStats(db){
 const key='owner_confirmed_visa_stats_2019_2026_v1';
 if(db.prepare('SELECT 1 FROM system_meta WHERE key=?').get(key))return null;
 return db.transaction(()=>{
  const previous=db.prepare("SELECT value FROM system_meta WHERE key='homepage_stats_source'").get()?.value||'';
  const generic=!previous||previous==='Thống kê nội bộ SolDream.'||previous==='Số liệu do SOL DREAM EDUCATION công bố và tổng hợp nội bộ; liên hệ trung tâm nếu cần phạm vi và căn cứ thống kê.';
  const value=generic?CONFIRMED_SOURCE:previous+' '+CONFIRMED_SOURCE;
  db.prepare("INSERT INTO system_meta(key,value,updated_at) VALUES ('homepage_stats_source',?,datetime('now','localtime')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").run(value);
  db.prepare('INSERT INTO system_meta(key,value) VALUES (?,?)').run(key,'Owner confirmed scope and responsible person on 2026-10-28');
  return {sourceUpdated:true};
 })();
}
module.exports={applyConfirmedStats,CONFIRMED_SOURCE};
