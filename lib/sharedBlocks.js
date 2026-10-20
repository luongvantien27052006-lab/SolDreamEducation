'use strict';
const db=require('../db');
function getBlocks(includeInactive=false){return db.prepare(`SELECT * FROM shared_blocks ${includeInactive?'':'WHERE active=1'} ORDER BY sort_order,key`).all();}
function blockLocals(){const blocks=getBlocks();return {sharedBlocks:blocks,getBlock:key=>blocks.find(b=>b.key===key)||{title:'',eyebrow:'',content:'',link_url:'',link_label:'',active:0},blockZone:zone=>blocks.filter(b=>b.zone===zone)};}
module.exports={getBlocks,blockLocals};
