'use strict';
const db=require('../db');
const {requireAdmin}=require('./auth');
const {normalizeReferenceUrl}=require('./util');
const {decodeAttributeEntities}=require('./htmlEntities');
const {invalidateSiteContent}=require('./siteContent');
function safeLink(value){
 const raw=decodeAttributeEntities(value).trim();
 if(!raw)return '';
 if(/[\u0000-\u0020\u007f\\]/.test(raw))throw new Error('Liên kết không hợp lệ.');
 if(/^#[\w-]+$/.test(raw)||/^(?:tel:)[+\d()-]+$/i.test(raw)||/^mailto:[^\s@]+@[^\s@]+$/i.test(raw))return raw;
 if(!normalizeReferenceUrl(raw.replace(/\{siteUrl\}/g,'https://soldream.edu.vn').replace(/\{ogImage\}/g,'https://soldream.edu.vn/img/logo.png')))throw new Error('Liên kết phải là đường dẫn nội bộ hoặc URL http/https hợp lệ.');
 return raw;
}
function leafFields(value,path=[],result=[]){
 if(value&&typeof value==='object'){for(const [key,child] of Object.entries(value)){if(key==='content'&&Array.isArray(value.blocks))continue;leafFields(child,path.concat(key),result);}return result;}
 const labels={"name":"Tên","englishName":"Tên tiếng Anh","english_name":"Tên tiếng Anh","korean_name":"Tên tiếng Hàn","title":"Tiêu đề","content":"Nội dung","summary":"Tóm tắt","blufSummary":"Lời tóm tắt đầu trang","description":"Mô tả","lead":"Lời dẫn","text":"Nội dung chữ","sections":"Các mục hồ sơ","blocks":"Các khối nội dung","items":"Các dòng nội dung","headers":"Tiêu đề cột","rows":"Các dòng bảng","faqs":"Câu hỏi thường gặp","question":"Câu hỏi","answer":"Trả lời","sourceUrls":"Nguồn đối chiếu","sourceUrl":"Liên kết nguồn","sourceName":"Tên nguồn","sourceNotice":"Ghi chú nguồn","website":"Website","officialWebsite":"Website chính thức","location":"Địa điểm","campus":"Cơ sở","type":"Loại","schools":"Các trường","topics":"Chủ đề","checklist":"Việc nên làm","monthlyBudget":"Ngân sách sinh hoạt","krw":"Khoản tiền KRW","note":"Ghi chú","item":"Hạng mục","costComparison":"Bảng chi phí","foreignAmount":"Số tiền ngoại tệ","vndAmount":"Số tiền VND","admissionRows":"Bảng điều kiện","criterion":"Tiêu chí","value":"Giá trị","financials":"Dữ liệu học phí và chi phí","requirements":"Điều kiện tuyển sinh","coreFacts":"Thông tin tóm tắt","email":"Email","telephone":"Điện thoại","address":"Địa chỉ","streetAddress":"Địa chỉ đường","addressLocality":"Tỉnh / thành phố","geo":"Tọa độ","sameAs":"Mạng xã hội","knowsAbout":"Chủ đề chuyên môn","openingHoursSpecification":"Giờ làm việc","opens":"Giờ mở cửa","closes":"Giờ đóng cửa","foundingDate":"Năm thành lập","legalName":"Tên pháp lý","alternateName":"Tên gọi khác","highlight":"Điểm nổi bật","tuitionSummary":"Tóm tắt học phí","freshnessLabel":"Nhãn cập nhật"};
 const last=path.at(-1);const structural=String(last).startsWith('@')||(last==='type'&&path.includes('blocks'))||['id','slug','url','firstPublishedAt','lastUpdated','updatedDate','updatedDateDisplay','last_updated','last_updated_at'].includes(last)||last==='lastUpdated';
 const homepageLabels={honorificPrefix:'Học vị',jobTitle:'Chức danh',responsibility:'Phạm vi trách nhiệm',enabled:'Bật hiển thị',intro:'Lời mở đầu',paragraphs:'Các đoạn nội dung',links:'Liên kết',href:'Đích liên kết',programSlug:'Slug bài chương trình',checklistTitle:'Tiêu đề lộ trình',programsTitle:'Tiêu đề danh sách chương trình',schoolsTitle:'Tiêu đề danh mục trường',storiesTitle:'Tiêu đề câu chuyện học viên',consultationTitle:'Tiêu đề tư vấn',consultationText:'Lời dẫn tư vấn',featured:'Hiển thị trên trang chủ',image:'Ảnh hoặc logo trường',profilePath:'Trang thông tin trường'};
 result.push({path,token:Buffer.from(JSON.stringify(path)).toString('base64url'),label:path.map(k=>/^\d+$/.test(k)?'Mục '+(Number(k)+1):(homepageLabels[k]||labels[k]||k)).join(' › '),value:value==null?'':String(value),kind:typeof value==='number'?'number':typeof value==='boolean'?'boolean':'text',readonly:structural});return result;
}
function changedContent(paths){require('./indexNow').queueIndexNow(paths);try{require('./websiteKnowledge').syncWebsiteKnowledge({force:true});}catch(error){console.error('[content] refresh knowledge',error.message);}}
module.exports=function(router){
 const common={layout:'admin/layout',active:'site-content'};
 router.get('/giao-dien',requireAdmin,(req,res)=>{
  const groups=db.prepare('SELECT group_name,COUNT(*) total FROM site_copy GROUP BY group_name ORDER BY group_name').all();
  const group=String(req.query.nhom||groups[0]?.group_name||'');const search=String(req.query.q||'').slice(0,200);
  const all=db.prepare('SELECT * FROM site_copy WHERE group_name=? ORDER BY key').all(group).filter(row=>!search||[row.label,row.value,row.key].join(' ').toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const page=Math.max(1,parseInt(req.query.trang)||1),pages=Math.max(1,Math.ceil(all.length/40));
  res.render('admin/site-content',{...common,title:'Giao diện & nội dung trang',groups,group,search,page,pages,total:all.length,fields:all.slice((page-1)*40,page*40),datasets:db.prepare('SELECT key,title FROM site_datasets ORDER BY title').all(),flash:req.query.flash||'',error:''});
 });
 router.post('/giao-dien',requireAdmin,(req,res)=>{
  const group=String(req.body.group||'');const fields=db.prepare('SELECT * FROM site_copy WHERE group_name=?').all(group);
  try{
   const edits=[];for(const field of fields){if(!Object.hasOwn(req.body.values||{},field.key))continue;let value=String(req.body.values[field.key]).replace(/\r\n?/g,'\n');if(value.length>12000)throw new Error('Nội dung tối đa 12.000 ký tự cho mỗi trường.');
    const tokens=s=>[...new Set(s.match(/\{v\d+\}/g)||[])].sort().join(',');if(tokens(value)!==tokens(field.default_value))throw new Error('Giữ nguyên các biến '+tokens(field.default_value)+' trong nội dung.');
    if(field.kind==='url')value=safeLink(value);if(value!==field.value)edits.push({key:field.key,value});
   }
   db.transaction(()=>{const update=db.prepare('UPDATE site_copy SET value=?,updated_at=CURRENT_TIMESTAMP WHERE key=?');edits.forEach(e=>update.run(e.value,e.key));if(edits.length&&group==='Giới thiệu')db.prepare("UPDATE page_versions SET modified_at=? WHERE path='/gioi-thieu'").run(new Date().toISOString());})();
   if(edits.length){invalidateSiteContent();changedContent(['/','/gioi-thieu','/khoa-hoc','/du-hoc','/tin-tuc','/truong-dai-hoc','/cau-hoi-thuong-gap','/cuoc-song-han-quoc','/tro-ly-du-hoc','/sitemap.xml']);}
   res.redirect('/admin/giao-dien?'+new URLSearchParams({nhom:group,trang:String(req.body.page||1),q:String(req.body.q||''),flash:edits.length?'Đã lưu '+edits.length+' nội dung.':'Nội dung không thay đổi.'}));
  }catch(error){res.status(400).render('admin/site-content-error',{...common,title:'Chưa lưu nội dung',error:error.message,back:'/admin/giao-dien?nhom='+encodeURIComponent(group)});}
 });
 router.get('/du-lieu-trang/:key',requireAdmin,(req,res,next)=>{
  const dataset=db.prepare('SELECT * FROM site_datasets WHERE key=?').get(req.params.key);if(!dataset)return next();
  const search=String(req.query.q||'').slice(0,200);const all=leafFields(JSON.parse(dataset.content)).filter(f=>!search||[f.label,f.value].join(' ').toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const page=Math.max(1,parseInt(req.query.trang)||1),pages=Math.max(1,Math.ceil(all.length/60));
  res.render('admin/site-dataset',{...common,title:dataset.title,dataset,fields:all.slice((page-1)*60,page*60),total:all.length,page,pages,search,flash:req.query.flash||''});
 });
 router.post('/du-lieu-trang/:key',requireAdmin,(req,res,next)=>{
  const row=db.prepare('SELECT * FROM site_datasets WHERE key=?').get(req.params.key);if(!row)return next();
  try{
   const data=JSON.parse(row.content);let changed=0;const editedSections=new Set();
   for(const field of leafFields(data)){
    if(field.readonly||!Object.hasOwn(req.body.values||{},field.token))continue;
    const input=String(req.body.values[field.token]).replace(/\r\n?/g,'\n');if(input.length>40000)throw new Error('Nội dung quá dài.');let parent=data;for(const part of field.path.slice(0,-1))parent=parent[part];const key=field.path.at(-1),old=parent[key];let value=input;
    if(old===null&&input==='')value=null;
    else if(typeof old==='number'){value=Number(input);if(!Number.isFinite(value)||input.trim()==='')throw new Error('Giá trị số không hợp lệ tại '+field.label);}
    else if(typeof old==='boolean')value=input==='true';
    else if(typeof old==='string'&&(/^(?:url|contentUrl|sourceUrl|officialWebsite|website|profilePath|href|image)$/i.test(String(key))||field.path.some(k=>['sameAs','sourceUrls'].includes(k))))value=safeLink(input);
    const variables=s=>[...new Set(String(s).match(/\{(?:siteUrl|ogImage)\}/g)||[])].sort().join(',');if(variables(old)!==variables(value))throw new Error('Giữ nguyên biến địa chỉ hệ thống tại '+field.label);
    if(JSON.stringify(old)!==JSON.stringify(value)){parent[key]=value;changed++;if(field.path[0]==='sections')editedSections.add(Number(field.path[1]));}
   }
   if(changed){
    for(const index of editedSections){const section=data.sections[index];if(!Array.isArray(section?.blocks))continue;section.content=section.blocks.map(block=>block.type==='heading'?'#### '+block.text:block.type==='list'?block.items.map(item=>'- '+item).join('\n'):block.type==='table'?'| '+block.headers.join(' | ')+' |\n| '+block.headers.map(()=>'---').join(' | ')+' |\n'+block.rows.map(cells=>'| '+cells.join(' | ')+' |').join('\n'):block.text||'').join('\n');}
    const now=new Date().toISOString(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
    if(row.key==='korea-life')data.lastUpdated=day;
    if(row.key.startsWith('university-')){data.updatedDate=day;data.lastUpdated=day;data.updatedDateDisplay=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());}
    db.prepare('UPDATE site_datasets SET content=?,updated_at=? WHERE key=?').run(JSON.stringify(data),now,row.key);
    changedContent(['/','/du-hoc','/truong-dai-hoc','/cuoc-song-han-quoc','/sitemap.xml',...(data.url?[data.url]:[])]);
   }
   res.redirect('/admin/du-lieu-trang/'+encodeURIComponent(row.key)+'?'+new URLSearchParams({trang:String(req.body.page||1),q:String(req.body.q||''),flash:changed?'Đã lưu '+changed+' trường.':'Nội dung không thay đổi.'}));
  }catch(error){res.status(400).render('admin/site-content-error',{...common,title:'Chưa lưu nội dung',error:error.message,back:'/admin/du-lieu-trang/'+encodeURIComponent(row.key)});}
 });
};
module.exports.leafFields=leafFields;
