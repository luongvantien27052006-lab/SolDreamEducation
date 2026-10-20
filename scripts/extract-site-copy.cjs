'use strict';
// One-time source migration. Defaults are versioned separately from CMS values.
const fs=require('fs'),path=require('path');
if(fs.readFileSync('views/courses.ejs','utf8').includes('siteText('))throw new Error('Source extraction has already been applied. Maintain data/site-copy.json directly.');
const entries=JSON.parse(fs.readFileSync('data/site-copy.json','utf8'));
const groupNames={header:'Menu và thương hiệu',footer:'Chân trang',head:'SEO chung',chatbot:'Nút trợ lý',layout:'Giao diện chung',about:'Giới thiệu',courses:'Danh sách khóa học','course-detail':'Chi tiết khóa học','duhoc-list':'Danh sách du học','duhoc-detail':'Chi tiết du học','news-list':'Danh sách cẩm nang','news-detail':'Chi tiết bài viết',faq:'Hỏi đáp','korea-life':'Sinh hoạt Hàn Quốc','universities-list':'Danh sách trường','university-detail':'Hồ sơ trường', 'chat-page':'Trang trợ lý','404':'Trang không tìm thấy'};
function add(key,group,label,value,kind='text'){
 if(!entries.some(row=>row.key===key))entries.push({key,group_name:group,label,kind,value});
 return `siteText(${JSON.stringify(key)})`;
}
function decode(value){return value.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[\da-f]+|\d+);/gi,e=>({ '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':'\u00a0'}[e]||String.fromCodePoint(parseInt(e.slice(/^&#x/i.test(e)?3:2,-1),/^&#x/i.test(e)?16:10))));}
const files=fs.readdirSync('views').filter(f=>f.endsWith('.ejs')).map(f=>'views/'+f).concat(...['partials','home-sections'].map(dir=>fs.readdirSync('views/'+dir).filter(f=>f.endsWith('.ejs')).map(f=>'views/'+dir+'/'+f)));
for(const file of files){
 let count=0,parent='';const basename=path.basename(file,'.ejs');const group=groupNames[basename]||(file.includes('home-sections')?'Trang chủ – '+basename:'Giao diện chung');
 const key=()=>`view.${file.slice(6,-4).replaceAll('/','.')}.${String(++count).padStart(3,'0')}`;
 let s=fs.readFileSync(file,'utf8');const tokens=[];
 // EJS expressions remain executable code, never stored in the CMS.
 s=s.replace(/<%[\s\S]*?%>/g,tag=>{const id=tokens.length;tokens.push(tag);return `\uE000${id}\uE001`;});
 s=s.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,tag=>{const id=tokens.length;tokens.push(tag);return `\uE000${id}\uE001`;});
 s=s.replace(/<[^>]+>|[^<]+/g,part=>{
  if(part.startsWith('<')){
   parent=part.match(/^<([\w-]+)/)?.[1]||parent;
   return part.replace(/\b(alt|title|placeholder|aria-label|href)=(['"])(.*?)\2/gi,(whole,attr,quote,value)=>{
    if(!value.trim()||value.includes('\uE000')||attr==='href'&&!/^<a\b/i.test(part))return whole;
    if(attr==='href'&&!/^(?:\/|https?:|mailto:|tel:|#)/.test(value))return whole;
    const expression=add(key(),group,attr==='href'?'Đích liên kết: '+decode(value).slice(0,90):attr+': '+decode(value).slice(0,90),decode(value),attr==='href'?'url':'text');
    const id=tokens.length;tokens.push('<%= '+expression+' %>');return attr+'='+quote+`\uE000${id}\uE001`+quote;
   });
  }
  return part.split(/(\uE000\d+\uE001)/).map(text=>{
   if(text.startsWith('\uE000')||!/[\p{L}\p{N}]/u.test(decode(text)))return text;
   const trimmed=text.trim();if(!trimmed)return text;
   const expression=add(key(),group,(parent||'Nội dung')+': '+decode(trimmed).slice(0,110),decode(trimmed));
   return text.slice(0,text.indexOf(trimmed))+'<%= '+expression+' %>'+text.slice(text.indexOf(trimmed)+trimmed.length);
  }).join('');
 });
 while(s.includes('\uE000'))s=s.replace(/\uE000(\d+)\uE001/g,(_,id)=>tokens[+id]);
 // Output-expression fallbacks are also editorial text; comparison constants stay fixed.
 s=s.replace(/<%=[\s\S]*?%>/g,tag=>tag.replace(/(['"])((?:\\.|(?!\1)[^\\\r\n])*)\1/g,(whole,q,text,offset)=>{
  if(!/[À-ỹ]/u.test(text)||/(?:===?|!==?)\s*$/.test(tag.slice(0,offset))||/^\s*(?:===?|!==?)/.test(tag.slice(offset+whole.length)))return whole;
  return add(key(),group,'Lời dẫn / nhãn dự phòng: '+text.slice(0,95),text);
 }));
 fs.writeFileSync(file,s);
}
// Browser messages (excluding classification regexes and internal storage keys).
for(const file of ['public/js/site.js','public/js/chatbot.js']){
 let n=0;const group=file.endsWith('chatbot.js')?'Trợ lý – thông báo':'Biểu mẫu và thao tác';let s=fs.readFileSync(file,'utf8');
 s=s.split('\n').map(line=>{
  if(/^\s*(?:\/\/|\*)/.test(line))return line;
  return line.replace(/(['"])((?:\\.|(?!\1)[^\\\r\n])*)\1/g,(whole,q,text)=>{
   if(!/[À-ỹ]/u.test(text))return whole;
   const k=`browser.${path.basename(file,'.js')}.${String(++n).padStart(3,'0')}`;
   add(k,group,text.slice(0,110),text);return `window.solDreamText(${JSON.stringify(k)})`;
  });
 }).join('\n');
 fs.writeFileSync(file,s);
}
fs.writeFileSync('data/site-copy.json',JSON.stringify(entries,null,2)+'\n');
console.log('Registered '+entries.length+' editable content fields');
