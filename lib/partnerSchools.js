'use strict';
const {slugify,programPublicPath}=require('./util');
const DEFAULT_FEATURED=new Set(['Đại học Woosong','Đại học Hannam','Đại học Daeduk','Đại học Hanyang, cơ sở Seoul','Đại học Yonsei','Đại học Sogang']);
const PROFILE_LOGOS={
  'Đại học Woosong':'/img/partners/woosong.jpg',
  'Đại học Hannam':'/img/partners/hannam.jpg',
  'Đại học Hanyang, cơ sở Seoul':'/img/partners/hanyang.jpg',
  'Đại học Hanyang, cơ sở ERICA':'/img/partners/hanyang.jpg',
  'Đại học Sogang':'/img/partners/sogang.jpg',
};
const key=value=>slugify(String(value||'')).replace(/^truong-/, '');
function buildPartnerCards(schools=[],programs=[],universities=[]){
  const profiles=[
    ...programs.filter(p=>Number(p.published)!==0&&p.category==='Thông tin trường').map(p=>({name:p.title,englishName:p.subtitle,url:programPublicPath(p),image:p.cover_image,description:p.excerpt})),
    ...universities.map(p=>({name:p.name,englishName:p.english_name||p.englishName,url:p.url,image:p.cover_image||p.image,description:p.description})),
  ];
  return schools.map(school=>{
    // Exact school identity avoids mapping Woosong College to Woosong University.
    const profile=profiles.find(p=>key(p.name)===key(school.name)||(school.englishName&&key(p.englishName)===key(school.englishName)))
      ||profiles.find(p=>school.profilePath&&p.url===school.profilePath);
    const href=profile?.url||school.website;
    const image=school.image||profile?.image||'';
    return {...school,href,image,isLogo:image.startsWith('/img/partners/'),external:/^https?:\/\//i.test(href||''),description:school.description||profile?.description||school.campus,
      featured:typeof school.featured==='boolean'?school.featured:DEFAULT_FEATURED.has(school.name)};
  }).filter(school=>school.href);
}
function addPartnerHomepageFields(db){
  const row=db.prepare("SELECT content FROM site_datasets WHERE key='partners'").get();if(!row)return;
  const data=JSON.parse(row.content);let changed=false;
  for(const school of data.schools||[]){
    for(const [field,value] of Object.entries({featured:DEFAULT_FEATURED.has(school.name),image:PROFILE_LOGOS[school.name]||'',description:'',profilePath:school.profilePath||''})){
      if(!Object.hasOwn(school,field)){school[field]=value;changed=true;}
    }
  }
  if(changed)db.prepare("UPDATE site_datasets SET content=?,updated_at=CURRENT_TIMESTAMP WHERE key='partners'").run(JSON.stringify(data));
  // Replace only the old default CTA, retaining any editor-authored label/URL.
  for(const [field,old,value] of [['023','/du-hoc','/truong-dai-hoc#partner-schools-title'],['024','Xem tất cả chương trình du học','Xem tất cả trường đối tác']]){
    db.prepare('UPDATE site_copy SET value=?,default_value=?,updated_at=CURRENT_TIMESTAMP WHERE key=? AND value=?').run(value,value,'view.home-sections.journey.'+field,old);
  }
}
module.exports={buildPartnerCards,addPartnerHomepageFields,DEFAULT_FEATURED,PROFILE_LOGOS};
