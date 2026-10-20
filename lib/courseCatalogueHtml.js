'use strict';
function expandCourseBlocks(html){if(!String(html||'').includes('{{course-catalog}}'))return html;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const courses=require('./courseKnowledge').getCourses().filter(c=>c.financials.tuition2026);
  const rows=courses.map(c=>{const s=c.financials.tuition2026;return `<tr><td><a href="${esc(c.url)}">${esc(s.code)} — ${esc(c.name)}</a></td><td>${esc(s.sessions)} buổi · ${esc(s.minutesPerSession)} phút · ${esc(s.totalHours)} giờ</td><td>${esc(s.classSize)}</td><td>${esc(s.minimumStudents)}</td><td>${esc(s.textbook)}</td><td>${esc(s.materials)}</td><td>${esc(c.price)}</td></tr>`;}).join('');
  return String(html).replace(/\{\{course-catalog\}\}/g,`<div class="knowledge-table-wrap"><table><thead><tr><th>Lớp</th><th>Thời lượng</th><th>Sĩ số</th><th>Tối thiểu mở lớp</th><th>Giáo trình</th><th>Tài liệu bổ trợ</th><th>Học phí</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}
module.exports={expandCourseBlocks};
