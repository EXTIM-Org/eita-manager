// Application State
const state = {
  activeTab: 'dashboard',
  accounts: [],
  selectedAccountIds: new Set(),
  activeFilter: 'all',
  searchQuery: '',
  stats: {},
  activeJobs: {},
  reports: [],
  reportsFilter: 'all',
  reportsSearch: '',
  settings: {},
  currentAuthContext: null,
  otpCountdownInterval: null,
  ws: null
};

// DOM Elements
const elements = {
  tabs: document.querySelectorAll('.nav-item'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  pageTitle: document.getElementById('pageTitle'),
  pageSubtitle: document.getElementById('pageSubtitle'),
  wsStatus: document.getElementById('wsStatus'),
  btnRefresh: document.getElementById('btnRefresh'),
  btnOpenAddModal: document.getElementById('btnOpenAddModal'),
  btnCloseAddModal: document.getElementById('btnCloseAddModal'),
  modalAddAccount: document.getElementById('modalAddAccount'),
  
  // Auth Form Elements
  authStep1: document.getElementById('authStep1'),
  authStep2: document.getElementById('authStep2'),
  inputPhone: document.getElementById('inputPhone'),
  inputLabel: document.getElementById('inputLabel'),
  btnSendCode: document.getElementById('btnSendCode'),
  inputOtp: document.getElementById('inputOtp'),
  displayPhone: document.getElementById('displayPhone'),
  otpCountdown: document.getElementById('otpCountdown'),
  btnVerifyCode: document.getElementById('btnVerifyCode'),
  btnBackToStep1: document.getElementById('btnBackToStep1'),
  
  // Dashboard Elements
  statTotalAccounts: document.getElementById('statTotalAccounts'),
  statActiveAccounts: document.getElementById('statActiveAccounts'),
  statNeedsReauth: document.getElementById('statNeedsReauth'),
  statTotalCleaned: document.getElementById('statTotalCleaned'),
  statActivePct: document.getElementById('statActivePct'),
  statCleanSuccessRate: document.getElementById('statCleanSuccessRate'),
  accCountBadge: document.getElementById('accCountBadge'),
  dashActiveJobsContainer: document.getElementById('dashActiveJobsContainer'),
  dashRecentJobsContainer: document.getElementById('dashRecentJobsContainer'),
  btnViewAllReports: document.getElementById('btnViewAllReports'),

  // Accounts Tab Elements
  accountSearchInput: document.getElementById('accountSearchInput'),
  filterPills: document.querySelectorAll('.filter-pill'),
  accountsTableBody: document.getElementById('accountsTableBody'),
  selectAllCheckbox: document.getElementById('selectAllCheckbox'),
  btnBulkInspect: document.getElementById('btnBulkInspect'),
  btnBulkDelete: document.getElementById('btnBulkDelete'),
  btnBulkClean: document.getElementById('btnBulkClean'),
  selectedCount: document.getElementById('selectedCount'),
  selectedCountClean: document.getElementById('selectedCountClean'),
  selectedCountInspect: document.getElementById('selectedCountInspect'),

  // Bulk Inspect Modal Elements
  modalBulkInspect: document.getElementById('modalBulkInspect'),
  bulkInspectTitle: document.getElementById('bulkInspectTitle'),
  btnCloseBulkInspectModal: document.getElementById('btnCloseBulkInspectModal'),
  btnCloseBulkInspectBtn: document.getElementById('btnCloseBulkInspectBtn'),
  bulkInspectProgressBar: document.getElementById('bulkInspectProgressBar'),
  bulkInspectProgressPercent: document.getElementById('bulkInspectProgressPercent'),
  bulkInspectProgressText: document.getElementById('bulkInspectProgressText'),
  biAccountsCount: document.getElementById('biAccountsCount'),
  biTotalChannels: document.getElementById('biTotalChannels'),
  biTotalGroups: document.getElementById('biTotalGroups'),
  biFailedCount: document.getElementById('biFailedCount'),
  bulkInspectTableBody: document.getElementById('bulkInspectTableBody'),
  btnBulkInspectCleanAll: document.getElementById('btnBulkInspectCleanAll'),

  // Cleaner Tab Elements
  activeJobsList: document.getElementById('activeJobsList'),
  activeJobsBadge: document.getElementById('activeJobsBadge'),
  btnStartBatchModal: document.getElementById('btnStartBatchModal'),

  // Reports Tab Elements
  reportsTableBody: document.getElementById('reportsTableBody'),
  reportSearchInput: document.getElementById('reportSearchInput'),
  reportFilterPills: document.querySelectorAll('#reportFilterPills .filter-pill'),
  btnRefreshReports: document.getElementById('btnRefreshReports'),
  btnClearReports: document.getElementById('btnClearReports'),
  btnTestReportDetails: document.getElementById('btnTestReportDetails'),
  reportsCountBadge: document.getElementById('reportsCountBadge'),

  // Job Details Modal Elements
  modalJobDetails: document.getElementById('modalJobDetails'),
  btnCloseJobDetailsModal: document.getElementById('btnCloseJobDetailsModal'),
  btnCloseJobDetailsBtn: document.getElementById('btnCloseJobDetailsBtn'),
  jobDetailsTitle: document.getElementById('jobDetailsTitle'),
  jdHeaderBadge: document.getElementById('jdHeaderBadge'),
  jdJobId: document.getElementById('jdJobId'),
  jdSuccessCount: document.getElementById('jdSuccessCount'),
  jdFailCount: document.getElementById('jdFailCount'),
  jdStatus: document.getElementById('jdStatus'),
  jobFailureSummaryBox: document.getElementById('jobFailureSummaryBox'),
  jobItemsTableBody: document.getElementById('jobItemsTableBody'),
  modalJobSearchInput: document.getElementById('modalJobSearchInput'),
  modalJobFilterPills: document.querySelectorAll('#modalJobFilterPills .filter-pill'),
  jdItemsCountLabel: document.getElementById('jdItemsCountLabel'),

  // Dialogs Modal Elements
  modalDialogs: document.getElementById('modalDialogs'),
  btnCloseDialogsModal: document.getElementById('btnCloseDialogsModal'),
  dialogsTableBody: document.getElementById('dialogsTableBody'),
  dlgTotalChannels: document.getElementById('dlgTotalChannels'),
  dlgTotalGroups: document.getElementById('dlgTotalGroups'),
  btnConfirmClean: document.getElementById('btnConfirmClean'),
  btnCancelClean: document.getElementById('btnCancelClean'),
  selectAllDialogs: document.getElementById('selectAllDialogs'),

  // Settings Elements
  checkProtectCreator: document.getElementById('checkProtectCreator'),
  checkAutoDeleteHistory: document.getElementById('checkAutoDeleteHistory'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  btnResetSettings: document.getElementById('btnResetSettings')
};

// Utilities: Persian Numbers & Notifications
function toPersianDigits(n) {
  const f = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(n).replace(/[0-9]/g, w => f[+w]);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Custom Modal Confirm Dialog
function showConfirm({
  title = 'تأیید عملیات',
  message = 'آیا از انجام این عملیات اطمینان دارید؟',
  confirmText = 'تأیید و ادامه',
  cancelText = 'انصراف',
  type = 'warning', // 'danger', 'warning', 'info', 'success'
  icon = null
}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modalConfirmDialog');
    const iconWrapper = document.getElementById('dialogIconWrapper');
    const iconEl = document.getElementById('dialogIcon');
    const titleEl = document.getElementById('dialogTitle');
    const msgEl = document.getElementById('dialogMessage');
    const btnCancel = document.getElementById('dialogBtnCancel');
    const btnConfirm = document.getElementById('dialogBtnConfirm');

    if (!modal) {
      resolve(confirm(message));
      return;
    }

    // Set text
    titleEl.innerText = title;
    msgEl.innerText = message;
    btnConfirm.innerText = confirmText;
    btnCancel.innerText = cancelText;
    btnCancel.style.display = 'inline-flex';

    // Type and Icon configuration
    iconWrapper.className = `dialog-icon-wrapper ${type}`;
    const defaultIcons = {
      danger: '🗑️',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };
    iconEl.innerText = icon || defaultIcons[type] || '⚠️';

    // Confirm button appearance
    btnConfirm.className = `btn btn-${type === 'warning' ? 'warning' : (type === 'danger' ? 'danger' : 'primary')}`;

    modal.style.display = 'flex';

    function cleanup() {
      modal.style.display = 'none';
      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKeyDown);
    }

    function onConfirm() {
      cleanup();
      resolve(true);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    function onBackdrop(e) {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
      } else if (e.key === 'Enter') {
        cleanup();
        resolve(true);
      }
    }

    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKeyDown);
  });
}

// Custom Modal Alert Dialog
function showAlert({
  title = 'پیام سیستم',
  message = '',
  buttonText = 'متوجه شدم',
  type = 'info',
  icon = null
}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modalConfirmDialog');
    const iconWrapper = document.getElementById('dialogIconWrapper');
    const iconEl = document.getElementById('dialogIcon');
    const titleEl = document.getElementById('dialogTitle');
    const msgEl = document.getElementById('dialogMessage');
    const btnCancel = document.getElementById('dialogBtnCancel');
    const btnConfirm = document.getElementById('dialogBtnConfirm');

    if (!modal) {
      alert(message);
      resolve(true);
      return;
    }

    titleEl.innerText = title;
    msgEl.innerText = message;
    btnConfirm.innerText = buttonText;
    btnCancel.style.display = 'none';

    iconWrapper.className = `dialog-icon-wrapper ${type}`;
    const defaultIcons = {
      danger: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '🎉'
    };
    iconEl.innerText = icon || defaultIcons[type] || 'ℹ️';
    btnConfirm.className = `btn btn-${type === 'danger' ? 'danger' : (type === 'warning' ? 'warning' : 'primary')}`;

    modal.style.display = 'flex';

    function cleanup() {
      modal.style.display = 'none';
      btnCancel.style.display = 'inline-flex';
      btnConfirm.removeEventListener('click', onClose);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKeyDown);
      resolve(true);
    }

    function onClose() { cleanup(); }
    function onBackdrop(e) { if (e.target === modal) cleanup(); }
    function onKeyDown(e) { if (e.key === 'Escape' || e.key === 'Enter') cleanup(); }

    btnConfirm.addEventListener('click', onClose);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKeyDown);
  });
}

// WebSocket Connection
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/live`;
  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    elements.wsStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">اتصال زنده برقرار است</span>';
  };

  state.ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handleWebSocketEvent(data.event, data.payload);
    } catch (err) {
      console.error('WS parse error:', err);
    }
  };

  state.ws.onclose = () => {
    elements.wsStatus.innerHTML = '<span class="status-dot" style="background:#ef4444;box-shadow:none;"></span><span class="status-text" style="color:#ef4444;">اتصال قطع شد (در حال اتصال مجدد...)</span>';
    setTimeout(initWebSocket, 3000);
  };
}

function getJobProgress(j) {
  const total = j.total_steps || j.total_targets || 0;
  const current = j.current_step !== undefined ? j.current_step : ((j.success_count || 0) + (j.fail_count || 0));
  let pct = 0;
  if (j.percentage !== undefined && j.percentage !== null) {
    pct = Math.round(j.percentage);
  } else if (total > 0) {
    pct = Math.min(100, Math.round((current / total) * 100));
  } else if (['COMPLETED', 'COMPLETED_WITH_ERRORS'].includes(j.state)) {
    pct = 100;
  }
  return { total, current, pct };
}

function handleWebSocketEvent(event, payload) {
  if (event === 'JOB_QUEUED') {
    state.activeJobs[payload.job_id] = {
      job_id: payload.job_id,
      account_id: payload.account_id,
      state: 'QUEUED',
      total_targets: 0,
      total_steps: 0,
      current_step: 0,
      percentage: 0,
      success_count: 0,
      fail_count: 0
    };
    renderActiveJobs();
    updateDashboardActiveJobs();
    fetchStats();
    fetchAccounts();
  } else if (event === 'JOB_PROGRESS') {
    state.activeJobs[payload.job_id] = {
      ...(state.activeJobs[payload.job_id] || {}),
      ...payload,
      state: payload.state || 'RUNNING'
    };
    renderActiveJobs();
    updateDashboardActiveJobs();
  } else if (event === 'JOB_PAUSED') {
    if (state.activeJobs[payload.job_id]) {
      state.activeJobs[payload.job_id].state = 'PAUSED';
    }
    renderActiveJobs();
    updateDashboardActiveJobs();
  } else if (event === 'JOB_RESUMED') {
    if (state.activeJobs[payload.job_id]) {
      state.activeJobs[payload.job_id].state = 'RUNNING';
    }
    renderActiveJobs();
    updateDashboardActiveJobs();
  } else if (event === 'JOB_ABORTED' || event === 'JOB_COMPLETED') {
    delete state.activeJobs[payload.job_id];
    if (event === 'JOB_COMPLETED') {
      showToast(`عملیات پاکسازی با موفقیت انجام شد (${toPersianDigits(payload.success_count || 0)} مورد ترک شد)`, 'success');
    } else {
      showToast('عملیات پاکسازی لغو شد', 'warning');
    }
    renderActiveJobs();
    updateDashboardActiveJobs();
    fetchStats();
    fetchAccounts();
    fetchReports();
  } else if (event === 'FLOOD_WAIT_WARNING') {
    showToast(`محدودیت زمانی ایتا (FloodWait): ${toPersianDigits(payload.wait_seconds)} ثانیه توقف خودکار`, 'warning');
  }
}

// API Calls
async function fetchStats() {
  try {
    const res = await fetch('/api/v1/stats');
    const json = await res.json();
    if (json.success) {
      state.stats = json.data;
      renderStats();
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

async function fetchAccounts() {
  try {
    const params = new URLSearchParams({
      status: state.activeFilter,
      search: state.searchQuery
    });
    const res = await fetch(`/api/v1/accounts?${params}`);
    const json = await res.json();
    if (json.success) {
      state.accounts = json.data.items;
      renderAccountsTable();
      elements.accCountBadge.innerText = toPersianDigits(json.data.total);
    }
  } catch (err) {
    console.error('Error fetching accounts:', err);
  }
}

async function fetchActiveJobs() {
  try {
    const res = await fetch('/api/v1/clean/active-jobs');
    const json = await res.json();
    if (json.success) {
      const newActiveJobs = {};
      json.data.forEach(j => {
        newActiveJobs[j.job_id] = j;
      });
      state.activeJobs = newActiveJobs;
      renderActiveJobs();
      updateDashboardActiveJobs();
    }
  } catch (err) {
    console.error('Error fetching active jobs:', err);
  }
}

async function fetchReports() {
  try {
    const params = new URLSearchParams({
      status: state.reportsFilter,
      search: state.reportsSearch
    });
    const res = await fetch(`/api/v1/reports?${params}`);
    const json = await res.json();
    if (json.success) {
      state.reports = json.data.items;
      renderReportsTable();
      if (elements.reportsCountBadge) {
        elements.reportsCountBadge.innerText = `${toPersianDigits(json.data.total)} گزارش`;
      }
    }
  } catch (err) {
    console.error('Error fetching reports:', err);
  }
}

// System Settings Logic
async function fetchSettings() {
  try {
    const res = await fetch('/api/v1/settings');
    const json = await res.json();
    if (json.success && json.data) {
      state.settings = json.data;
      applySettingsToUI(json.data);
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
  }
}

function applySettingsToUI(cfg) {
  if (!cfg) return;
  if (elements.checkProtectCreator) elements.checkProtectCreator.checked = cfg.protect_creator_dialogs !== false;
  if (elements.checkAutoDeleteHistory) elements.checkAutoDeleteHistory.checked = cfg.auto_delete_history !== false;
}

async function saveSettings() {
  const payload = {
    max_concurrency: 50,
    min_delay: 1.0,
    max_delay: 2.5,
    flood_wait_action: 'AUTO_WAIT',
    max_flood_wait_seconds: 120,
    protect_creator_dialogs: elements.checkProtectCreator ? elements.checkProtectCreator.checked : true,
    auto_delete_history: elements.checkAutoDeleteHistory ? elements.checkAutoDeleteHistory.checked : true
  };

  try {
    const res = await fetch('/api/v1/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      state.settings = json.data;
      applySettingsToUI(json.data);
      showToast(json.message || 'تنظیمات با موفقیت ذخیره و اعمال گردید', 'success');
    } else {
      showToast(json.detail || 'خطا در ذخیره تنظیمات', 'error');
    }
  } catch (err) {
    showToast('خطا در برقراری ارتباط با سرور', 'error');
  }
}

async function resetSettings() {
  const ok = await showConfirm({
    title: 'بازنشانی تنظیمات به پیش‌فرض',
    message: 'آیا اطمینان دارید که می‌خواهید تمام تنظیمات همزمانی و نرخ تاخیر را به مقادیر اولیه سیستم بازگردانید؟',
    confirmText: 'بازنشانی به پیش‌فرض',
    type: 'warning',
    icon: '🔄'
  });

  if (!ok) return;

  try {
    const res = await fetch('/api/v1/settings/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const json = await res.json();
    if (json.success) {
      state.settings = json.data;
      applySettingsToUI(json.data);
      showToast(json.message || 'تنظیمات با موفقیت به حالت پیش‌فرض بازنشانی شد', 'info');
    }
  } catch (err) {
    showToast('خطا در برقراری ارتباط با سرور', 'error');
  }
}

// Rendering
function renderStats() {
  const d = state.stats;
  elements.statTotalAccounts.innerText = toPersianDigits(d.total_accounts || 0);
  elements.statActiveAccounts.innerText = toPersianDigits(d.active_accounts || 0);
  elements.statNeedsReauth.innerText = toPersianDigits(d.needs_reauth_accounts || 0);
  elements.statTotalCleaned.innerText = toPersianDigits(d.total_cleaned_items || 0);

  if (d.total_accounts > 0) {
    const pct = Math.round((d.active_accounts / d.total_accounts) * 100);
    elements.statActivePct.innerText = `${toPersianDigits(pct)}٪ فعال`;
  } else {
    elements.statActivePct.innerText = '۱۰۰٪ آماده به کار';
  }

  // Update success rate on card 4
  if (elements.statCleanSuccessRate) {
    if (d.total_cleaned_items > 0 || d.total_failed_items > 0) {
      elements.statCleanSuccessRate.innerText = `${toPersianDigits(Math.round(d.success_rate_pct || 100))}٪ موفقیت پاکسازی`;
    } else {
      elements.statCleanSuccessRate.innerText = '۱۰۰٪ موفقیت پاکسازی';
    }
  }

  // Render recent history on dashboard
  if (d.recent_history && d.recent_history.length > 0) {
    elements.dashRecentJobsContainer.innerHTML = d.recent_history.map(j => {
      const isDone = j.status === 'COMPLETED';
      const isErrors = j.status === 'COMPLETED_WITH_ERRORS';
      const badgeClass = isDone ? 'connected' : (isErrors ? 'busy' : 'needs_reauth');
      const badgeText = isDone ? '✅ تکمیل شده' : (isErrors ? '⚠️ تکمیل با خطا' : j.status);
      const pct = j.percentage !== undefined ? Math.round(j.percentage) : 100;

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05);">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="color:var(--primary); font-family:monospace;">${j.id}</strong>
              <span class="badge blue" style="font-size:0.75rem;">ACC-${j.account_id}</span>
            </div>
            <span style="font-size:0.8rem; color:var(--text-muted); display:block; margin-top:4px;">
              ${toPersianDigits(j.success_count)} موفق / ${toPersianDigits(j.fail_count)} خطا • پیشرفت: <strong style="color:var(--text-main);">${toPersianDigits(pct)}٪</strong>
            </span>
          </div>
          <span class="status-badge ${badgeClass}">${badgeText}</span>
        </div>
      `;
    }).join('');
  } else {
    elements.dashRecentJobsContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📋</span>
        <p>سابقه‌ای از پاکسازی ثبت نشده است.</p>
      </div>
    `;
  }
}

function renderAccountsTable() {
  if (!state.accounts || state.accounts.length === 0) {
    elements.accountsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <span class="empty-icon">📭</span>
          <p>هیچ حسابی در سیستم یافت نشد. با زدن دکمه «افزودن حساب جدید» اولین حساب را متصل کنید.</p>
        </td>
      </tr>
    `;
    return;
  }

  elements.accountsTableBody.innerHTML = state.accounts.map(acc => {
    const isSelected = state.selectedAccountIds.has(acc.id);
    const statusMap = {
      'CONNECTED': { class: 'connected', text: '🟢 متصل' },
      'NEEDS_REAUTH': { class: 'needs_reauth', text: '⚠️ نیازمند ورود' },
      'BUSY': { class: 'busy', text: '🧹 در حال پاکسازی' }
    };
    const st = statusMap[acc.status] || { class: 'needs_reauth', text: acc.status };

    return `
      <tr>
        <td>
          <input type="checkbox" class="acc-checkbox" data-id="${acc.id}" ${isSelected ? 'checked' : ''}>
        </td>
        <td><strong>${acc.internal_id}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="color:var(--text-main); font-size:0.95rem;">${escapeHtml(acc.label || acc.first_name || 'بدون نام')}</strong>
            <button class="btn-text btn-rename-acc" data-id="${acc.id}" data-name="${escapeHtml(acc.label || '')}" title="ویرایش نام حساب" style="padding:2px 6px; font-size:0.85rem; cursor:pointer;">✏️</button>
          </div>
        </td>
        <td dir="ltr" style="text-align:right;">${acc.phone_masked}</td>
        <td><span class="status-badge ${st.class}">${st.text}</span></td>
        <td>${toPersianDigits(acc.total_channels)} کانال / ${toPersianDigits(acc.total_groups)} گروه</td>
        <td>${acc.last_cleaned_at ? new Date(acc.last_cleaned_at).toLocaleDateString('fa-IR') : 'هرگز'}</td>
        <td>
          <button class="btn btn-secondary btn-sm btn-inspect-acc" data-id="${acc.id}">🔍 بررسی</button>
          <button class="btn btn-warning btn-sm btn-clean-acc" data-id="${acc.id}">🧹 پاکسازی</button>
          <button class="btn btn-danger btn-sm btn-delete-acc" data-id="${acc.id}">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  updateBulkActionButtons();
}

function updateBulkActionButtons() {
  const count = state.selectedAccountIds.size;
  if (count > 0) {
    if (elements.btnBulkInspect) elements.btnBulkInspect.style.display = 'inline-flex';
    elements.btnBulkDelete.style.display = 'inline-flex';
    elements.btnBulkClean.style.display = 'inline-flex';
    if (elements.selectedCountInspect) elements.selectedCountInspect.innerText = toPersianDigits(count);
    elements.selectedCount.innerText = toPersianDigits(count);
    elements.selectedCountClean.innerText = toPersianDigits(count);
  } else {
    if (elements.btnBulkInspect) elements.btnBulkInspect.style.display = 'none';
    elements.btnBulkDelete.style.display = 'none';
    elements.btnBulkClean.style.display = 'none';
  }
}

function renderActiveJobs() {
  const jobs = Object.values(state.activeJobs).filter(j => 
    !['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'ABORTED'].includes(j.state)
  );
  const count = jobs.length;
  if (count > 0) {
    elements.activeJobsBadge.style.display = 'inline-block';
    elements.activeJobsBadge.innerText = toPersianDigits(count);
  } else {
    elements.activeJobsBadge.style.display = 'none';
  }

  if (count === 0) {
    elements.activeJobsList.innerHTML = `
      <div class="empty-state glass-card">
        <span class="empty-icon">🎯</span>
        <h3>صف عملیات خالی است</h3>
        <p>یک یا چند حساب کاربری را از بخش مدیریت حساب‌ها انتخاب کرده و عملیات پاکسازی را آغاز کنید.</p>
      </div>
    `;
    return;
  }

  elements.activeJobsList.innerHTML = jobs.map(j => {
    const prog = getJobProgress(j);
    return `
      <div class="job-card glass-card" id="card-${j.job_id}">
        <div class="job-card-header">
          <div>
            <strong>تسک ${j.job_id}</strong>
            <span style="font-size:0.85rem; color:var(--text-muted); margin-right:8px;">حساب کاربری: ACC-${j.account_id}</span>
          </div>
          <span class="tag-live">${j.state || 'در حال اجرا'}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${prog.pct}%"></div>
        </div>
        <div class="job-card-footer">
          <span style="font-size:0.85rem; color:var(--text-muted);">
            پیشرفت: ${toPersianDigits(prog.pct)}٪ (${toPersianDigits(prog.current)} از ${toPersianDigits(prog.total)})
            ${j.current_peer_title ? ` • در حال خروج از: <strong>${j.current_peer_title}</strong>` : ''}
          </span>
          <div class="job-controls">
            <button class="btn btn-secondary btn-sm btn-job-pause" data-id="${j.job_id}">⏸️ توقف موقت</button>
            <button class="btn btn-primary btn-sm btn-job-resume" data-id="${j.job_id}">▶️ ادامه</button>
            <button class="btn btn-danger btn-sm btn-job-abort" data-id="${j.job_id}">⏹️ لغو</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateDashboardActiveJobs() {
  const jobs = Object.values(state.activeJobs).filter(j => 
    !['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'ABORTED'].includes(j.state)
  );
  if (jobs.length === 0) {
    elements.dashActiveJobsContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">☕</span>
        <p>در حال حاضر هیچ عملیات پاکسازی در حال اجرایی وجود ندارد.</p>
      </div>
    `;
    return;
  }

  elements.dashActiveJobsContainer.innerHTML = jobs.map(j => {
    const prog = getJobProgress(j);
    return `
    <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span>تسک ${j.job_id}</span>
        <strong style="color:var(--primary);">${toPersianDigits(prog.pct)}٪</strong>
      </div>
      <div class="progress-bar-container" style="margin-bottom:0; height:6px;">
        <div class="progress-bar-fill" style="width: ${prog.pct}%"></div>
      </div>
    </div>
    `;
  }).join('');
}

// Bulk Inspect Logic (بررسی و اسکن گروهی حساب‌ها)
async function startBulkInspect(accountIds) {
  if (!accountIds || accountIds.length === 0) {
    showToast('لطفاً ابتدا حداقل یک حساب کاربری را انتخاب کنید', 'warning');
    return;
  }

  const total = accountIds.length;
  state.currentBulkInspectedIds = accountIds;

  // Setup modal UI
  if (elements.modalBulkInspect) elements.modalBulkInspect.style.display = 'flex';
  if (elements.bulkInspectTitle) elements.bulkInspectTitle.innerText = `🔍 بررسی و اسکن گروهی (${toPersianDigits(total)} حساب کاربری)`;
  if (elements.bulkInspectProgressText) elements.bulkInspectProgressText.innerText = `در حال آماده‌سازی برای اسکن ${toPersianDigits(total)} حساب...`;
  if (elements.bulkInspectProgressPercent) elements.bulkInspectProgressPercent.innerText = '۰٪';
  if (elements.bulkInspectProgressBar) elements.bulkInspectProgressBar.style.width = '0%';
  if (elements.biAccountsCount) elements.biAccountsCount.innerText = toPersianDigits(total);
  if (elements.biTotalChannels) elements.biTotalChannels.innerText = '۰';
  if (elements.biTotalGroups) elements.biTotalGroups.innerText = '۰';
  if (elements.biFailedCount) elements.biFailedCount.innerText = '۰';
  if (elements.btnBulkInspectCleanAll) elements.btnBulkInspectCleanAll.style.display = 'none';

  let totalChannelsDiscovered = 0;
  let totalGroupsDiscovered = 0;
  let failedCount = 0;

  // Initial table rendering with pending status
  if (elements.bulkInspectTableBody) {
    elements.bulkInspectTableBody.innerHTML = accountIds.map(accId => {
      const acc = state.accounts.find(a => a.id == accId);
      const internalId = acc ? acc.internal_id : `ACC-${accId}`;
      const label = acc ? (acc.label || acc.first_name || 'بدون نام') : 'اکانت';
      const phone = acc ? (acc.phone_masked || acc.phone || '-') : '-';

      return `
        <tr id="bi-row-${accId}">
          <td><strong>${internalId}</strong></td>
          <td>${label}</td>
          <td dir="ltr" style="text-align:right;">${phone}</td>
          <td id="bi-status-${accId}">
            <span class="status-badge" style="background:rgba(255,255,255,0.06); color:var(--text-muted);">⏳ در صف انتظار...</span>
          </td>
          <td id="bi-channels-${accId}">-</td>
          <td id="bi-groups-${accId}">-</td>
          <td id="bi-action-${accId}">
            <button class="btn btn-secondary btn-sm" disabled style="opacity:0.5;">👁️ مشاهده</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Parallel inspection using standard system concurrency (up to 50 workers)
  const concurrencyLimit = Math.max(1, Math.min(50, total));

  let nextIndex = 0;
  let completedCount = 0;

  function updateProgressKPIs() {
    if (elements.biTotalChannels) elements.biTotalChannels.innerText = toPersianDigits(totalChannelsDiscovered);
    if (elements.biTotalGroups) elements.biTotalGroups.innerText = toPersianDigits(totalGroupsDiscovered);
    if (elements.biFailedCount) elements.biFailedCount.innerText = toPersianDigits(failedCount);

    const pct = Math.round((completedCount / total) * 100);
    if (elements.bulkInspectProgressBar) elements.bulkInspectProgressBar.style.width = `${pct}%`;
    if (elements.bulkInspectProgressPercent) elements.bulkInspectProgressPercent.innerText = `${toPersianDigits(pct)}٪`;
  }

  async function inspectWorker(workerId) {
    while (nextIndex < total) {
      const i = nextIndex++;
      const accId = accountIds[i];
      const acc = state.accounts.find(a => a.id == accId);
      const accName = acc ? acc.internal_id : `ACC-${accId}`;

      if (elements.bulkInspectProgressText) {
        elements.bulkInspectProgressText.innerText = `در حال بررسی همزمان (${toPersianDigits(concurrencyLimit)} ورکر فعال) • پیشرفت: ${toPersianDigits(completedCount)} از ${toPersianDigits(total)} حساب...`;
      }

      const statusEl = document.getElementById(`bi-status-${accId}`);
      if (statusEl) {
        statusEl.innerHTML = `<span class="status-badge busy">⚡ در حال اسکن...</span>`;
      }

      try {
        const res = await fetch(`/api/v1/clean/${accId}/dialogs`);
        const json = await res.json();

        if (json.success && json.data) {
          const d = json.data;
          const chCount = d.channels_count || 0;
          const grCount = d.groups_count || 0;

          totalChannelsDiscovered += chCount;
          totalGroupsDiscovered += grCount;

          if (statusEl) {
            statusEl.innerHTML = `<span class="status-badge connected">🟢 تکمیل شد</span>`;
          }

          const chEl = document.getElementById(`bi-channels-${accId}`);
          if (chEl) chEl.innerHTML = `<strong style="color:var(--primary);">${toPersianDigits(chCount)}</strong>`;

          const grEl = document.getElementById(`bi-groups-${accId}`);
          if (grEl) grEl.innerHTML = `<strong style="color:var(--purple);">${toPersianDigits(grCount)}</strong>`;

          const actEl = document.getElementById(`bi-action-${accId}`);
          if (actEl) {
            actEl.innerHTML = `<button class="btn btn-secondary btn-sm" onclick="openDialogsModal(${accId})">👁️ مشاهده</button>`;
          }
        } else {
          failedCount++;
          if (statusEl) {
            statusEl.innerHTML = `<span class="status-badge needs_reauth" title="${json.detail || ''}">⚠️ ناموفق / نیاز به ورود</span>`;
          }
          const chEl = document.getElementById(`bi-channels-${accId}`);
          if (chEl) chEl.innerText = '۰';
          const grEl = document.getElementById(`bi-groups-${accId}`);
          if (grEl) grEl.innerText = '۰';
        }
      } catch (err) {
        failedCount++;
        if (statusEl) {
          statusEl.innerHTML = `<span class="status-badge needs_reauth">❌ خطای شبکه</span>`;
        }
      }

      completedCount++;
      updateProgressKPIs();

      if (elements.bulkInspectProgressText && completedCount < total) {
        elements.bulkInspectProgressText.innerText = `در حال بررسی همزمان (${toPersianDigits(concurrencyLimit)} ورکر فعال) • پیشرفت: ${toPersianDigits(completedCount)} از ${toPersianDigits(total)} حساب...`;
      }

      // Gentle pause scaled for rate limit
      const workerDelay = Math.max(300, Math.min(1500, (minDelaySec * 1000) / concurrencyLimit));
      await new Promise(r => setTimeout(r, workerDelay));
    }
  }

  // Launch workers in parallel up to concurrencyLimit
  const workers = [];
  for (let w = 1; w <= concurrencyLimit; w++) {
    workers.push(inspectWorker(w));
  }
  await Promise.all(workers);

  // Finish
  if (elements.bulkInspectProgressText) elements.bulkInspectProgressText.innerText = `عملیات بررسی تمام حساب‌ها با موفقیت پایان یافت!`;
  if (elements.btnBulkInspectCleanAll) elements.btnBulkInspectCleanAll.style.display = 'inline-flex';
  showToast(`بررسی گروهی تکمیل شد (${toPersianDigits(totalChannelsDiscovered)} کانال و ${toPersianDigits(totalGroupsDiscovered)} گروه شناسایی شد)`, 'success');

  // Refresh background accounts & stats to show updated cache numbers
  fetchAccounts();
  fetchStats();
}

// Dialogs Modal Logic
async function openDialogsModal(accountId) {
  window.openDialogsModal = openDialogsModal;
  state.currentInspectingAccountId = accountId;
  const acc = state.accounts.find(a => a.id === accountId);
  const accName = acc ? (acc.label || acc.internal_id) : `ACC-${accountId}`;
  document.getElementById('dialogsModalTitle').innerText = `بررسی و انتخاب چت‌های حساب ${accName}`;
  elements.modalDialogs.style.display = 'flex';
  elements.dlgTotalChannels.innerText = '...';
  elements.dlgTotalGroups.innerText = '...';
  elements.dialogsTableBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center" style="padding: 30px;">
        <span class="status-dot" style="display:inline-block; margin-left:8px;"></span>
        در حال اسکن و دریافت فهرست کانال‌ها و گروه‌ها از سرور ایتا...
      </td>
    </tr>
  `;

  try {
    const res = await fetch(`/api/v1/clean/${accountId}/dialogs`);
    const json = await res.json();
    if (json.success) {
      const data = json.data;
      elements.dlgTotalChannels.innerText = toPersianDigits(data.channels_count || 0);
      elements.dlgTotalGroups.innerText = toPersianDigits(data.groups_count || 0);
      state.currentInspectingDialogs = data.items || [];
      renderDialogsTable(state.currentInspectingDialogs);
    } else {
      showToast(json.detail || 'خطا در واکشی اطلاعات حساب', 'error');
      elements.dialogsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <span class="empty-icon">⚠️</span>
            <p>${json.detail || 'خطا در واکشی اطلاعات حساب'}</p>
          </td>
        </tr>
      `;
    }
  } catch (err) {
    showToast('خطا در برقراری ارتباط با سرور', 'error');
    elements.dialogsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <span class="empty-icon">⚠️</span>
          <p>خطا در برقراری ارتباط با سرور</p>
        </td>
      </tr>
    `;
  }
}

function renderDialogsTable(items) {
  if (!items || items.length === 0) {
    elements.dialogsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <span class="empty-icon">✨</span>
          <p>هیچ کانال یا گروهی برای این حساب یافت نشد یا حساب قبلاً به صورت کامل پاکسازی شده است.</p>
        </td>
      </tr>
    `;
    return;
  }

  elements.dialogsTableBody.innerHTML = items.map(item => {
    const isChannel = item.type === 'channel' || item.type === 'supergroup';
    const typeLabel = isChannel ? 'کانال' : 'گروه';
    const ownerBadge = item.is_creator 
      ? '<span class="status-badge busy">👑 مالک/سازنده (محافظت‌شده)</span>'
      : (item.is_admin ? '<span class="status-badge connected">🛡️ ادمین</span>' : '<span style="color:var(--text-muted); font-size:0.8rem;">عضو عادی</span>');

    return `
      <tr>
        <td>
          <input type="checkbox" class="dlg-checkbox" data-peer-id="${item.peer_id}" ${item.is_creator ? 'disabled' : 'checked'}>
        </td>
        <td>
          <strong>${item.title || 'بدون عنوان'}</strong>
          <span style="font-size:0.75rem; color:var(--text-subtle); display:block;">شناسه: ${item.peer_id}</span>
        </td>
        <td>${typeLabel}</td>
        <td>${toPersianDigits(item.members_count || 0)}</td>
        <td>${ownerBadge}</td>
      </tr>
    `;
  }).join('');
}

// Modal Job Details State
let currentJobModalItems = [];
let currentJobModalFilter = 'all';
let currentJobModalSearch = '';

function renderJobModalTable() {
  if (!elements.jobItemsTableBody) return;

  const query = (currentJobModalSearch || '').trim().toLowerCase();
  const filter = currentJobModalFilter || 'all';

  const filtered = currentJobModalItems.filter(it => {
    // Status filter
    if (filter === 'success' && it.status !== 'LEFT_SUCCESS') return false;
    if (filter === 'failed' && it.status === 'LEFT_SUCCESS') return false;

    // Search query
    if (query) {
      const title = (it.peer_title || '').toLowerCase();
      const pid = String(it.peer_id || '').toLowerCase();
      const err = (it.error_message || it.error_code || '').toLowerCase();
      if (!title.includes(query) && !pid.includes(query) && !err.includes(query)) {
        return false;
      }
    }
    return true;
  });

  if (elements.jdItemsCountLabel) {
    elements.jdItemsCountLabel.innerText = `نمایش ${toPersianDigits(filtered.length)} از ${toPersianDigits(currentJobModalItems.length)} ردیف`;
  }

  if (filtered.length === 0) {
    elements.jobItemsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state" style="padding: 28px;">
          <p style="margin:0; color:var(--text-muted);">موردی با این جستجو یا فیلتر یافت نشد.</p>
        </td>
      </tr>
    `;
    return;
  }

  elements.jobItemsTableBody.innerHTML = filtered.map(it => {
    const isSuccess = it.status === 'LEFT_SUCCESS';
    const typeLabel = (it.peer_type === 'channel' || it.peer_type === 'supergroup') ? 'کانال' : 'گروه';
    const statusBadge = isSuccess 
      ? '<span class="status-badge connected">✅ ترک شد</span>'
      : '<span class="status-badge needs_reauth">❌ خطا</span>';

    const timeStr = it.processed_at ? new Date(it.processed_at).toLocaleTimeString('fa-IR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) : '-';

    return `
      <tr>
        <td><strong>${it.peer_title || 'بدون نام'}</strong></td>
        <td><span class="badge blue" style="font-size:0.75rem;">${typeLabel}</span></td>
        <td dir="ltr" style="font-family:monospace; font-size:0.8rem; color:var(--text-muted);">${it.peer_id}</td>
        <td>${statusBadge}</td>
        <td style="font-size:0.8rem; color:${isSuccess ? 'var(--text-muted)' : '#f87171'}; font-weight:${isSuccess ? 'normal' : '500'};">
          ${it.error_message || (isSuccess ? '-' : (it.error_code || 'خطای سرور'))}
        </td>
        <td><span style="font-size:0.8rem; color:var(--text-muted);">${timeStr}</span></td>
      </tr>
    `;
  }).join('');
}

function openMockJobDetails() {
  if (!elements.modalJobDetails) return;
  elements.modalJobDetails.style.display = 'flex';
  elements.jdJobId.innerText = 'job_sample_demo_802';
  if (elements.jdHeaderBadge) elements.jdHeaderBadge.innerText = 'حساب 09123456789 (نمونه تستی)';
  elements.jdSuccessCount.innerText = toPersianDigits(11);
  elements.jdFailCount.innerText = toPersianDigits(4);
  elements.jdStatus.innerText = 'تکمیل‌شده با خطا';
  if (elements.jobFailureSummaryBox) {
    elements.jobFailureSummaryBox.style.display = 'block';
    elements.jobFailureSummaryBox.innerHTML = '<strong>توجه:</strong> ۴ مورد از چت‌ها به دلیل محدودیت موقت اسپم یا محافظت سازنده از حساب خارج نشدند.';
  }

  currentJobModalFilter = 'all';
  currentJobModalSearch = '';
  if (elements.modalJobSearchInput) elements.modalJobSearchInput.value = '';
  if (elements.modalJobFilterPills) {
    elements.modalJobFilterPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-job-filter') === 'all'));
  }

  currentJobModalItems = [
    { peer_title: "کانال اخبار فوری و فناوری", peer_type: "channel", peer_id: "-1001428591024", status: "LEFT_SUCCESS", error_message: null, processed_at: new Date(Date.now() - 100000).toISOString() },
    { peer_title: "فروشگاه آنلاین پوشاک و مد", peer_type: "channel", peer_id: "-1001692847120", status: "LEFT_SUCCESS", error_message: null, processed_at: new Date(Date.now() - 95000).toISOString() },
    { peer_title: "گروه توسعه‌دهندگان پایتون و لینوکس", peer_type: "group", peer_id: "-1001552391002", status: "LEFT_SUCCESS", error_message: null, processed_at: new Date(Date.now() - 90000).toISOString() },
    { peer_title: "کانال تخفیف‌های ویژه روزانه", peer_type: "channel", peer_id: "-1001883920194", status: "LEFT_SUCCESS", error_message: null, processed_at: new Date(Date.now() - 85000).toISOString() },
    { peer_title: "کانال نیازمندی‌های استخدامی", peer_type: "channel", peer_id: "-1001772948201", status: "FAILED", error_code: "FLOOD_WAIT_15", error_message: "محدودیت موقت اسپم سرور ایتا (FloodWait)", processed_at: new Date(Date.now() - 80000).toISOString() },
    { peer_title: "کانال رسمی شرکت (تحت مالکیت)", peer_type: "channel", peer_id: "-1001992019284", status: "FAILED", error_code: "CREATOR_PROTECTED", error_message: "محافظت شده (مالک و سازنده چت)", processed_at: new Date(Date.now() - 75000).toISOString() },
    { peer_title: "اطلاع‌رسانی دانشگاه و آموزش عالی", peer_type: "channel", peer_id: "-1001229384756", status: "LEFT_SUCCESS", error_message: null, processed_at: new Date(Date.now() - 70000).toISOString() },
    { peer_title: "کانال هوش مصنوعی و داده کاوی", peer_type: "channel", peer_id: "-1001339485720", status: "LEFT_SUCCESS", error_message: null, processed_at: new Date(Date.now() - 65000).toISOString() },
    { peer_title: "گروه گفتگو و تبادل تجربیات", peer_type: "group", peer_id: "-1001884729105", status: "LEFT_SUCCESS", error_message: null, processed_at: new Date(Date.now() - 60000).toISOString() },
    { peer_title: "کانال آشپزی و سلامت خانواده", peer_type: "channel", peer_id: "-1001994827103", status: "LEFT_SUCCESS", error_message: null, processed_at: new Date(Date.now() - 55000).toISOString() },
    { peer_title: "کانال ویدیوها و کلیپ‌های سرگرمی", peer_type: "channel", peer_id: "-1001557382910", status: "LEFT_SUCCESS", error_message: null, processed_at: new Date(Date.now() - 50000).toISOString() },
    { peer_title: "کانال شعر و ادبیات معاصر", peer_type: "channel", peer_id: "-1001449281057", status: "LEFT_SUCCESS", error_message: null, processed_at: new Date(Date.now() - 45000).toISOString() },
    { peer_title: "گروه تست و ارزیابی ربات‌ها", peer_type: "group", peer_id: "-1001662910482", status: "FAILED", error_code: "CHAT_ADMIN_REQUIRED", error_message: "دسترسی ادمین جهت خروج نیاز است", processed_at: new Date(Date.now() - 40000).toISOString() },
    { peer_title: "کانال بازارچه و تبادلات محلی", peer_type: "channel", peer_id: "-1001773920194", status: "LEFT_SUCCESS", error_message: null, processed_at: new Date(Date.now() - 35000).toISOString() },
    { peer_title: "کانال آرشیو کتاب و مقالات", peer_type: "channel", peer_id: "-1001882910485", status: "FAILED", error_code: "NETWORK_TIMEOUT", error_message: "عدم پاسخ سرور در زمان مقرر", processed_at: new Date(Date.now() - 30000).toISOString() }
  ];

  renderJobModalTable();
  showToast('نمونه آزمایشی پاپ‌آپ با ۱۵ مورد باز شد. اسکرول و فیلتر را بررسی نمایید.', 'info');
}

function renderReportsTable() {
  if (!elements.reportsTableBody) return;

  if (!state.reports || state.reports.length === 0) {
    elements.reportsTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state" style="padding: 40px 20px;">
          <span class="empty-icon">📋</span>
          <p>هیچ سابقه یا گزارشی با این فیلتر یافت نشد.</p>
          <button class="btn btn-primary btn-sm" id="btnTestReportDetailsEmpty" style="margin-top:14px;">
            🧪 مشاهده نمونه گزارش آزمایشی (جهت تست پاپ‌آپ)
          </button>
        </td>
      </tr>
    `;
    const btnEmpty = document.getElementById('btnTestReportDetailsEmpty');
    if (btnEmpty) {
      btnEmpty.addEventListener('click', openMockJobDetails);
    }
    return;
  }

  elements.reportsTableBody.innerHTML = state.reports.map(r => {
    const statusMap = {
      'COMPLETED': { class: 'connected', text: '✅ موفق' },
      'COMPLETED_WITH_ERRORS': { class: 'needs_reauth', text: '⚠️ موفق با خطا' },
      'RUNNING': { class: 'busy', text: '⏳ در حال اجرا' },
      'PAUSED': { class: 'busy', text: '⏸️ متوقف موقت' },
      'ABORTED': { class: 'needs_reauth', text: '⛔ لغو شده' },
      'FAILED': { class: 'needs_reauth', text: '❌ ناموفق' }
    };
    const st = statusMap[r.status] || { class: 'needs_reauth', text: r.status };

    const startDate = r.started_at ? new Date(r.started_at).toLocaleString('fa-IR', {
      year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '-';

    let durationText = '-';
    if (r.duration_seconds !== null && r.duration_seconds !== undefined) {
      const mins = Math.floor(r.duration_seconds / 60);
      const secs = r.duration_seconds % 60;
      durationText = mins > 0 ? `${toPersianDigits(mins)} دقیقه و ${toPersianDigits(secs)} ثانیه` : `${toPersianDigits(secs)} ثانیه`;
    }

    return `
      <tr>
        <td><strong style="color:var(--primary); font-family:monospace;">${r.id}</strong></td>
        <td>
          <strong>${r.account_internal_id}</strong>
          <span style="font-size:0.8rem; color:var(--text-muted); display:block;">${r.account_label}</span>
        </td>
        <td><span class="status-badge ${st.class}">${st.text}</span></td>
        <td>${toPersianDigits(r.total_targets)}</td>
        <td><strong style="color:var(--success);">${toPersianDigits(r.success_count)}</strong></td>
        <td><strong style="color:${r.fail_count > 0 ? 'var(--danger)' : 'var(--text-muted)'};">${toPersianDigits(r.fail_count)}</strong></td>
        <td><span style="font-size:0.85rem;">${startDate}</span></td>
        <td><span style="font-size:0.85rem;">${durationText}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm btn-view-job-items" data-id="${r.id}" title="مشاهده جزئیات کانال‌ها">🔍 جزئیات</button>
          <button class="btn btn-danger btn-sm btn-delete-job" data-id="${r.id}" title="حذف گزارش">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function viewJobDetails(jobId) {
  if (!elements.modalJobDetails) return;
  elements.modalJobDetails.style.display = 'flex';
  elements.jobItemsTableBody.innerHTML = `
    <tr><td colspan="6" class="text-center" style="padding:30px;">در حال بارگذاری لاگ‌های این تسک...</td></tr>
  `;
  elements.jdJobId.innerText = jobId;
  if (elements.jdHeaderBadge) elements.jdHeaderBadge.innerText = jobId;
  elements.jobFailureSummaryBox.style.display = 'none';

  currentJobModalFilter = 'all';
  currentJobModalSearch = '';
  if (elements.modalJobSearchInput) elements.modalJobSearchInput.value = '';
  if (elements.modalJobFilterPills) {
    elements.modalJobFilterPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-job-filter') === 'all'));
  }

  try {
    const res = await fetch(`/api/v1/reports/${jobId}/items`);
    const json = await res.json();
    if (json.success) {
      const d = json.data;
      elements.jdSuccessCount.innerText = toPersianDigits(d.success_count);
      elements.jdFailCount.innerText = toPersianDigits(d.fail_count);
      elements.jdStatus.innerText = d.status;

      if (d.failure_summary) {
        elements.jobFailureSummaryBox.style.display = 'block';
        elements.jobFailureSummaryBox.innerText = `علت کلی خطا: ${d.failure_summary}`;
      }

      currentJobModalItems = d.items || [];
      renderJobModalTable();
    } else {
      showToast('خطا در دریافت جزئیات تسک', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('خطا در ارتباط با سرور', 'error');
  }
}

async function deleteReport(jobId) {
  const ok = await showConfirm({
    title: 'حذف گزارش پاکسازی',
    message: `آیا از حذف گزارش ${jobId} از تاریخچه سیستم اطمینان دارید؟\nاین عملیات قابل بازگشت نیست.`,
    confirmText: 'حذف گزارش',
    type: 'danger',
    icon: '🗑️'
  });
  if (!ok) return;

  try {
    const res = await fetch(`/api/v1/reports/${jobId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('گزارش با موفقیت حذف گردید', 'success');
      fetchReports();
    }
  } catch (err) {
    showToast('خطا در حذف گزارش', 'error');
  }
}

async function clearAllReports() {
  const ok = await showConfirm({
    title: 'پاکسازی کامل تاریخچه',
    message: 'آیا از پاکسازی تمام گزارشات و سوابق خاتمه‌یافته اطمینان دارید؟\nکلیه لاگ‌های ثبت‌شده پاک خواهند شد.',
    confirmText: 'پاکسازی همه',
    type: 'danger',
    icon: '🧹'
  });
  if (!ok) return;

  try {
    const res = await fetch('/api/v1/reports', { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('کلیه گزارشات با موفقیت پاکسازی شدند', 'success');
      fetchReports();
    }
  } catch (err) {
    showToast('خطا در پاکسازی تاریخچه', 'error');
  }
}

// Event Listeners & Tab Navigation
function setupEventListeners() {
  // Tabs switching
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.tabs.forEach(t => t.classList.remove('active'));
      elements.tabPanes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.getAttribute('data-tab');
      document.getElementById(`tab-${tabName}`).classList.add('active');

      const titleMap = {
        'dashboard': ['داشبورد جامع مدیریت حساب‌ها', 'نمای آماری وضعیت اتصال و پاکسازی حساب‌های کاربری'],
        'accounts': ['مدیریت و پایش حساب‌ها', 'فهرست، فیلتر، جستجو و عملیات دسته‌ای روی حساب‌های ایتا'],
        'cleaner': ['عملیات پاکسازی زنده', 'مانیتورینگ و کنترل بی‌درنگ خروج از کانال‌ها و گروه‌ها'],
        'reports': ['گزارشات و تاریخچه ممیزی', 'مشاهده لاگ‌های جزئی و سوابق پاکسازی موفق و ناموفق'],
        'settings': ['تنظیمات و پیکربندی سیستم', 'مدیریت سقف همزمانی ورکرها و قوانین ایمنی پاکسازی']
      };
      if (titleMap[tabName]) {
        elements.pageTitle.innerText = titleMap[tabName][0];
        elements.pageSubtitle.innerText = titleMap[tabName][1];
      }

      if (tabName === 'reports') {
        fetchReports();
      } else if (tabName === 'dashboard') {
        fetchStats();
      } else if (tabName === 'accounts') {
        fetchAccounts();
      } else if (tabName === 'cleaner') {
        fetchActiveJobs();
      } else if (tabName === 'settings') {
        fetchSettings();
      }
    });
  });

  elements.btnRefresh.addEventListener('click', () => {
    fetchStats();
    fetchAccounts();
    fetchActiveJobs();
    fetchReports();
    fetchSettings();
    showToast('اطلاعات با موفقیت بروزرسانی شد', 'info');
  });

  // Modal: Add Account
  elements.btnOpenAddModal.addEventListener('click', () => {
    elements.modalAddAccount.style.display = 'flex';
    if (elements.authStep2.style.display !== 'block') {
      elements.authStep1.style.display = 'block';
      elements.authStep2.style.display = 'none';
    }
    setTimeout(() => {
      if (elements.authStep2.style.display === 'block') {
        elements.inputOtp.focus();
      } else {
        elements.inputPhone.focus();
      }
    }, 60);
  });

  elements.btnCloseAddModal.addEventListener('click', () => {
    elements.modalAddAccount.style.display = 'none';
    clearInterval(state.otpCountdownInterval);
  });

  elements.btnBackToStep1.addEventListener('click', (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    elements.authStep1.style.display = 'block';
    elements.authStep2.style.display = 'none';
    clearInterval(state.otpCountdownInterval);
    setTimeout(() => {
      elements.inputPhone.focus();
    }, 60);
  });

  // Enter key support for phone input
  elements.inputPhone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      elements.btnSendCode.click();
    }
  });

  // Send Code
  elements.btnSendCode.addEventListener('click', async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const phone = elements.inputPhone.value.trim();
    const label = elements.inputLabel.value.trim();
    if (!phone) {
      showToast('لطفاً شماره موبایل را وارد نمایید', 'error');
      elements.inputPhone.focus();
      return;
    }

    elements.btnSendCode.disabled = true;
    elements.btnSendCode.innerText = 'در حال ارتباط با سرور ایتا...';

    try {
      const res = await fetch('/api/v1/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, label: label })
      });
      const json = await res.json();
      if (json.success) {
        state.currentAuthContext = json.data;
        elements.displayPhone.innerText = json.data.phone;
        elements.authStep1.style.display = 'none';
        elements.authStep2.style.display = 'block';
        startOtpTimer(json.data.timeout_seconds || 120);
        showToast('کد تأیید از طریق پیام‌رسان ایتا ارسال شد', 'success');
        setTimeout(() => {
          elements.inputOtp.focus();
        }, 80);
      } else {
        showToast(json.detail || 'خطا در ارسال کد', 'error');
      }
    } catch (err) {
      showToast('خطا در برقراری ارتباط با سرور', 'error');
    } finally {
      elements.btnSendCode.disabled = false;
      elements.btnSendCode.innerText = 'ارسال کد تأیید';
    }
  });

  // Enter key support for OTP input
  elements.inputOtp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      elements.btnVerifyCode.click();
    }
  });

  // Verify Code
  elements.btnVerifyCode.addEventListener('click', async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const otp = elements.inputOtp.value.trim();
    if (!otp) {
      showToast('لطفاً کد تأیید ورود را وارد نمایید', 'error');
      return;
    }

    elements.btnVerifyCode.disabled = true;
    elements.btnVerifyCode.innerText = 'در حال تأیید و رمزنگاری سشن...';

    try {
      const res = await fetch('/api/v1/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp_auth_id: state.currentAuthContext.temp_auth_id,
          phone_code_hash: state.currentAuthContext.phone_code_hash,
          code: otp,
          phone_number: state.currentAuthContext.phone,
          label: elements.inputLabel.value.trim()
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast('حساب کاربری با موفقیت متصل و سشن ذخیره شد', 'success');
        elements.modalAddAccount.style.display = 'none';
        elements.inputPhone.value = '';
        elements.inputLabel.value = '';
        elements.inputOtp.value = '';
        elements.authStep1.style.display = 'block';
        elements.authStep2.style.display = 'none';
        clearInterval(state.otpCountdownInterval);
        fetchAccounts();
        fetchStats();
      } else {
        showToast(json.detail || 'کد تأیید نامعتبر است', 'error');
      }
    } catch (err) {
      showToast('خطا در فرآیند تأیید ورود', 'error');
    } finally {
      elements.btnVerifyCode.disabled = false;
      elements.btnVerifyCode.innerText = 'تأیید و اتصال امن نشست';
    }
  });

  // Search and Filter
  elements.accountSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    fetchAccounts();
  });

  elements.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      elements.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.getAttribute('data-filter');
      fetchAccounts();
    });
  });

  // Table Checkbox interactions
  elements.selectAllCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      state.accounts.forEach(a => state.selectedAccountIds.add(a.id));
    } else {
      state.selectedAccountIds.clear();
    }
    renderAccountsTable();
  });

  elements.accountsTableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('acc-checkbox')) {
      const id = parseInt(e.target.getAttribute('data-id'));
      if (e.target.checked) {
        state.selectedAccountIds.add(id);
      } else {
        state.selectedAccountIds.delete(id);
      }
      updateBulkActionButtons();
    }
  });

  // Row Action buttons
  elements.accountsTableBody.addEventListener('click', async (e) => {
    const inspectBtn = e.target.closest('.btn-inspect-acc');
    const cleanBtn = e.target.closest('.btn-clean-acc');
    const deleteBtn = e.target.closest('.btn-delete-acc');

    if (inspectBtn) {
      const id = inspectBtn.getAttribute('data-id');
      if (id) {
        console.log('Inspecting account:', id);
        openDialogsModal(parseInt(id));
      }
      return;
    }

    if (cleanBtn) {
      const id = cleanBtn.getAttribute('data-id');
      if (id) {
        startCleaningForAccounts([parseInt(id)]);
      }
      return;
    }

    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      if (id) {
        const ok = await showConfirm({
          title: 'حذف حساب کاربری',
          message: 'آیا از حذف کامل این حساب و باطل کردن نشست در سیستم مطمئن هستید؟\nاطلاعات حساب و کلیدهای سشن رمزنگاری‌شده حذف خواهند شد.',
          confirmText: 'حذف قطعی حساب',
          type: 'danger',
          icon: '🗑️'
        });
        if (ok) {
          await fetch(`/api/v1/accounts/${id}`, { method: 'DELETE' });
          showToast('حساب با موفقیت حذف شد', 'info');
          fetchAccounts();
          fetchStats();
        }
      }
      return;
    }
  });

  // Bulk Clean & Delete
  elements.btnBulkClean.addEventListener('click', () => {
    const ids = Array.from(state.selectedAccountIds);
    if (ids.length > 0) {
      startCleaningForAccounts(ids);
    }
  });

  elements.btnBulkDelete.addEventListener('click', async () => {
    const ids = Array.from(state.selectedAccountIds);
    if (ids.length === 0) return;
    const ok = await showConfirm({
      title: 'حذف گروهی حساب‌ها',
      message: `آیا از حذف ${toPersianDigits(ids.length)} حساب کاربری انتخاب‌شده اطمینان دارید؟\nنشست‌ها و کلیه سوابق مرتبط با این حساب‌ها حذف خواهند شد.`,
      confirmText: `حذف ${toPersianDigits(ids.length)} حساب`,
      type: 'danger',
      icon: '🗑️'
    });
    if (ok) {
      await fetch('/api/v1/accounts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_ids: ids })
      });
      state.selectedAccountIds.clear();
      showToast('حساب‌های انتخاب‌شده حذف شدند', 'info');
      fetchAccounts();
      fetchStats();
    }
  });

  // Bulk Inspect Action
  if (elements.btnBulkInspect) {
    elements.btnBulkInspect.addEventListener('click', () => {
      const ids = Array.from(state.selectedAccountIds);
      if (ids.length > 0) {
        startBulkInspect(ids);
      }
    });
  }

  // Bulk Inspect Modal Controls
  if (elements.btnCloseBulkInspectModal) {
    elements.btnCloseBulkInspectModal.addEventListener('click', () => {
      elements.modalBulkInspect.style.display = 'none';
    });
  }

  if (elements.btnCloseBulkInspectBtn) {
    elements.btnCloseBulkInspectBtn.addEventListener('click', () => {
      elements.modalBulkInspect.style.display = 'none';
    });
  }

  if (elements.modalBulkInspect) {
    elements.modalBulkInspect.addEventListener('click', (e) => {
      if (e.target === elements.modalBulkInspect) {
        elements.modalBulkInspect.style.display = 'none';
      }
    });
  }

  if (elements.btnBulkInspectCleanAll) {
    elements.btnBulkInspectCleanAll.addEventListener('click', async () => {
      const ids = state.currentBulkInspectedIds || Array.from(state.selectedAccountIds);
      if (ids.length > 0) {
        const ok = await showConfirm({
          title: 'پاکسازی همزمان حساب‌های اسکن‌شده',
          message: `آیا مایلید عملیات پاکسازی خودکار برای تمام ${toPersianDigits(ids.length)} حساب انتخاب‌شده آغاز گردد؟`,
          confirmText: 'شروع پاکسازی گروهی',
          type: 'warning',
          icon: '🧹'
        });
        if (ok) {
          elements.modalBulkInspect.style.display = 'none';
          startCleaningForAccounts(ids);
        }
      }
    });
  }

  // Dialogs Inspection Modal Controls
  elements.btnCloseDialogsModal.addEventListener('click', () => {
    elements.modalDialogs.style.display = 'none';
  });

  elements.btnCancelClean.addEventListener('click', () => {
    elements.modalDialogs.style.display = 'none';
  });

  elements.modalDialogs.addEventListener('click', (e) => {
    if (e.target === elements.modalDialogs) {
      elements.modalDialogs.style.display = 'none';
    }
  });

  const modalAddAccountContent = document.getElementById('modalAddAccountContent');
  if (modalAddAccountContent) {
    modalAddAccountContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  elements.modalAddAccount.addEventListener('click', (e) => {
    if (e.target === elements.modalAddAccount) {
      if (elements.btnSendCode.disabled || elements.btnVerifyCode.disabled) {
        return; // Do not close while network operation is in progress
      }
      elements.modalAddAccount.style.display = 'none';
      clearInterval(state.otpCountdownInterval);
    }
  });

  // Account Rename Button Handler
  document.addEventListener('click', async (e) => {
    const renameBtn = e.target.closest('.btn-rename-acc');
    if (renameBtn) {
      e.preventDefault();
      e.stopPropagation();
      const accId = renameBtn.getAttribute('data-id');
      const currentName = renameBtn.getAttribute('data-name') || '';
      const newName = prompt('نام دلخواه جدید حساب کاربری را وارد نمایید:', currentName);
      if (newName !== null && newName.trim() !== '' && newName.trim() !== currentName) {
        try {
          const res = await fetch(`/api/v1/accounts/${accId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: newName.trim() })
          });
          const json = await res.json();
          if (json.success) {
            showToast('نام حساب کاربری با موفقیت بروزرسانی شد', 'success');
            fetchAccounts();
          } else {
            showToast(json.detail || 'خطا در ویرایش نام', 'error');
          }
        } catch (err) {
          showToast('خطا در برقراری ارتباط با سرور', 'error');
        }
      }
    }
  });

  elements.selectAllDialogs.addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('.dlg-checkbox:not(:disabled)').forEach(cb => {
      cb.checked = checked;
    });
  });

  elements.btnConfirmClean.addEventListener('click', async () => {
    if (!state.currentInspectingAccountId) return;
    const mode = document.querySelector('input[name="cleanMode"]:checked')?.value || 'FULL_CLEAN';
    let selectedPeerIds = [];
    if (mode === 'SELECTIVE') {
      selectedPeerIds = Array.from(document.querySelectorAll('.dlg-checkbox:checked')).map(cb => cb.getAttribute('data-peer-id'));
      if (selectedPeerIds.length === 0) {
        showToast('لطفاً حداقل یک مورد را برای پاکسازی انتخاب نمایید', 'warning');
        return;
      }
    }

    elements.modalDialogs.style.display = 'none';
    try {
      const res = await fetch('/api/v1/clean/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_ids: [state.currentInspectingAccountId],
          mode: mode,
          selected_peer_ids: selectedPeerIds
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast('عملیات پاکسازی با موفقیت آغاز شد', 'success');
        document.querySelector('[data-tab="cleaner"]').click();
        fetchActiveJobs();
        fetchAccounts();
      } else {
        showToast(json.detail || 'خطا در شروع پاکسازی', 'error');
      }
    } catch (err) {
      showToast('خطا در ارسال درخواست پاکسازی', 'error');
    }
  });

  elements.btnStartBatchModal.addEventListener('click', () => {
    const ids = Array.from(state.selectedAccountIds);
    if (ids.length === 0) {
      showToast('لطفاً ابتدا حساب‌های مورد نظر را از تب «مدیریت حساب‌ها» انتخاب نمایید', 'warning');
      document.querySelector('[data-tab="accounts"]').click();
    } else {
      startCleaningForAccounts(ids);
    }
  });

  elements.btnViewAllReports.addEventListener('click', () => {
    document.querySelector('[data-tab="reports"]').click();
  });

  // Job Controls: Pause, Resume, Abort
  elements.activeJobsList.addEventListener('click', async (e) => {
    const jid = e.target.getAttribute('data-id');
    if (!jid) return;

    if (e.target.classList.contains('btn-job-pause')) {
      await fetch(`/api/v1/clean/${jid}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PAUSE' })
      });
      showToast('عملیات متوقف شد', 'info');
    } else if (e.target.classList.contains('btn-job-resume')) {
      await fetch(`/api/v1/clean/${jid}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESUME' })
      });
      showToast('عملیات ادامه یافت', 'info');
    } else if (e.target.classList.contains('btn-job-abort')) {
      const ok = await showConfirm({
        title: 'لغو عملیات پاکسازی',
        message: 'آیا از لغو کامل و توقف این عملیات پاکسازی اطمینان دارید؟',
        confirmText: 'لغو قطعی عملیات',
        type: 'danger',
        icon: '⛔'
      });
      if (ok) {
        await fetch(`/api/v1/clean/${jid}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ABORT' })
        });
        showToast('عملیات لغو شد', 'warning');
      }
    }
  });

  // Reports Table Actions (View Items & Delete)
  if (elements.reportsTableBody) {
    elements.reportsTableBody.addEventListener('click', (e) => {
      const btnView = e.target.closest('.btn-view-job-items');
      if (btnView) {
        const jid = btnView.getAttribute('data-id');
        viewJobDetails(jid);
        return;
      }
      const btnDel = e.target.closest('.btn-delete-job');
      if (btnDel) {
        const jid = btnDel.getAttribute('data-id');
        deleteReport(jid);
        return;
      }
    });
  }

  // Reports Filter Pills
  if (elements.reportFilterPills) {
    elements.reportFilterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.reportFilterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.reportsFilter = pill.getAttribute('data-report-filter') || 'all';
        fetchReports();
      });
    });
  }

  // Reports Search
  if (elements.reportSearchInput) {
    let searchDebounce;
    elements.reportSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        state.reportsSearch = e.target.value.trim();
        fetchReports();
      }, 300);
    });
  }

  // Refresh & Clear Reports
  if (elements.btnRefreshReports) {
    elements.btnRefreshReports.addEventListener('click', () => {
      fetchReports();
      showToast('گزارشات با موفقیت بروزرسانی شدند', 'info');
    });
  }

  if (elements.btnClearReports) {
    elements.btnClearReports.addEventListener('click', () => {
      clearAllReports();
    });
  }

  // Test Report Details Button
  if (elements.btnTestReportDetails) {
    elements.btnTestReportDetails.addEventListener('click', () => {
      openMockJobDetails();
    });
  }

  // Job Details Modal Search & Filter
  if (elements.modalJobSearchInput) {
    elements.modalJobSearchInput.addEventListener('input', (e) => {
      currentJobModalSearch = e.target.value;
      renderJobModalTable();
    });
  }

  if (elements.modalJobFilterPills) {
    elements.modalJobFilterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.modalJobFilterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentJobModalFilter = pill.getAttribute('data-job-filter') || 'all';
        renderJobModalTable();
      });
    });
  }

  // Close Job Details Modal
  if (elements.btnCloseJobDetailsModal) {
    elements.btnCloseJobDetailsModal.addEventListener('click', () => {
      elements.modalJobDetails.style.display = 'none';
    });
  }
  if (elements.btnCloseJobDetailsBtn) {
    elements.btnCloseJobDetailsBtn.addEventListener('click', () => {
      elements.modalJobDetails.style.display = 'none';
    });
  }
  if (elements.modalJobDetails) {
    elements.modalJobDetails.addEventListener('click', (e) => {
      if (e.target === elements.modalJobDetails) {
        elements.modalJobDetails.style.display = 'none';
      }
    });
  }

  // Global ESC key to close active modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.modalJobDetails && elements.modalJobDetails.style.display !== 'none') {
        elements.modalJobDetails.style.display = 'none';
      }
      if (elements.modalAddAccount && elements.modalAddAccount.style.display !== 'none') {
        elements.modalAddAccount.style.display = 'none';
      }
      if (elements.modalBulkInspect && elements.modalBulkInspect.style.display !== 'none') {
        elements.modalBulkInspect.style.display = 'none';
      }
      if (elements.modalDialogs && elements.modalDialogs.style.display !== 'none') {
        elements.modalDialogs.style.display = 'none';
      }
    }
  });

  // Settings Controls & Listeners


  if (elements.btnSaveSettings) {
    elements.btnSaveSettings.addEventListener('click', saveSettings);
  }

  if (elements.btnResetSettings) {
    elements.btnResetSettings.addEventListener('click', resetSettings);
  }
}

function startOtpTimer(seconds) {
  let rem = seconds;
  clearInterval(state.otpCountdownInterval);
  state.otpCountdownInterval = setInterval(() => {
    rem--;
    const mins = Math.floor(rem / 60).toString().padStart(2, '0');
    const secs = (rem % 60).toString().padStart(2, '0');
    elements.otpCountdown.innerText = `${mins}:${secs}`;
    if (rem <= 0) {
      clearInterval(state.otpCountdownInterval);
      elements.otpCountdown.innerText = 'منقضی شده';
    }
  }, 1000);
}

async function startCleaningForAccounts(accountIds) {
  try {
    const res = await fetch('/api/v1/clean/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_ids: accountIds,
        mode: 'FULL_CLEAN'
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`${json.data.queued_count} حساب در صف پاکسازی قرار گرفت`, 'success');
      // Switch to cleaner tab
      document.querySelector('[data-tab="cleaner"]').click();
      fetchActiveJobs();
      fetchAccounts();
    } else {
      showToast(json.detail || 'خطا در ثبت تسک پاکسازی', 'error');
    }
  } catch (err) {
    showToast('خطا در برقراری ارتباط با سرور', 'error');
  }
}

// Initialization on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initWebSocket();
  fetchStats();
  fetchAccounts();
  fetchActiveJobs();
  fetchReports();
  fetchSettings();
});
