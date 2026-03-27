let currentFile = null;
let currentMode = null;

const API_BASE = '';
const TOKEN_KEY = 'lexify_token';
const USER_KEY  = 'lexify_user';

function handleUnauthorized() {
  clearAuth();
  document.getElementById('app-main').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  showDashboard();
  showToast('Session expired. Please login again.', 'error');
}

async function authFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  return res;
}
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function setUserName(name) {
  localStorage.setItem(USER_KEY, name);
}

function getUserName() {
  return localStorage.getItem(USER_KEY) || 'User';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { error: 'x', success: '+', info: 'i' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '○';
  } else {
    input.type = 'password';
    btn.textContent = '⦿';
  }
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const authError = document.getElementById('auth-error');

  authError.classList.remove('show');
  authError.textContent = '';

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.add('show');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  btn.disabled = true;
  btn.textContent = 'Logging in…';

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    const token = data.access_token || data['access-token'];
    if (!token) throw new Error('User not found!');

    setToken(token);
    setUserName(email.split('@')[0]);
    enterApp();
    showToast('Welcome back!', 'success');

  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;

  btn.disabled = true;
  btn.textContent = 'Creating account…';

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed');
    }

    const token = data.access_token || data['access-token'];
    if (!token) throw new Error('No token received');

    setToken(token);
    setUserName(name);
    enterApp();
    showToast('Account created successfully!', 'success');

  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

function handleLogout() {
  clearAuth();
  document.getElementById('app-main').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  showDashboard();
  showToast('Logged out', 'info');
}

async function enterApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-main').classList.remove('hidden');
  document.getElementById('burger-user-name').textContent = getUserName();
  showDashboard();

  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.response) {
        setUserName(data.response);
        document.getElementById('burger-user-name').textContent = data.response;
      }
    }
  } catch (err) {}
}
function hideAllViews() {
  const views = [
    'view-dashboard',
    'view-upload-analysis',
    'view-upload-clause',
    'view-results-analysis',
    'view-results-clause',
    'view-chatbot-upload',
    'view-chatbot-chat'
  ];
  views.forEach(id => document.getElementById(id).classList.add('hidden'));
}

function showDashboard() {
  hideAllViews();
  document.getElementById('view-dashboard').classList.remove('hidden');
  currentFile = null;
  currentMode = null;
}

function showUploadView(mode) {
  hideAllViews();
  currentMode = mode;
  currentFile = null;

  if (mode === 'analysis') {
    document.getElementById('view-upload-analysis').classList.remove('hidden');
    resetUploadUI('analysis');
  } else {
    document.getElementById('view-upload-clause').classList.remove('hidden');
    resetUploadUI('clause');
  }
}

function resetUploadUI(mode) {
  document.getElementById(`file-info-${mode}`).classList.remove('show');
  document.getElementById(`file-${mode}`).value = '';

}
function handleFileSelect(input, mode) {
  const file = input.files[0];
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'docx'].includes(ext)) {
    showToast('Please upload a PDF or DOCX file', 'error');
    input.value = '';
    return;
  }

  currentFile = file;
  document.getElementById(`file-name-${mode}`).textContent = file.name;
  document.getElementById(`file-size-${mode}`).textContent = formatSize(file.size);
  document.getElementById(`file-info-${mode}`).classList.add('show');
}

function removeFile(mode) {
  currentFile = null;
  document.getElementById(`file-info-${mode}`).classList.remove('show');
  document.getElementById(`file-${mode}`).value = '';
}

function setupDropzone(id, mode) {
  const zone = document.getElementById(id);
  if (!zone) return;

  ['dragenter', 'dragover'].forEach(evt => {
    zone.addEventListener(evt, e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    zone.addEventListener(evt, e => {
      e.preventDefault();
      zone.classList.remove('dragover');
    });
  });

  zone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = document.getElementById(`file-${mode}`);
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handleFileSelect(input, mode);
    }
  });
}
function showLoading(text) {
  const overlay = document.getElementById('loading-overlay');
  if (text) {
    overlay.querySelector('.loading-text').textContent = text;
  }
  overlay.classList.add('show');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.remove('show');
}

async function submitAnalysis() {
  if (!currentFile) {
    showToast('Please upload a document first', 'error');
    return;
  }

  const token = getToken();
  if (!token) {
    showToast('Session expired. Please login again.', 'error');
    handleLogout();
    return;
  }

  const formData = new FormData();
  formData.append('file', currentFile);

  showLoading('Analyzing your document…');

  try {
    const res = await authFetch(`${API_BASE}/api/upload-files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || 'Analysis failed');
    }

    renderAnalysisResults(data.response);
    hideAllViews();
    document.getElementById('view-results-analysis').classList.remove('hidden');
    showToast('Analysis complete!', 'success');

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function submitClauseExplanation() {
  if (!currentFile) {
    showToast('Please upload a document first', 'error');
    return;
  }

  const token = getToken();
  if (!token) {
    showToast('Session expired. Please login again.', 'error');
    handleLogout();
    return;
  }

  const formData = new FormData();
  formData.append('file', currentFile);

  showLoading('Explaining each clause…');

  try {
    const res = await authFetch(`${API_BASE}/api/clause-explaination`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || 'Clause explanation failed');
    }

    renderClauseResults(data.response);
    hideAllViews();
    document.getElementById('view-results-clause').classList.remove('hidden');
    showToast('Clause breakdown complete!', 'success');

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}
const SECTION_META = [
  { key: 'SECTION_1_DOCUMENT_OVERVIEW',                title: 'Document Overview',                icon: '', type: 'kv'          },
  { key: 'SECTION_2_PARTIES_INVOLVED',                 title: 'Parties Involved',                 icon: '', type: 'parties'      },
  { key: 'SECTION_3_CRITICAL_DATES_AND_DEADLINES',     title: 'Critical Dates & Deadlines',       icon: '', type: 'milestones'   },
  { key: 'SECTION_4_OBLIGATIONS_BY_PARTY',             title: 'Obligations by Party',             icon: '', type: 'obligations'  },
  { key: 'SECTION_5_RISK_AND_RED_FLAG_ANALYSIS',       title: 'Risk & Red Flag Analysis',         icon: '', type: 'risks'        },
  { key: 'SECTION_6_MISSING_OR_INCOMPLETE_INFORMATION',title: 'Missing or Incomplete Information', icon: '', type: 'missing'      },
  { key: 'SECTION_7_PLAIN_LANGUAGE_SUMMARY',           title: 'Plain Language Summary',           icon: '', type: 'summary'      },
  { key: 'SECTION_8_LEGAL_TERMS_GLOSSARY',             title: 'Legal Terms Glossary',             icon: '', type: 'glossary'     },
  { key: 'SECTION_9_DOCUMENT_VALIDITY_CHECKLIST',      title: 'Document Validity Checklist',      icon: '', type: 'checklist'    },
  { key: 'SECTION_10_RECOMMENDED_NEXT_STEPS',          title: 'Recommended Next Steps',           icon: '', type: 'steps'        },
];

function renderAnalysisResults(response) {
  const container = document.getElementById('results-content-analysis');
  container.innerHTML = '';

  SECTION_META.forEach((section, idx) => {
    const data = response[section.key];
    if (!data) return;

    const sectionEl = document.createElement('div');
    sectionEl.className = 'analysis-section';
    sectionEl.style.animationDelay = `${idx * 0.06}s`;

    if (idx === 0) sectionEl.classList.add('open');

    const bodyId = `section-body-${idx}`;

    sectionEl.innerHTML = `
      <div class="section-header" onclick="toggleSection(this)">
        <div class="section-header-left">
          <div class="section-number">${idx + 1}</div>
          <span class="section-title">${section.icon} ${section.title}</span>
        </div>
        <span class="section-chevron">▼</span>
      </div>
      <div class="section-body" id="${bodyId}">
        <div class="section-content">
          ${renderSectionContent(section.type, data)}
        </div>
      </div>
    `;

    container.appendChild(sectionEl);
  });
}

function toggleSection(headerEl) {
  const section = headerEl.parentElement;
  section.classList.toggle('open');
}

function renderSectionContent(type, data) {
  switch (type) {
    case 'kv':        return renderKV(data);
    case 'parties':   return renderParties(data);
    case 'milestones':return renderMilestones(data);
    case 'obligations': return renderObligations(data);
    case 'risks':     return renderRisks(data);
    case 'missing':   return renderMissing(data);
    case 'summary':   return renderSummary(data);
    case 'glossary':  return renderGlossary(data);
    case 'checklist': return renderChecklist(data);
    case 'steps':     return renderSteps(data);
    default:          return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
}

function renderKV(data) {
  const items = Object.entries(data).map(([key, value]) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `<div class="kv-item"><div class="kv-label">${label}</div><div class="kv-value">${escapeHtml(value || 'Not specified')}</div></div>`;
  }).join('');
  return `<div class="kv-grid">${items}</div>`;
}

function renderParties(data) {
  const parties = data.parties || [];
  const flags = data.identity_flags || '';

  let html = `<table class="result-table">
    <thead><tr><th>Sr.</th><th>Role</th><th>Full Name</th><th>Address</th><th>Identifier</th></tr></thead>
    <tbody>`;

  parties.forEach(p => {
    html += `<tr>
      <td>${p.sr_number || ''}</td>
      <td>${escapeHtml(p.role || '')}</td>
      <td>${escapeHtml(p.full_name || '')}</td>
      <td>${escapeHtml(p.address || '')}</td>
      <td>${escapeHtml(p.identifier_kyc || '')}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  if (flags && flags !== 'None identified.') {
    html += `<div class="summary-text" style="color: var(--risk-medium);">Warning: ${escapeHtml(flags)}</div>`;
  }
  return html;
}

function renderMilestones(data) {
  const items = data.milestones || [];
  let html = `<table class="result-table">
    <thead><tr><th>Event</th><th>Date / Trigger</th><th>Grace Period</th><th>Consequence</th></tr></thead>
    <tbody>`;

  items.forEach(m => {
    html += `<tr>
      <td>${escapeHtml(m.event || '')}</td>
      <td>${escapeHtml(m.date_or_trigger || '')}</td>
      <td>${escapeHtml(m.grace_period || '—')}</td>
      <td>${escapeHtml(m.consequence_if_missed || '—')}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

function renderObligations(data) {
  let html = '';
  Object.entries(data).forEach(([party, obligations]) => {
    html += `<div class="obligation-group">
      <div class="obligation-party">${escapeHtml(party)}</div>`;
    if (Array.isArray(obligations)) {
      obligations.forEach(o => {
        html += `<div class="obligation-item">
          <span class="obligation-clause">${escapeHtml(o.clause || '')}</span>
          <span class="obligation-text">${escapeHtml(o.obligation || '')}</span>
        </div>`;
      });
    }
    html += `</div>`;
  });
  return html;
}

function renderRisks(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return `<div class="summary-text">No significant risks identified. Independent legal review is still recommended.</div>`;
  }

  let html = `<table class="result-table">
    <thead><tr><th>Clause</th><th>Issue</th><th>Risk</th><th>Legal Basis</th><th>Recommendation</th></tr></thead>
    <tbody>`;

  data.forEach(r => {
    const level = (r.risk_level || '').trim().split(/\s/)[0].toUpperCase();
    html += `<tr>
      <td>${escapeHtml(r.clause_section || '')}</td>
      <td>${escapeHtml(r.issue || '')}</td>
      <td><span class="risk-badge ${level}">${level}</span></td>
      <td>${escapeHtml(r.legal_basis || '')}</td>
      <td>${escapeHtml(r.recommendation || '')}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

function renderMissing(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return `<div class="summary-text">No missing information identified.</div>`;
  }

  let html = `<table class="result-table">
    <thead><tr><th>Missing Element</th><th>Why It Matters</th></tr></thead>
    <tbody>`;

  data.forEach(m => {
    html += `<tr>
      <td>${escapeHtml(m.missing_element || '')}</td>
      <td>${escapeHtml(m.why_it_matters_legally || '')}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

function renderSummary(data) {
  let html = '';
  if (data.executive_summary) {
    html += `<div class="summary-text">${escapeHtml(data.executive_summary)}</div>`;
  }
  if (data.the_what_if_scenario) {
    html += `<div class="summary-text" style="margin-top:16px;padding:16px;border-radius:var(--radius-sm);background:var(--risk-medium-bg);border:1px solid rgba(245,158,11,0.2);"><strong style="color:var(--risk-medium);">What-If Scenario:</strong> ${escapeHtml(data.the_what_if_scenario)}</div>`;
  }
  return html;
}

function renderGlossary(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return `<div class="summary-text">No legal terms to define.</div>`;
  }

  return `<div class="glossary-grid">${data.map(g => `
    <div class="glossary-item">
      <div class="glossary-term">${escapeHtml(g.term || '')}</div>
      <div class="glossary-meaning">${escapeHtml(g.plain_meaning || '')}</div>
    </div>`).join('')}</div>`;
}

function renderChecklist(data) {
  const items = Object.entries(data).map(([key, value]) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const status = (value || '').toUpperCase().includes('PRESENT') ? 'present' : 'missing';
    return `<div class="checklist-item">
      <div class="checklist-status ${status}"></div>
      <span class="checklist-label">${label}</span>
    </div>`;
  }).join('');
  return `<div class="checklist-grid">${items}</div>`;
}

function renderSteps(data) {
  if (!Array.isArray(data)) return '';
  return `<ol class="steps-list">${data.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`;
}

function renderClauseResults(htmlContent) {
  const container = document.getElementById('results-content-clause');
  container.innerHTML = htmlContent;

  const clauses = container.querySelectorAll('.clause');
  clauses.forEach((clause, i) => {
    clause.style.animationDelay = `${i * 0.08}s`;
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let chatFile = null;
let isChatSending = false;

function showChatbotUpload() {
  hideAllViews();
  currentFile = null;
  chatFile = null;
  document.getElementById('view-chatbot-upload').classList.remove('hidden');
  resetUploadUI('chatbot');
}

async function submitChatbotFile() {
  if (!currentFile) {
    showToast('Please upload a document first', 'error');
    return;
  }

  const token = getToken();
  if (!token) {
    showToast('Session expired. Please login again.', 'error');
    handleLogout();
    return;
  }

  chatFile = currentFile;
  const formData = new FormData();
  formData.append('file', chatFile);

  showLoading('Preparing your document for chat…');

  try {
    const res = await authFetch(`${API_BASE}/chatbot/new-chat`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || 'Failed to start chat session');
    }

    hideAllViews();
    document.getElementById('view-chatbot-chat').classList.remove('hidden');

    const messagesEl = document.getElementById('chat-messages');
    messagesEl.innerHTML = `
      <div class="chat-welcome">
        <div class="chat-welcome-icon">⚖️</div>
        <h3>Document Loaded</h3>
        <p>Your document has been processed. Ask me anything about its contents — clauses, obligations, risks, or legal implications.</p>
      </div>
    `;

    document.getElementById('chat-input').focus();
    showToast('Chat session started!', 'success');

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function renderChatBubble(text, role) {
  const messagesEl = document.getElementById('chat-messages');

  // Remove welcome message if present
  const welcome = messagesEl.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;

  const label = document.createElement('div');
  label.className = 'chat-bubble-label';
  label.textContent = role === 'user' ? 'You' : 'Lexify AI';

  const content = document.createElement('div');
  content.className = 'chat-bubble-text';
  content.textContent = text;

  bubble.appendChild(label);
  bubble.appendChild(content);
  messagesEl.appendChild(bubble);

  messagesEl.scrollTop = messagesEl.scrollHeight;
  return bubble;
}

function showTypingIndicator() {
  const messagesEl = document.getElementById('chat-messages');
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.id = 'typing-indicator';
  indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  messagesEl.appendChild(indicator);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

async function sendChatMessage() {
  if (isChatSending) return;

  const input = document.getElementById('chat-input');
  const query = input.value.trim();
  if (!query) return;

  const token = getToken();
  if (!token) {
    showToast('Session expired. Please login again.', 'error');
    handleLogout();
    return;
  }

  // Show user bubble
  renderChatBubble(query, 'user');
  input.value = '';

  // Disable input
  isChatSending = true;
  input.disabled = true;
  document.getElementById('chat-send-btn').disabled = true;

  showTypingIndicator();

  try {
    const res = await authFetch(`${API_BASE}/chatbot/chat-reponse?query=${encodeURIComponent(query)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();

    hideTypingIndicator();

    if (!res.ok) {
      throw new Error(data.detail || 'Failed to get response');
    }

    renderChatBubble(data.response, 'assistant');

  } catch (err) {
    hideTypingIndicator();
    showToast(err.message, 'error');
    renderChatBubble('Sorry, something went wrong. Please try again.', 'assistant');
  } finally {
    isChatSending = false;
    input.disabled = false;
    document.getElementById('chat-send-btn').disabled = false;
    input.focus();
  }
}

function handleChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

let savedChatsPanelOpen = false;

async function saveCurrentChat() {
  const token = getToken();
  if (!token) {
    showToast('Session expired. Please login again.', 'error');
    handleLogout();
    return;
  }

  const btn = document.getElementById('btn-save-chat');
  btn.disabled = true;
  btn.classList.add('saving');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
    <span>Saving…</span>
  `;

  try {
    const res = await authFetch(`${API_BASE}/chatbot/save-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || 'Failed to save chat');
    }

    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>Saved!</span>
    `;
    btn.style.background = '#22C55E';

    showToast('Chat saved successfully!', 'success');

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
      btn.disabled = false;
      btn.classList.remove('saving');
    }, 2000);

  } catch (err) {
    showToast(err.message, 'error');
    btn.innerHTML = originalHTML;
    btn.disabled = false;
    btn.classList.remove('saving');
  }
}

function openSavedChatsPanel() {
  const overlay = document.getElementById('saved-chats-overlay');
  const panel = document.getElementById('saved-chats-panel');

  overlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    overlay.classList.add('show');
    panel.classList.add('open');
  });

  savedChatsPanelOpen = true;
  loadSavedChats();
}

function closeSavedChatsPanel() {
  const overlay = document.getElementById('saved-chats-overlay');
  const panel = document.getElementById('saved-chats-panel');

  overlay.classList.remove('show');
  panel.classList.remove('open');

  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 350);

  savedChatsPanelOpen = false;
}

async function loadSavedChats() {
  const token = getToken();
  if (!token) {
    showToast('Session expired. Please login again.', 'error');
    handleLogout();
    return;
  }

  const listEl = document.getElementById('saved-chats-list');
  listEl.innerHTML = `
    <div class="saved-chats-loading">
      <div class="loading-spinner"></div>
      <span>Loading saved chats…</span>
    </div>
  `;

  try {
    const res = await authFetch(`${API_BASE}/chatbot/list-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || 'Failed to load chats');
    }

    const chats = data.chatbot_log || [];

    if (chats.length === 0) {
      listEl.innerHTML = `
        <div class="saved-chats-empty">
          <div class="saved-chats-empty-icon">💬</div>
          <p>No saved chats yet</p>
          <span>Save a chat session to see it here</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = '';
    chats.forEach((chat, idx) => {
      const card = document.createElement('div');
      card.className = 'saved-chat-card';
      card.style.animationDelay = `${idx * 0.06}s`;
      card.onclick = () => loadSpecificChat(chat);

      const title = chat.title || 'Untitled Chat';
      const preview = chat.history
        ? chat.history.substring(0, 120).replace(/\n/g, ' ') + '…'
        : 'No conversation preview available';
      const shortId = chat._id ? chat._id.substring(chat._id.length - 6) : '—';

      card.innerHTML = `
        <div class="saved-chat-card-title">${escapeHtml(title)}</div>
        <div class="saved-chat-card-preview">${escapeHtml(preview)}</div>
        <div class="saved-chat-card-meta">
          <span class="saved-chat-card-id">#${shortId}</span>
          <span class="saved-chat-card-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            Resume
          </span>
        </div>
      `;

      listEl.appendChild(card);
    });

  } catch (err) {
    listEl.innerHTML = `
      <div class="saved-chats-empty">
        <div class="saved-chats-empty-icon">⚠️</div>
        <p>Failed to load chats</p>
        <span>${escapeHtml(err.message)}</span>
      </div>
    `;
  }
}

async function loadSpecificChat(chat) {
  closeSavedChatsPanel();

  const token = getToken();
  if (!token) {
    showToast('Session expired. Please login again.', 'error');
    handleLogout();
    return;
  }

  showLoading('Loading saved chat…');

  try {
    const chatbotCollection = chat.file || '';
    const chatHistory = chat.history || '';

    hideAllViews();
    document.getElementById('view-chatbot-chat').classList.remove('hidden');

    const messagesEl = document.getElementById('chat-messages');
    messagesEl.innerHTML = '';

    if (chatHistory.trim()) {
      const lines = chatHistory.split('\n');
      let currentRole = null;
      let currentMessage = '';

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('User Response:')) {
          if (currentRole && currentMessage.trim()) {
            renderChatBubble(currentMessage.trim(), currentRole);
          }
          currentRole = 'user';
          currentMessage = trimmed.replace('User Response:', '').trim();
        } else if (trimmed.startsWith('System Response:')) {
          if (currentRole && currentMessage.trim()) {
            renderChatBubble(currentMessage.trim(), currentRole);
          }
          currentRole = 'assistant';
          currentMessage = trimmed.replace('System Response:', '').trim();
        } else {
          currentMessage += '\n' + trimmed;
        }
      });

      if (currentRole && currentMessage.trim()) {
        renderChatBubble(currentMessage.trim(), currentRole);
      }
    }

    if (messagesEl.children.length === 0) {
      messagesEl.innerHTML = `
        <div class="chat-welcome">
          <div class="chat-welcome-icon">📂</div>
          <h3>Chat Restored</h3>
          <p>${escapeHtml(chat.title || 'Saved conversation')} — continue the conversation below.</p>
        </div>
      `;
    }

    document.getElementById('chat-input').focus();
    showToast(`Chat "${chat.title || 'Untitled'}" loaded!`, 'success');

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('lexify_theme', next);
  document.getElementById('btn-theme').textContent = next === 'light' ? '🌙' : '☀️';
  document.getElementById('theme-label').textContent = next === 'light' ? 'Dark Mode' : 'Light Mode';
}

function applyTheme() {
  const saved = localStorage.getItem('lexify_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = saved === 'light' ? '🌙' : '☀️';
  const label = document.getElementById('theme-label');
  if (label) label.textContent = saved === 'light' ? 'Dark Mode' : 'Light Mode';
}

function toggleBurgerMenu() {
  const menu = document.getElementById('burger-menu');
  const btn = document.getElementById('burger-btn');
  menu.classList.toggle('hidden');
  btn.classList.toggle('open');
}

function closeBurgerMenu() {
  document.getElementById('burger-menu').classList.add('hidden');
  document.getElementById('burger-btn').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  setupDropzone('dropzone-analysis', 'analysis');
  setupDropzone('dropzone-clause', 'clause');
  setupDropzone('dropzone-chatbot', 'chatbot');

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('burger-menu');
    const btn = document.getElementById('burger-btn');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
      closeBurgerMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && savedChatsPanelOpen) {
      closeSavedChatsPanel();
    }
  });

  const token = getToken();
  if (token) {
    enterApp();
  }
});
