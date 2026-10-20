'use strict';
const defaults=require('../data/site-copy.json');
const defaultsByKey=new Map(defaults.map(row=>[row.key,row]));
let cache=null;
let cacheVersion=null;
function invalidateSiteContent(){cache=null;}
function copyRows(checkVersion=false){
  const db=require('../db');
  const version=checkVersion||!cache?db.pragma('data_version',{simple:true}):cacheVersion;
  if(!cache||version!==cacheVersion){cache=new Map(db.prepare('SELECT key,value FROM site_copy').all().map(row=>[row.key,row.value]));cacheVersion=version;}
  return cache;
}
function siteText(key,values={}){
  const text=copyRows().get(key)??defaultsByKey.get(key)?.value??'';
  return String(text).replace(/\{(v\d+)\}/g,(token,name)=>Object.hasOwn(values,name)?String(values[name]??''):token);
}
function getDataset(key,fallback){const row=require('../db').prepare('SELECT content FROM site_datasets WHERE key=?').get(key);return row?JSON.parse(row.content):fallback;}
function scriptJson(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
function siteContentLocals(){
  // Another CMS worker/connection may have saved copy since the previous request.
  copyRows(true);
  const browserCopy=Object.fromEntries(defaults.filter(row=>row.key.startsWith('browser.')).map(row=>[row.key,siteText(row.key)]));
  return {siteText,siteDataset:getDataset,browserCopyJson:scriptJson(browserCopy),siteJson:scriptJson,organizationSchema};
}
function organizationSchema(siteUrl,ogImage){
  const data=getDataset('organization',require('../data/organization-schema.json'));
  const expand=value=>typeof value==='string'?value.replace(/\{siteUrl\}/g,()=>siteUrl).replace(/\{ogImage\}/g,()=>ogImage):Array.isArray(value)?value.map(expand):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,expand(v)])):value;
  return expand(data);
}
module.exports={siteText,getDataset,scriptJson,siteContentLocals,invalidateSiteContent,organizationSchema};
