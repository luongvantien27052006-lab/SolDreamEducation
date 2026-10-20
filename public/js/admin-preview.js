(function(){
  document.querySelectorAll('[data-preview-type]').forEach(function(form){
    var button=document.createElement('button');button.type='submit';button.className='btn2 btn2-ghost';button.textContent='Xem trước, chưa lưu';button.formAction='/admin/xem-truoc/'+form.dataset.previewType;button.formTarget='_blank';
    var id=(form.getAttribute('action')||'').match(/\/([^/]+)\/sua$/);if(id){var hidden=document.createElement('input');hidden.type='hidden';hidden.name='preview_id';hidden.value=id[1];form.append(hidden);}
    (form.querySelector('.form__actions')||form).append(button);
    if(id){var link=document.createElement('a');link.textContent='Lịch sử chỉnh sửa';link.href='/admin/lich-su/'+({post:'posts',program:'programs',course:'courses',about:'about_sections'}[form.dataset.previewType])+'/'+id[1];link.className='btn2 btn2-ghost';(form.querySelector('.form__actions')||form).append(link);}
  });
})();
