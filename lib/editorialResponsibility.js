'use strict';
function contentResponsibility(item={},kind='post'){
 const data=require('./siteContent').getDataset('editorial-responsibility',require('../data/editorial-responsibility.json'));
 if(!data.enabled||!String(data.name||'').trim())return null;
 if(kind==='post'&&!/visa|thị thực|học phí|chi phí|tài chính|ngân sách|học bổng/iu.test([item.title,item.excerpt,item.focus_keyword].filter(Boolean).join(' ')))return null;
 const profilePath=require('./util').normalizeReferenceUrl(data.profilePath||'/gioi-thieu')||'/gioi-thieu';
 return {...data,profilePath};
}
function responsiblePerson(item={},kind='post'){
 const person=contentResponsibility(item,kind);if(!person)return null;
 const {SITE_URL,abs}=require('./seo');
 return {'@type':'Person','@id':SITE_URL+'/gioi-thieu#dao-duy-thang',name:person.name,honorificPrefix:person.honorificPrefix,jobTitle:person.jobTitle,url:abs(person.profilePath),worksFor:{'@id':SITE_URL+'/#organization'}};
}
function accountabilitySchema(item={},kind='post'){
 const person=responsiblePerson(item,kind);
 return person?{accountablePerson:{'@id':person['@id']}}:{};
}
module.exports={contentResponsibility,responsiblePerson,accountabilitySchema};
