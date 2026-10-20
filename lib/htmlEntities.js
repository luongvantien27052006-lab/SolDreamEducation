'use strict';
function decodeAttributeEntities(value){
  let text=String(value||'');
  for(let i=0;i<8;i++){
    const next=text.replace(/&(?:amp|quot|apos|lt|gt);|&#(?:x[0-9a-f]+|[0-9]+);/gi,entity=>{
      const names={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};
      if(names[entity.toLowerCase()])return names[entity.toLowerCase()];
      const hex=/^&#x/i.test(entity);const code=parseInt(entity.slice(hex?3:2,-1),hex?16:10);
      return Number.isFinite(code)&&code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'';
    });
    if(next===text)break;text=next;
  }
  return text;
}
module.exports={decodeAttributeEntities};
