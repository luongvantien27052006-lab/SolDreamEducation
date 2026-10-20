'use strict';
const {siteText}=require('./siteContent');
function expandCourseBlocks(html){if(!String(html||'').includes('{{course-catalog}}'))return html;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const courses=require('./courseKnowledge').getCourses().filter(c=>c.financials.tuition2026);
  const rows=courses.map(c=>{const s=c.financials.tuition2026;return `<tr><td><a href="${esc(c.url)}">${esc(s.code)} — ${esc(c.name)}</a></td><td>${esc(s.sessions)} ${esc(siteText('catalog.unit.sessions'))} · ${esc(s.minutesPerSession)} ${esc(siteText('catalog.unit.minutes'))} · ${esc(s.totalHours)} ${esc(siteText('catalog.unit.hours'))}</td><td>${esc(s.classSize)}</td><td>${esc(s.minimumStudents)}</td><td>${esc(s.textbook)}</td><td>${esc(s.materials)}</td><td>${esc(c.price)}</td></tr>`;}).join('');
  return String(html).replace(/\{\{course-catalog\}\}/g,`<div class="knowledge-table-wrap"><table><thead><tr><th>${esc(siteText('catalog.heading.0'))}</th><th>${esc(siteText('catalog.heading.1'))}</th><th>${esc(siteText('catalog.heading.2'))}</th><th>${esc(siteText('catalog.heading.3'))}</th><th>${esc(siteText('catalog.heading.4'))}</th><th>${esc(siteText('catalog.heading.5'))}</th><th>${esc(siteText('catalog.heading.6'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}
module.exports={expandCourseBlocks};
