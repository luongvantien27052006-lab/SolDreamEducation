'use strict';
(() => {
  const root = document.querySelector('[data-english-landing]');
  const dataElement = document.getElementById('english-landing-data');
  if (!root || !dataElement) return;
  const data = JSON.parse(dataElement.textContent);
  const goal = root.querySelector('#english-goal');
  const level = root.querySelector('#english-level');
  const detail = root.querySelector('#english-interest-detail');
  let previousSuggestion = '';
  function updatePlan() {
    const selected = data.goals[Number(goal.value)];
    if (!selected) return;
    root.querySelector('[data-english-plan-title]').textContent = selected.title;
    root.querySelector('[data-english-plan-text]').textContent = selected.text;
    const suggestion = `${data.goalLabel}: ${selected.title}. ${data.levelLabel}: ${level.value}.`.slice(0, 240);
    // Retain any notes the visitor has already written themselves.
    if (!detail.value || detail.value === previousSuggestion) detail.value = suggestion;
    previousSuggestion = suggestion;
  }
  goal.addEventListener('change', updatePlan);
  level.addEventListener('change', updatePlan);
  root.querySelectorAll('[data-english-goal]').forEach(button => {
    button.addEventListener('click', () => {
      goal.value = button.dataset.englishGoal;
      updatePlan();
    });
  });
  const links = root.querySelectorAll('.el-nav__links a');
  const nav = root.querySelector('.el-nav');
  const slot = root.querySelector('.el-nav-slot');
  const header = document.querySelector('.site-header');
  let framePending = false;
  function updateNavigation() {
    framePending = false;
    const offset = header ? Math.max(0, Math.min(header.offsetHeight, header.getBoundingClientRect().bottom)) : 0;
    slot.style.minHeight = nav.offsetHeight + 'px';
    nav.style.setProperty('--el-header-offset', offset + 'px');
    nav.classList.toggle('is-pinned', slot.getBoundingClientRect().top < offset);
  }
  function requestNavigationUpdate() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(updateNavigation);
  }
  window.addEventListener('scroll', requestNavigationUpdate, { passive: true });
  window.addEventListener('resize', requestNavigationUpdate);
  updateNavigation();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-20% 0px -60% 0px' });
    links.forEach(link => { const section = document.getElementById(link.hash.slice(1)); if (section) observer.observe(section); });
  }
  updatePlan();
})();
