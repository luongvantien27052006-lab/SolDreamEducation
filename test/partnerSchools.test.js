'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildPartnerCards,DEFAULT_FEATURED}=require('../lib/partnerSchools');
const schools=require('../data/partner-schools.json').schools;
const universities=[{name:'Trường Đại học Hannam',english_name:'Hannam University',url:'/truong-dai-hoc/hannam',description:'Lời dẫn CMS.'},{name:'Trường Đại học Hanyang',url:'/truong-dai-hoc/hanyang'}];
const programs=[{title:'Đại học Yonsei',slug:'dai-hoc-yonsei',category:'Thông tin trường',published:1,cover_image:'/uploads/yonsei.jpg',excerpt:'Lời dẫn trường Yonsei.'},{title:'Đại học Quốc gia Pusan',slug:'pusan',category:'Thông tin trường',published:1}];
test('homepage candidates contain exactly the 22 profile schools/campuses, excluding unrelated programmes',()=>{
 const cards=buildPartnerCards(schools,programs,universities);assert.equal(cards.length,22);assert.deepEqual(cards.map(s=>s.name),schools.map(s=>s.name));assert.ok(!cards.some(s=>/Pusan/.test(s.name)));
});
test('six default cards all belong to the profile',()=>{const cards=buildPartnerCards(schools,programs,universities).filter(s=>s.featured);assert.equal(cards.length,6);assert.deepEqual(new Set(cards.map(s=>s.name)),DEFAULT_FEATURED);});
test('existing CMS school records supply current links, photos and editorial summaries',()=>{
 const card=buildPartnerCards(schools,programs,universities).find(s=>s.name==='Đại học Yonsei');assert.equal(card.href,'/truong-dai-hoc/dai-hoc-yonsei');assert.equal(card.image,'/uploads/yonsei.jpg');assert.equal(card.description,'Lời dẫn trường Yonsei.');assert.equal(card.external,false);
});
test('legacy profiles match the school identity despite the Trường prefix',()=>{const card=buildPartnerCards(schools,programs,universities).find(s=>s.name==='Đại học Hannam');assert.equal(card.href,'/truong-dai-hoc/hannam');assert.equal(card.description,'Lời dẫn CMS.');});
test('college never inherits a university profile just because the institution name overlaps',()=>{const card=buildPartnerCards(schools,[{title:'Đại học Woosong',slug:'dai-hoc-woosong',category:'Thông tin trường',published:1}],universities).find(s=>s.name==='Cao đẳng Woosong');assert.equal(card.href,card.website);assert.equal(card.external,true);});
test('editor selected homepage schools and card copy override defaults',()=>{const card=buildPartnerCards([{...schools[0],featured:false,image:'/img/custom.jpg',description:'Lời dẫn được biên tập.'}],programs,universities)[0];assert.equal(card.featured,false);assert.equal(card.image,'/img/custom.jpg');assert.equal(card.description,'Lời dẫn được biên tập.');});
test('hidden school profiles never create a public homepage link to a draft',()=>{const card=buildPartnerCards([schools[12]],[{...programs[0],published:0}],[])[0];assert.equal(card.href,schools[12].website);assert.equal(card.external,true);});
test('campus-specific entries preserve their identity when sharing a university profile',()=>{const cards=buildPartnerCards(schools.slice(4,6),programs,universities);assert.notEqual(cards[0].name,cards[1].name);assert.equal(cards[0].href,'/truong-dai-hoc/hanyang');assert.equal(cards[1].href,'/truong-dai-hoc/hanyang');});
