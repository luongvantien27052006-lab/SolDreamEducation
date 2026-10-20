'use strict';
const {decodeAttributeEntities}=require('./htmlEntities');
function removeSourceUi(html){
  let text=String(html||'');
  text=text.replace(/<(nav|header|footer|aside|script|style|button|select|form)\b[^>]*>[\s\S]*?<\/\1>/gi,' ');
  // Remove balanced containers explicitly marked as site chrome. Do not remove
  // an entire article because its text happens to mention a button or a like.
  const opening=/<(div|section|ul|ol|span|p)\b[^>]*(?:class|id|role|aria-label)=["'][^"']*(?:breadcrumb|breadcrumbs|crumbs|location[_-]?(?:wrap|box|area)|sns[_-]?(?:share|box|area)|share[_-]?(?:tools|buttons|box)|font[_-]?(?:size|tools|control)|text[_-]?size|article[_-]?tools|view[_-]?(?:count|like)|like[_-]?(?:count|button)|print[_-]?(?:btn|button)|toolbar)[^"']*["'][^>]*>/gi;
  const matches=[...text.matchAll(opening)].reverse();
  for(const match of matches){const tags=/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;tags.lastIndex=match.index;let depth=0,tag;while((tag=tags.exec(text))){if(tag[1].toLowerCase()!==match[1].toLowerCase())continue;depth+=/^<\//.test(tag[0])?-1:1;if(!depth){text=text.slice(0,match.index)+' '+text.slice(tags.lastIndex);break;}}}
  return text;
}
function cleanSourceText(value){
  return decodeAttributeEntities(removeSourceUi(value).replace(/<br\s*\/?>|<\/(?:p|div|h[1-6]|li|tr|section)>/gi,'\n').replace(/<[^>]+>/g,' '))
    .replace(/\u00a0/g,' ').split(/\n+/).map(line=>line.replace(/\s+/g,' ').trim())
    .filter(line=>line&&!/^(?:home|trang ch[uủ]|trang chủ|목록|홈|이전|다음|인쇄|공유|글자크기|print|share|back|font size|increase font size|decrease font size|tăng cỡ chữ|giảm cỡ chữ|cỡ chữ|lượt (?:thích|xem)|조회수|좋아요)(?:\s*[:：]?\s*[\d,+−–-]+)?$/i.test(line)
      &&!/^(?:home|trang chủ|홈)\s*(?:[›»>]|\/)/i.test(line)
      &&!/^\d[\d.,\s]*\s*(?:lượt\s+(?:thích|xem)|likes?|views?)$/i.test(line)
      &&!/^[-+Aa\s]+$/.test(line)).join('\n').trim();
}
function truncateAtBoundary(value,maximum=160){
  const text=String(value||'').replace(/\s+/g,' ').trim();if(text.length<=maximum)return text;
  const limit=Math.max(1,maximum-1);const prefix=text.slice(0,limit+1);let cut=text.slice(0,limit);
  if(!/\s/.test(prefix[limit]||'')&&!/\s/.test(prefix[limit-1]||'')){
    if(!cut.includes(' '))return text.split(/\s+/u)[0];
    cut=cut.replace(/\s+\S*$/u,'');
  }
  return cut.trim().replace(/[,;:–—-]+$/u,'').trim()+'…';
}
function automaticDescription(summary,content,maximum=160){
  const preferred=cleanSourceText(summary).replace(/\s+/g,' ').trim();
  return truncateAtBoundary(preferred||cleanSourceText(content),maximum);
}
function storedDescription(item={}){
  return String(item.meta_description||'').trim()||automaticDescription(item.excerpt,item.content);
}
module.exports={removeSourceUi,cleanSourceText,truncateAtBoundary,automaticDescription,storedDescription};
