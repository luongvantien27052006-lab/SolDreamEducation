'use strict';
const fs=require('fs');const rows=JSON.parse(fs.readFileSync('data/site-copy.json','utf8'));
if(fs.readFileSync('routes/public.js','utf8').includes('siteText('))throw new Error('Server copy has already been registered. Maintain data/site-copy.json directly.');
function register(key,group_name,label,value){if(!rows.some(r=>r.key===key))rows.push({key,group_name,label,kind:'text',value});}
function expression(literal,key,group){
 let value,params=[];
 if(literal.startsWith('`')){
  value=literal.slice(1,-1).replace(/\$\{([^{}]*)\}/g,(_,code)=>{const k='v'+params.length;params.push(k+':('+code+')');return '{'+k+'}';});
  if(value.includes('${'))return literal;
 }else{value=new Function('return '+literal)();}
 register(key,group,value.slice(0,100),value);return `siteText(${JSON.stringify(key)}${params.length?',{'+params.join(',')+'}':''})`;
}
const literal="(?:'(?:\\\\.|[^'\\\\])*'|\"(?:\\\\.|[^\"\\\\])*\"|`(?:\\\\.|[^`\\\\])*`)";
for(const file of ['routes/public.js','routes/contact.js','lib/leadContext.js']){
 let s=fs.readFileSync(file,'utf8'),count=0;const group=file==='routes/public.js'?'SEO và tên trang':file==='routes/contact.js'?'Biểu mẫu – phản hồi máy chủ':'Biểu mẫu – nội dung quan tâm';
 const transform=lit=>expression(lit,`server.${file.replace(/\//g,'.').replace(/\.js$/,'')}.${String(++count).padStart(3,'0')}`,group);
 if(file==='routes/public.js'){
  s=s.replace(new RegExp('\\b(name|title|description):\\s*('+literal+')','g'),(whole,prop,lit)=>/[À-ỹ]|SOL DREAM|SolDream/.test(lit)?prop+': '+transform(lit):whole);
  s=s.replace(new RegExp('((?:post|program)\\.seo_title\\s*\\|\\|\\s*)('+literal+')','g'),(_,prefix,lit)=>prefix+transform(lit));
 }else if(file==='routes/contact.js'){
  s=s.replace(new RegExp('\\b(error|message):\\s*('+literal+')','g'),(_,prop,lit)=>prop+': '+transform(lit));
 }else{
  s=s.replace(/`(?:\\.|[^`])*`/g,lit=>/[À-ỹ]/.test(lit)?transform(lit):lit);
 }
 s=s.replace("'use strict';","'use strict';\nconst {siteText}=require('../lib/siteContent');").replace("require('../lib/siteContent')",file.startsWith('lib/')?"require('./siteContent')":"require('../lib/siteContent')");
 fs.writeFileSync(file,s);
}
const course=require('../data/courses.json');
for(const [key,group,label,value] of [
 ['course.notice','Chính sách khóa học','Lưu ý chung về khóa học',course.notice],
 ['seo.default-title','SEO chung','Tiêu đề mặc định','SOL DREAM EDUCATION - Trung Tâm Hàn Ngữ & Du Học Hàn Quốc Uy Tín'],
 ['seo.default-description','SEO chung','Mô tả mặc định','Trung tâm Hàn ngữ Sol Dream Education chuyên đào tạo tiếng Hàn cấp tốc, tiếng Hàn giao tiếp và tư vấn du học Hàn Quốc uy tín tại TP.HCM. Đăng ký nhận tư vấn ngay!'],
 ['seo.default-alt','SEO chung','Alt ảnh mặc định','SOL DREAM EDUCATION - Tư vấn du học Hàn Quốc và đào tạo tiếng Hàn'],
 ['error.404-title','Trang không tìm thấy','Tiêu đề SEO','Không tìm thấy trang - SOL DREAM EDUCATION'],
 ['error.404-description','Trang không tìm thấy','Mô tả SEO','Trang bạn tìm không tồn tại.'],
 ])register(key,group,label,value);
for(const topic of require('../lib/contentTopics').TOPICS){register('topic.'+topic.id+'.label','Ba tab cẩm nang','Tên tab: '+topic.label,topic.label);register('topic.'+topic.id+'.description','Ba tab cẩm nang','Lời dẫn: '+topic.label,topic.description);}
fs.writeFileSync('data/site-copy.json',JSON.stringify(rows,null,2)+'\n');console.log('Total editable copy fields: '+rows.length);
