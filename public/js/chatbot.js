(() => {
  'use strict';
  const root = document.querySelector('[data-chat-interface]');
  if (!root) return;

  const form = root.querySelector('.chatbot__form');
  const input = root.querySelector('.chatbot__input');
  const sendButton = root.querySelector('.chatbot__send');
  const status = root.querySelector('.chatbot__status');
  const statusText = status?.querySelector('span');
  const messages = root.querySelector('.chatbot__messages');
  const quickQuestions = root.querySelector('.chatbot__quick-questions');
  const newChatButton = root.querySelector('.chatbot__new');
  const storageKey = 'sol-dream-chat-history-v2';
  const welcomeMessage = 'Chào bạn! Mình là trợ lý của Sol Dream Education. Bạn có thể hỏi về khóa học, trường đại học, học phí, học bổng, hồ sơ hoặc chương trình du học Hàn Quốc.';
  const history = [];
  let isSending = false;

  function syncViewportHeight() {
    const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--chat-viewport-height', `${Math.round(height)}px`);
  }

  function setStatus(text, state = 'ready') {
    if (!status || !statusText) return;
    statusText.textContent = text;
    status.dataset.state = state;
  }
  function setSending(sending) {
    isSending = sending;
    input.disabled = sending;
    sendButton.disabled = sending;
    root.querySelectorAll('.chatbot__quick-questions button').forEach((button) => { button.disabled = sending; });
  }
  function resizeComposer() {
    input.style.height = '40px';
    input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
  }
  function saveHistory() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), items: history.slice(-12) }));
    } catch (_) { /* Trình duyệt có thể chặn bộ nhớ cục bộ. */ }
  }
  function loadHistory() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      const isFresh = stored?.savedAt > Date.now() - (30 * 24 * 60 * 60 * 1000);
      if (!isFresh || !Array.isArray(stored.items)) return;
      const restored = stored.items.slice(-12).filter((item) => item
        && ['user', 'assistant'].includes(item.role)
        && typeof item.content === 'string'
        && item.content.trim());
      if (!restored.length) return;
      history.push(...restored.map((item) => ({
        role: item.role,
        // Giữ nguyên câu trả lời dài và bảng khi khôi phục; tin nhắn người dùng vẫn theo giới hạn form.
        content: item.content.trim().slice(0, item.role === 'assistant' ? 12000 : 1500)
      })));
      messages.querySelector('.chatbot__message-row')?.remove();
      history.forEach((item) => addMessage(item.content, item.role === 'assistant' ? 'bot' : 'user'));
    } catch (_) {
      localStorage.removeItem(storageKey);
    }
  }
  function resetConversation() {
    history.splice(0);
    try { localStorage.removeItem(storageKey); } catch (_) { /* Không ảnh hưởng khả năng chat. */ }
    messages.replaceChildren();
    const day = document.createElement('div');
    day.className = 'chatbot__day';
    const dayText = document.createElement('span');
    dayText.textContent = 'Hôm nay';
    day.append(dayText);
    messages.append(day);
    addMessage(welcomeMessage, 'bot');
    input.value = '';
    resizeComposer();
    input.focus();
    refreshQuestions();
  }
  async function refreshStatus() {
    try {
      const response = await fetch('/api/chat/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('STATUS_UNAVAILABLE');
      const data = await response.json();
      setStatus(data.aiConfigured ? 'AI + dữ liệu Sol Dream' : 'Tra cứu dữ liệu Sol Dream', data.aiConfigured ? 'ready' : 'local');
    } catch (_) {
      setStatus('Đang kết nối lại', 'offline');
    }
  }
  async function refreshQuestions(context = '') {
    try {
      const query = context ? `?context=${encodeURIComponent(context.slice(0, 300))}` : '';
      const response = await fetch(`/api/chat/questions${query}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.questions) || !data.questions.length) return;
      const fragment = document.createDocumentFragment();
      data.questions.forEach((item) => {
        if (!item || typeof item.question !== 'string') return;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.question;
        button.disabled = isSending;
        if (item.url) button.dataset.source = item.url;
        fragment.append(button);
      });
      if (fragment.childNodes.length) quickQuestions.replaceChildren(fragment);
    } catch (_) { /* Giữ các câu hỏi mặc định nếu không tải được gợi ý. */ }
  }

  function scrollToBottom() { messages.scrollTop = messages.scrollHeight; }
  function keepConversationVisible() {
    window.scrollTo(0, 0);
    scrollToBottom();
  }
  function appendInlineMarkdown(parent, text) {
    const pattern = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*)/g;
    let cursor = 0;
    let match;
    while ((match = pattern.exec(text))) {
      if (match.index > cursor) parent.append(document.createTextNode(text.slice(cursor, match.index)));
      if (match[2] && match[3]) {
        try {
          const target = new URL(match[3], window.location.origin);
          if (target.origin === window.location.origin || target.protocol === 'https:') {
            const link = document.createElement('a');
            const label = match[2];
            const boldLabel = label.match(/^\*\*([\s\S]+)\*\*$/);
            if (boldLabel) {
              const strong = document.createElement('strong');
              strong.textContent = boldLabel[1];
              link.append(strong);
            } else link.textContent = label;
            link.href = target.href;
            if (target.origin !== window.location.origin) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
            parent.append(link);
          } else parent.append(document.createTextNode(match[2].replace(/^\*\*|\*\*$/g, '')));
        } catch (_) { parent.append(document.createTextNode(match[2].replace(/^\*\*|\*\*$/g, ''))); }
      } else if (match[4]) {
        const strong = document.createElement('strong');
        strong.textContent = match[4];
        parent.append(strong);
      } else {
        const emphasis = document.createElement('em');
        emphasis.textContent = match[5];
        parent.append(emphasis);
      }
      cursor = pattern.lastIndex;
    }
    if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
  }

  function splitTableRow(rawLine) {
    let line = String(rawLine || '').trim();
    if (line.startsWith('|')) line = line.slice(1);
    if (line.endsWith('|') && !line.endsWith('\\|')) line = line.slice(0, -1);
    const cells = [];
    let value = '';
    let escaped = false;
    for (const character of line) {
      if (escaped) {
        value += character;
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '|') {
        cells.push(value.trim());
        value = '';
      } else value += character;
    }
    if (escaped) value += '\\';
    cells.push(value.trim());
    return cells;
  }

  function isTableSeparator(rawLine, expectedColumns) {
    const cells = splitTableRow(rawLine);
    return cells.length === expectedColumns && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));
  }

  function renderTable(container, headerCells, bodyRows) {
    const wrapper = document.createElement('div');
    wrapper.className = 'chatbot__table-wrap';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', `Bảng dữ liệu gồm ${headerCells.length} cột`);
    const table = document.createElement('table');
    table.className = 'chatbot__table';
    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerCells.forEach((cell) => {
      const heading = document.createElement('th');
      heading.scope = 'col';
      appendInlineMarkdown(heading, cell);
      headerRow.append(heading);
    });
    head.append(headerRow);
    table.append(head);
    const body = document.createElement('tbody');
    bodyRows.forEach((cells) => {
      const row = document.createElement('tr');
      headerCells.forEach((_, index) => {
        const cell = document.createElement('td');
        appendInlineMarkdown(cell, cells[index] || '—');
        row.append(cell);
      });
      body.append(row);
    });
    table.append(body);
    wrapper.append(table);
    const hint = document.createElement('div');
    hint.className = 'chatbot__table-hint';
    hint.textContent = 'Vuốt ngang để xem đầy đủ bảng →';
    wrapper.append(hint);
    container.classList.add('chatbot__message--table');
    container.append(wrapper);
  }

  function renderBotMarkdown(container, text) {
    let list = null;
    let listType = '';
    const lines = String(text).split(/\r?\n/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const rawLine = lines[lineIndex];
      const line = rawLine.trim();
      const headerCells = line.includes('|') ? splitTableRow(line) : [];
      if (headerCells.length >= 2 && lineIndex + 1 < lines.length && isTableSeparator(lines[lineIndex + 1], headerCells.length)) {
        const rows = [];
        lineIndex += 2;
        while (lineIndex < lines.length) {
          const cells = splitTableRow(lines[lineIndex]);
          if (!lines[lineIndex].includes('|') || cells.length < 2) break;
          rows.push(cells.slice(0, headerCells.length));
          lineIndex += 1;
        }
        lineIndex -= 1;
        list = null;
        listType = '';
        renderTable(container, headerCells, rows);
        continue;
      }
      const bullet = line.match(/^([-*]|\d+[.)])\s+(.+)/);
      if (bullet) {
        const nextListType = /^\d/.test(bullet[1]) ? 'ol' : 'ul';
        if (!list || listType !== nextListType) {
          list = document.createElement(nextListType);
          listType = nextListType;
          container.append(list);
        }
        const item = document.createElement('li');
        appendInlineMarkdown(item, bullet[2]);
        list.append(item);
        continue;
      }
      list = null;
      listType = '';
      if (!line) continue;
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      const block = document.createElement(headingMatch ? (headingMatch[1].length <= 3 ? 'h3' : 'h4') : 'p');
      appendInlineMarkdown(block, headingMatch ? headingMatch[2] : line);
      container.append(block);
    }
  }
  function addMessage(text, role) {
    const row = document.createElement('div');
    row.className = `chatbot__message-row chatbot__message-row--${role}`;
    if (role === 'bot') {
      const avatar = document.createElement('div');
      avatar.className = 'chatbot__mini-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      const robot = document.createElement('img');
      robot.src = '/img/soldream-robot.png?v=sde3';
      robot.alt = '';
      avatar.append(robot);
      row.append(avatar);
    }
    const item = document.createElement('div');
    item.className = `chatbot__message chatbot__message--${role}`;
    if (role === 'bot') renderBotMarkdown(item, text);
    else item.textContent = text;
    row.append(item);
    messages.appendChild(row);
    scrollToBottom();
  }
  function showTyping(show) {
    const existing = messages.querySelector('.chatbot__typing');
    if (show && !existing) {
      const indicator = document.createElement('div');
      indicator.className = 'chatbot__typing';
      indicator.setAttribute('aria-label', 'SolDream Support đang trả lời');
      indicator.innerHTML = '<span></span><span></span><span></span>';
      messages.appendChild(indicator);
    }
    if (!show && existing) existing.remove();
    scrollToBottom();
  }
  async function sendMessage(rawMessage) {
    const message = rawMessage.trim();
    if (!message || isSending) return;
    const requestHistory = history.slice(-12);
    setSending(true);
    setStatus('Đang tổng hợp câu trả lời…', 'ready');
    input.value = '';
    resizeComposer();
    addMessage(message, 'user');
    history.push({ role: 'user', content: message });
    if (history.length > 12) history.splice(0, history.length - 12);
    saveHistory();
    showTyping(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 16000);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: requestHistory }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.reply) throw new Error(data.error || 'Không thể kết nối đến trợ lý.');
      history.push({ role: 'assistant', content: data.reply });
      if (history.length > 12) history.splice(0, history.length - 12);
      saveHistory();
      addMessage(data.reply, 'bot');
      refreshQuestions(message);
      setStatus(data.mode === 'local' ? 'Tra cứu dữ liệu Sol Dream' : 'AI + dữ liệu Sol Dream', data.mode === 'local' ? 'local' : 'ready');
    } catch (error) {
      const fallback = 'Hiện chưa thể kết nối máy chủ tư vấn. Bạn vui lòng thử lại hoặc liên hệ Hotline/Zalo 0364 648 282 nhé.';
      const errorReply = error.name === 'AbortError' || error instanceof TypeError ? fallback : (error.message || fallback);
      history.push({ role: 'assistant', content: errorReply });
      if (history.length > 12) history.splice(0, history.length - 12);
      saveHistory();
      addMessage(errorReply, 'bot');
      setStatus('Mất kết nối', 'offline');
    } finally {
      window.clearTimeout(timeout);
      showTyping(false);
      setSending(false);
      input.focus();
    }
  }
  form.addEventListener('submit', (event) => { event.preventDefault(); sendMessage(input.value); });
  input.addEventListener('input', resizeComposer);
  input.addEventListener('focus', () => {
    document.body.classList.add('chat-keyboard-open');
    window.requestAnimationFrame(keepConversationVisible);
    window.setTimeout(keepConversationVisible, 180);
  });
  input.addEventListener('blur', () => {
    document.body.classList.remove('chat-keyboard-open');
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      sendMessage(input.value);
    }
  });
  quickQuestions.addEventListener('click', (event) => {
    const chip = event.target.closest('button');
    if (chip && quickQuestions.contains(chip)) sendMessage(chip.textContent);
  });
  newChatButton?.addEventListener('click', resetConversation);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => window.requestAnimationFrame(() => {
      syncViewportHeight();
      keepConversationVisible();
    }));
    window.visualViewport.addEventListener('scroll', () => window.requestAnimationFrame(keepConversationVisible));
  }
  syncViewportHeight();
  loadHistory();
  const lastUserMessage = [...history].reverse().find((item) => item.role === 'user')?.content || '';
  refreshQuestions(lastUserMessage);
  refreshStatus();
})();
