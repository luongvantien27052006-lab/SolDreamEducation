'use strict';
const db=require('../db');
const {vietnamDate}=require('./articleMetadata');
function aboutPageMetadata(){
  const row=db.prepare("SELECT * FROM page_versions WHERE path='/gioi-thieu'").get()||{};
  return {publishedTime:row.published_at||'',modifiedTime:row.modified_at||'',modifiedLabel:vietnamDate(row.modified_at)};
}
module.exports={aboutPageMetadata};
