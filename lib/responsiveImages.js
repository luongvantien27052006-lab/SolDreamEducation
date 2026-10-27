'use strict';
const optimized=require('../data/optimized-images.json');
const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function responsiveImage(source){
 const original=String(source||'');let key=original;
 try{const url=new URL(original,'https://soldream.edu.vn');if(url.hostname!=='soldream.edu.vn'&&url.hostname!=='www.soldream.edu.vn')return {src:original};key=url.pathname;}catch{return {src:original};}
 const image=optimized[key];if(!image)return {src:original};
 const preferred=image.variants.find(v=>v.width===960)||image.variants.at(-1);
 return {src:preferred.src,srcset:image.variants.map(v=>v.src+' '+v.width+'w').join(', '),width:image.width,height:image.height};
}
function imageAttributes(source,sizes='(max-width: 720px) 100vw, 900px'){
 const image=responsiveImage(source);
 return 'src="'+escape(image.src)+'"'+(image.srcset?' srcset="'+escape(image.srcset)+'" sizes="'+escape(sizes)+'" width="'+image.width+'" height="'+image.height+'"':'');
}
function socialImage(source){
 const image=responsiveImage(source);
 if(!image.srcset)return image;
 const record=Object.values(optimized).find(item=>item.variants.some(v=>v.src===image.src));
 return record?record.variants.at(-1):image;
}
function responsiveContent(html){
 return String(html||'').replace(/<img\b[^>]*>/gi,tag=>{
  const match=tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);if(!match)return tag;
  const source=match[1]??match[2];if(!responsiveImage(source).srcset)return tag;
  const clean=tag.replace(/\s+(?:srcset|sizes|width|height)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');
  return clean.replace(/\bsrc\s*=\s*(?:"[^"]*"|'[^']*')/i,()=>imageAttributes(source));
 });
}
module.exports={responsiveImage,imageAttributes,responsiveContent,socialImage};
