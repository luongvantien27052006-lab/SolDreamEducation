'use strict';
function calendarDate(value){
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})/);if(!match)return '';
  const date=new Date(Date.UTC(+match[1],+match[2]-1,+match[3]));
  return date.getUTCFullYear()===+match[1]&&date.getUTCMonth()+1===+match[2]&&date.getUTCDate()===+match[3]?match[0]:'';
}
function publicationEvidence(row,history=[]){
  const exact=String(row.first_published_at||row.published_at||'').trim();
  if(calendarDate(exact))return {value:exact,source:row.publication_date_source||'existing_publication_field',precision:exact.length===10?'date':'timestamp'};
  const ordered=[...history].sort((a,b)=>String(a.observedAt||'').localeCompare(String(b.observedAt||'')));
  for(const item of ordered){const value=String(item.row.first_published_at||item.row.published_at||'').trim();if(calendarDate(value))return {value,source:item.source,precision:value.length===10?'date':'timestamp'};}
  for(const item of ordered){if(Number(item.row.published)!==1)continue;const date=calendarDate(item.row.created_at);if(date)return {value:date,source:item.source+':created_at_date',precision:'date'};}
  // Legacy display records give a calendar date, not a verified publication time.
  const date=Number(row.published)===1?calendarDate(row.created_at):'';
  return date?{value:date,source:'legacy_record_created_at_date',precision:'date'}:null;
}
module.exports={calendarDate,publicationEvidence};
