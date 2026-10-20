'use strict';
const sections=[['hero-intro','hero'],['stats-section','stats'],['about-section','about'],['courses-intro','courses'],['journey-intro','journey'],['why-intro','values'],['testimonials-intro','testimonials'],['news-intro','news'],['consult-intro','consult']];
function getHomeLayout(blocks){return sections.map(([key,template],index)=>({key,template,index,block:blocks.find(b=>b.key===key)})).filter(s=>s.block&&s.block.active).sort((a,b)=>a.block.sort_order-b.block.sort_order||a.index-b.index);}
module.exports={getHomeLayout};
