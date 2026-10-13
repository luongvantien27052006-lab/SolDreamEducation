(function () {
  'use strict';

  var journey = document.querySelector('[data-home-journey]');
  if (journey) {
    var chapters = Array.from(journey.querySelectorAll('[data-home-chapter]'));
    var images = Array.from(journey.querySelectorAll('.hx-journey__image'));
    var caption = journey.querySelector('[data-home-caption]');
    var progress = journey.querySelector('[data-home-progress]');
    var activeIndex = -1;

    function activate(index) {
      if (index === activeIndex || index < 0 || index >= chapters.length) return;
      activeIndex = index;
      chapters.forEach(function (chapter, chapterIndex) {
        chapter.classList.toggle('is-current', chapterIndex === index);
      });
      images.forEach(function (image, imageIndex) {
        image.classList.toggle('is-current', imageIndex === index);
      });
      if (caption) caption.textContent = chapters[index].querySelector('.hx-chapter__number').textContent;
      if (progress) progress.style.height = (((index + 1) / chapters.length) * 100) + '%';
    }

    function updateChapter() {
      var target = window.innerHeight * .47;
      var bestIndex = 0;
      var bestDistance = Infinity;
      chapters.forEach(function (chapter, index) {
        var rect = chapter.getBoundingClientRect();
        var distance = Math.abs(rect.top + rect.height / 2 - target);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      activate(bestIndex);
    }
    var pendingFrame = false;
    function queueUpdate() {
      if (pendingFrame) return;
      pendingFrame = true;
      requestAnimationFrame(function () { pendingFrame = false; updateChapter(); });
    }
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate);
    updateChapter();
  }

  // Uploaded images can be missing from older volume snapshots. Keep cards usable.
  document.querySelectorAll('[data-home-image]').forEach(function (image) {
    image.addEventListener('error', function () {
      if (image.dataset.homeFallback === '1') return;
      image.dataset.homeFallback = '1';
      image.src = '/img/home-campus-spring.png';
    });
  });
}());
