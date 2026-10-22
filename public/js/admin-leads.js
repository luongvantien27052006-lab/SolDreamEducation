(function () {
  'use strict';
  var live = document.querySelector('[data-lead-email-live]');
  if (!live) return;
  var timer, controller, running = false, stopped = false, paused = false, failures = 0;
  var cells = new Map();
  document.querySelectorAll('[data-lead-email-id]').forEach(function (cell) {
    cells.set(cell.dataset.leadEmailId, cell);
  });

  function field(cell, selector, value) {
    var node = cell.querySelector(selector);
    node.hidden = !value;
    node.querySelector('small').textContent = value || '';
  }
  function update(notification) {
    var cell = cells.get(String(notification.id));
    if (!cell) return;
    var label = cell.querySelector('[data-email-label]');
    label.textContent = notification.label;
    label.classList.toggle('on', notification.status === 'sent');
    label.classList.toggle('off', notification.status !== 'sent');
    field(cell, '[data-email-recipient]', notification.recipient);
    field(cell, '[data-email-sent-at]', notification.sentAt);
    field(cell, '[data-email-error]', notification.error);
    var retry = cell.querySelector('[data-email-retry]');
    retry.hidden = !notification.action;
    retry.querySelector('button').textContent = notification.action || '';
    cell.querySelector('[data-email-hotline]').hidden = !notification.hotlineNotified;
    cell.querySelector('[data-email-subscription]').textContent = 'Bản tin của khách: ' + (notification.subscribed ? 'Đang đăng ký nhận' : 'Đã dừng nhận');
  }
  function schedule(delay) {
    window.clearTimeout(timer);
    if (!stopped && !paused && !document.hidden) timer = window.setTimeout(refresh, delay);
  }
  async function refresh() {
    if (running || stopped || paused || document.hidden) return;
    running = true;
    controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 10000);
    try {
      var response = await fetch(live.dataset.statusUrl, {
        credentials: 'same-origin', cache: 'no-store', redirect: 'manual',
        headers: { Accept: 'application/json' }, signal: controller.signal,
      });
      if (response.type === 'opaqueredirect' || response.status === 401 || response.status === 403) {
        stopped = true;
        live.textContent = 'Phiên quản trị đã hết hạn. Đăng nhập lại để tiếp tục cập nhật trạng thái email.';
        return;
      }
      if (!response.ok || !String(response.headers.get('content-type')).includes('application/json')) throw new Error('Unable to refresh');
      var data = await response.json();
      if (!Array.isArray(data.notifications)) throw new Error('Invalid response');
      data.notifications.forEach(update);
      failures = 0;
      live.textContent = 'Trạng thái email đang tự cập nhật mỗi 5 giây. Đăng ký mới được gửi tự động.';
    } catch (_) {
      if (paused) return;
      failures += 1;
      live.textContent = 'Tạm mất kết nối cập nhật trạng thái. Trang sẽ tự kết nối lại; email vẫn được máy chủ xử lý.';
    } finally {
      window.clearTimeout(timeout);
      controller = null;
      running = false;
      schedule(Math.min(30000, 5000 * Math.pow(2, failures)));
    }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) window.clearTimeout(timer);
    else schedule(0);
  });
  window.addEventListener('online', function () { schedule(0); });
  window.addEventListener('pagehide', function () {
    paused = true;
    window.clearTimeout(timer);
    if (controller) controller.abort();
  });
  window.addEventListener('pageshow', function () { paused = false; schedule(0); });
  schedule(0);
})();
