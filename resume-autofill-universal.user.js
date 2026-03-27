// ==UserScript==
// @name         Resume Autofill Universal
// @namespace
// @version      0.2.1
// @description  Parse resumes into local profiles and auto-fill recruitment forms with profile switching, mapping UI, OCR, and site-specific rules.
// @author
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @connect      cdn.jsdelivr.net
// @connect      unpkg.com
// @require      https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js
// @require      https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js
// @require      https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'resumeAutofillUniversal:state';
  const VERSION = '0.2.1';
  const TABS = ['profiles', 'templates', 'autofill', 'mapping', 'rules', 'data', 'logs'];
  const FIELD_DEFS = [
    ['name', '姓名'], ['phone', '手机号'], ['email', '邮箱'], ['wechat', '微信'], ['gender', '性别'], ['birthday', '出生日期'], ['age', '年龄'],
    ['city', '现居城市'], ['hometown', '籍贯'], ['politics', '政治面貌'], ['education', '最高学历'], ['school', '学校'], ['major', '专业'], ['degree', '学位'],
    ['graduateDate', '毕业时间'], ['experienceYears', '工作/实习年限'], ['currentCompany', '当前公司'], ['jobStatus', '求职状态'], ['expectedCity', '期望城市'],
    ['expectedJob', '期望岗位'], ['expectedSalary', '期望薪资'], ['portfolio', '作品集'], ['github', 'GitHub'], ['linkedin', 'LinkedIn'], ['skills', '技能标签'],
    ['languages', '语言能力'], ['certificate', '证书'], ['award', '获奖经历'], ['selfIntro', '自我评价'], ['project', '项目经历'], ['internship', '实习经历'],
    ['educationDetail', '教育经历'], ['campus', '校园经历'], ['custom', '自定义补充']
  ];
  const LONG_FIELDS = new Set(['skills', 'languages', 'certificate', 'award', 'selfIntro', 'project', 'internship', 'educationDetail', 'campus', 'custom']);
  const FIELD_ALIASES = {
    name: ['姓名', '名字', '真实姓名', 'name', 'username'],
    phone: ['手机号', '手机', '联系电话', '电话', 'mobile', 'phone', 'tel'],
    email: ['邮箱', '电子邮箱', 'email', 'mail'],
    wechat: ['微信', '微信号', 'wechat'],
    gender: ['性别', 'gender', 'sex'],
    birthday: ['出生日期', '生日', '出生年月', 'birthday', 'birth'],
    age: ['年龄', 'age'],
    city: ['现居城市', '所在城市', '居住城市', '当前城市', 'city'],
    hometown: ['籍贯', '生源地', '户籍', 'hometown'],
    politics: ['政治面貌', 'politics'],
    education: ['最高学历', '学历', 'education'],
    school: ['学校', '毕业院校', '院校', 'school', 'college', 'university'],
    major: ['专业', 'major'],
    degree: ['学位', 'degree'],
    graduateDate: ['毕业时间', '毕业日期', 'graduation', 'graduate'],
    experienceYears: ['工作年限', '实习年限', '工作/实习年限', '经验年限', 'experience'],
    currentCompany: ['当前公司', '现公司', '所在公司', 'company'],
    jobStatus: ['求职状态', '求职进度', 'status'],
    expectedCity: ['期望城市', '意向城市', '工作地点', '期望工作地点'],
    expectedJob: ['期望岗位', '意向岗位', '职位方向'],
    expectedSalary: ['期望薪资', '薪资要求', '期望月薪'],
    portfolio: ['作品集', '作品', '个人网站', 'portfolio', 'site', 'blog'],
    github: ['github', '代码仓库'],
    linkedin: ['linkedin'],
    skills: ['技能', '技能标签', '专业技能', 'skills', 'skill'],
    languages: ['语言能力', '外语', '语言', 'language'],
    certificate: ['证书', '资格证书', 'certificate'],
    award: ['获奖经历', '获奖', '奖励', 'award'],
    selfIntro: ['自我评价', '个人评价', '个人总结', '个人优势', '自我介绍'],
    project: ['项目经历', '项目经验', 'project'],
    internship: ['实习经历', '工作经历', '实践经历'],
    educationDetail: ['教育经历'],
    campus: ['校园经历', '学生工作', '社团经历'],
    custom: ['补充信息', '附加信息', '备注', 'custom']
  };
  const OPTION_DICTIONARY = {
    gender: { 男: ['男', 'male', 'm'], 女: ['女', 'female', 'f'] },
    education: { 博士: ['博士', 'phd'], 硕士: ['硕士', '研究生', 'master'], 本科: ['本科', '学士', 'bachelor'], 大专: ['大专', '专科'], 高中: ['高中'] },
    politics: { 中共党员: ['党员', '中共党员'], 共青团员: ['团员', '共青团员'], 群众: ['群众'] }
  };
  const SECTION_TITLES = ['教育经历', '项目经历', '项目经验', '实习经历', '工作经历', '专业技能', '技能', '自我评价', '个人优势', '获奖情况', '校园经历', '证书', '语言能力'];
  const PDF_JS_URLS = ['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'];
  const PDF_JS_WORKER_URLS = ['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js', 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'];
  const TESSERACT_URLS = ['https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js'];
  const MAMMOTH_URLS = ['https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js', 'https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js'];
  const state = loadState();
  ensureStateShape();
  injectStyles();
  renderLauncherWhenReady();
  registerMenu();
  observeDomChanges();

  let autoFilledPageKey = '';
  let pendingImportFile = null;
  let pendingImportFileName = '';
  function getPdfJsLib() { return globalThis.pdfjsLib || globalThis['pdfjs-dist/build/pdf'] || globalThis.pdfjsDistBuildPdf || null; }
  function getTesseractLib() { return globalThis.Tesseract || null; }
  function getMammothLib() { return globalThis.mammoth || null; }
  function requestRemoteText(url) {
    if (typeof GM_xmlhttpRequest === 'function') {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          onload: (response) => {
            if (response.status >= 200 && response.status < 400 && response.responseText) resolve(response.responseText);
            else reject(new Error(`\u52a0\u8f7d\u8fdc\u7a0b\u811a\u672c\u5931\u8d25: ${url} (${response.status})`));
          },
          onerror: () => reject(new Error(`\u52a0\u8f7d\u8fdc\u7a0b\u811a\u672c\u5931\u8d25: ${url}`))
        });
      });
    }
    return fetch(url).then((response) => {
      if (!response.ok) throw new Error(`\u52a0\u8f7d\u8fdc\u7a0b\u811a\u672c\u5931\u8d25: ${url} (${response.status})`);
      return response.text();
    });
  }
  async function ensureDependency(name, resolver, urls) {
    const existing = resolver();
    if (existing) return existing;
    let lastError = null;
    for (const url of urls) {
      try {
        const source = await requestRemoteText(url);
        Function(source).call(globalThis);
        const loaded = resolver();
        if (loaded) return loaded;
        lastError = new Error(`${name} \u5df2\u4e0b\u8f7d\u4f46\u672a\u6210\u529f\u521d\u59cb\u5316`);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error(`${name} \u52a0\u8f7d\u5931\u8d25`);
  }
  async function ensurePdfJsLib() {
    const pdfLib = await ensureDependency('PDF \u89e3\u6790\u5e93', getPdfJsLib, PDF_JS_URLS);
    if (pdfLib.GlobalWorkerOptions && !pdfLib.GlobalWorkerOptions.workerSrc) pdfLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_URLS[0];
    return pdfLib;
  }
  function ensureTesseractLib() { return ensureDependency('OCR \u8bc6\u522b\u5e93', getTesseractLib, TESSERACT_URLS); }
  function ensureMammothLib() { return ensureDependency('DOCX \u89e3\u6790\u5e93', getMammothLib, MAMMOTH_URLS); }
  function defaultState() {
    return { version: VERSION, profiles: [], activeProfileId: '', ui: { tab: 'profiles', busy: false }, logs: [], siteRules: {}, mappings: {}, lastScan: [], lastImportText: '' };
  }
  function loadState() {
    const raw = GM_getValue(STORAGE_KEY, '');
    if (!raw) return defaultState();
    try { return Object.assign(defaultState(), JSON.parse(raw)); } catch { return defaultState(); }
  }
  function saveState() { state.version = VERSION; GM_setValue(STORAGE_KEY, JSON.stringify(state)); }
  function makeProfile(id, name) { return { id, name, fileName: '', importedAt: '', sourceText: '', fields: Object.fromEntries(FIELD_DEFS.map(([k]) => [k, ''])), templates: { educations: [], projects: [], internships: [], awards: [], certificates: [], customQuestions: [] } }; }
  function ensureStateShape() {
    state.logs = Array.isArray(state.logs) ? state.logs.slice(-80) : [];
    state.siteRules = state.siteRules && typeof state.siteRules === 'object' ? state.siteRules : {};
    state.mappings = state.mappings && typeof state.mappings === 'object' ? state.mappings : {};
    state.lastScan = Array.isArray(state.lastScan) ? state.lastScan : [];
    if (!state.profiles || !state.profiles.length) { const id = createId(); state.profiles = [makeProfile(id, '默认简历')]; state.activeProfileId = id; }
    if (!state.activeProfileId || !state.profiles.some((p) => p.id === state.activeProfileId)) state.activeProfileId = state.profiles[0].id;
    if (!state.ui || typeof state.ui !== 'object') state.ui = { tab: 'profiles', busy: false };
    if (!TABS.includes(state.ui.tab)) state.ui.tab = 'profiles';
    if (typeof state.ui.busy !== 'boolean') state.ui.busy = false;
    saveState();
  }
  function getActiveProfile() { return state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0]; }
  function getSiteKey() { return location.hostname.replace(/^www\./, ''); }
  function getSiteMappings() { const key = getSiteKey(); if (!state.mappings[key]) state.mappings[key] = {}; return state.mappings[key]; }
  function getCurrentSiteRule() { const key = getSiteKey(); if (!state.siteRules[key]) state.siteRules[key] = { enabled: true, autoScan: true, autoFillOnOpen: false, hotkeyEnabled: true, preferredSelectors: '', ignoreSelectors: '', notes: '' }; return state.siteRules[key]; }
  const SITE_ADAPTERS = {
    nowcoder: { hosts: ['nowcoder.com'], selectors: ['.nc-form input', '.nc-form textarea', '.nc-form select'], aliases: { project: ['project'], internship: ['internship'], educationDetail: ['education'] } },
    boss: { hosts: ['zhipin.com'], selectors: ['.boss-form input', '.boss-form textarea', '.boss-form select'], aliases: { expectedJob: ['job'], selfIntro: ['advantage'], custom: ['extra'] } },
    zhilian: { hosts: ['zhaopin.com'], selectors: ['.resume-item input', '.resume-item textarea', '.resume-item select'], aliases: { internship: ['experience'], project: ['project'] } },
    job51: { hosts: ['51job.com', 'yingjiesheng.com'], selectors: ['.el-input__inner', '.el-textarea__inner', '.el-select input'], aliases: { educationDetail: ['education'], award: ['award'] } },
    lagou: { hosts: ['lagou.com'], selectors: ['.resume-form input', '.resume-form textarea', '.resume-form select'], aliases: { selfIntro: ['description'], project: ['project'] } },
    shixiseng: { hosts: ['shixiseng.com'], selectors: ['.form-item input', '.form-item textarea', '.form-item select'], aliases: { expectedCity: ['city'], internship: ['experience'] } },
    xiaomi: {
      hosts: ['xiaomi.jobs.f.mioffice.cn', 'jobs.f.mioffice.cn', 'jobs.mioffice.cn'],
      selectors: ['.el-input__inner', '.el-textarea__inner', '.el-select input', '.el-select', '.el-date-editor input', '.el-radio__original', '.el-checkbox__original', '.resume-form input', '.resume-form textarea', '.resume-form select'],
      aliases: {
        phone: ['\u624b\u673a\u53f7\u7801', '\u624b\u673a\u53f7'],
        email: ['\u90ae\u7bb1'],
        city: ['\u6240\u5728\u5730\u70b9'],
        hometown: ['\u5bb6\u4e61'],
        expectedCity: ['\u610f\u5411\u57ce\u5e02', '\u671f\u671b\u5de5\u4f5c\u5730\u70b9'],
        educationDetail: ['\u6559\u80b2\u7ecf\u5386'],
        internship: ['\u5b9e\u4e60\u7ecf\u5386'],
        project: ['\u9879\u76ee\u7ecf\u5386'],
        portfolio: ['\u4f5c\u54c1'],
        award: ['\u83b7\u5956'],
        languages: ['\u8bed\u8a00\u80fd\u529b'],
        selfIntro: ['\u81ea\u6211\u8bc4\u4ef7']
      }
    }
  };
  function getSiteAdapter() { const host = getSiteKey(); return Object.values(SITE_ADAPTERS).find((item) => item.hosts.some((x) => host.includes(x))) || { selectors: [], aliases: {} }; }
  function log(message) { state.logs.push(`${new Date().toLocaleTimeString()} ${message}`); state.logs = state.logs.slice(-80); saveState(); const box = document.querySelector('#rau-log'); if (box) box.textContent = state.logs.join('\n'); }
  function notify(text) { if (typeof GM_notification === 'function') GM_notification({ title: '简历自动填表', text, timeout: 3500 }); }
  function registerMenu() {
    GM_registerMenuCommand('打开简历自动填表面板', () => safeCall('openPanel', openPanel));
    GM_registerMenuCommand('执行自动填写', () => safeCall('autofill', () => autofillActiveProfile({})));
    GM_registerMenuCommand('导出全部数据', () => safeCall('export', exportStateToFile));
  }
  function safeCall(action, fn) {
    try { return fn(); } catch (error) {
      console.error('[Resume Autofill Universal]', action, error);
      showFallbackPanel(error, action);
      return null;
    }
  }
  function showFallbackPanel(error, action) {
    let panel = document.querySelector('#rau-panel');
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'rau-panel';
      document.body.appendChild(panel);
    }
    const msg = (error && error.message) ? error.message : String(error || 'Unknown error');
    panel.innerHTML = `<div style="padding:16px;font:14px/1.5 Segoe UI,sans-serif;background:#fff;border:1px solid #ddd;border-radius:12px"><h3 style="margin:0 0 10px">简历自动填表异常</h3><div style="font-size:12px;color:#333;white-space:pre-wrap">Action: ${action}\n${msg}</div><div style="margin-top:12px;display:flex;gap:8px"><button id="rau-retry" style="padding:8px 12px;border:none;border-radius:8px;background:#0f766e;color:#fff;cursor:pointer">重试</button><button id="rau-reset" style="padding:8px 12px;border:none;border-radius:8px;background:#dc2626;color:#fff;cursor:pointer">重置数据</button><button id="rau-close-fallback" style="padding:8px 12px;border:none;border-radius:8px;background:#e2e8f0;color:#111;cursor:pointer">关闭</button></div></div>`;
    const retry = panel.querySelector('#rau-retry');
    const reset = panel.querySelector('#rau-reset');
    const close = panel.querySelector('#rau-close-fallback');
    if (retry) retry.addEventListener('click', () => { try { renderPanel(panel); } catch (e) { console.error(e); } });
    if (reset) reset.addEventListener('click', () => { try { GM_setValue(STORAGE_KEY, ''); location.reload(); } catch (e) { console.error(e); } });
    if (close) close.addEventListener('click', () => panel.remove());
  }
  function renderLauncherWhenReady() {
    const mount = () => {
      try { renderLauncher(); } catch (error) { console.error('[Resume Autofill Universal] renderLauncher failed', error); }
    };
    mount();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
      window.addEventListener('load', mount, { once: true });
    } else {
      setTimeout(mount, 300);
    }
    setTimeout(mount, 1000);
    setTimeout(mount, 2500);
  }
  function injectStyles() {
    GM_addStyle(`#rau-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483646;border:none;border-radius:999px;padding:12px 16px;background:linear-gradient(135deg,#0f766e,#0ea5e9);color:#fff;cursor:pointer;font:600 14px/1.2 "Segoe UI",sans-serif;box-shadow:0 16px 40px rgba(2,132,199,.35)}#rau-panel{position:fixed;top:18px;right:18px;width:470px;max-height:calc(100vh - 36px);overflow:auto;z-index:2147483647;background:#f8fafc;color:#0f172a;border:1px solid rgba(15,23,42,.1);border-radius:22px;box-shadow:0 28px 100px rgba(15,23,42,.28);font:14px/1.45 "Segoe UI",sans-serif}#rau-panel *{box-sizing:border-box}.rau-head{padding:18px;background:radial-gradient(circle at top left,#ecfeff,#f8fafc 58%)}.rau-row{display:flex;gap:10px;align-items:center}.rau-row+.rau-row{margin-top:10px}.rau-grow{flex:1}.rau-title{margin:0;font-size:18px;font-weight:700}.rau-sub{margin-top:4px;font-size:12px;color:#475569}.rau-section{padding:14px 18px;border-top:1px solid rgba(15,23,42,.08)}.rau-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.rau-tab{border:none;border-radius:999px;padding:8px 12px;background:#e2e8f0;color:#0f172a;cursor:pointer;font-weight:600}.rau-tab.is-active{background:#0f766e;color:#fff}.rau-input,.rau-select,.rau-textarea{width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;color:#0f172a}.rau-textarea{min-height:86px;resize:vertical}.rau-btn{border:none;border-radius:12px;padding:10px 12px;cursor:pointer;font-weight:600}.rau-btn-primary{background:#0f766e;color:#fff}.rau-btn-secondary{background:#e2e8f0;color:#0f172a}.rau-btn-danger{background:#dc2626;color:#fff}.rau-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rau-field{display:flex;flex-direction:column;gap:6px}.rau-small{font-size:12px;color:#475569}.rau-meta{font-size:12px;color:#64748b}.rau-log{background:#0f172a;color:#cbd5e1;padding:10px;border-radius:12px;font:12px/1.5 Consolas,monospace;white-space:pre-wrap;max-height:220px;overflow:auto;overscroll-behavior:contain}.rau-card{padding:12px;border:1px solid #dbe2ea;border-radius:14px;background:#fff}.rau-badge{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:600;background:#dbeafe;color:#1d4ed8}.rau-list{display:flex;flex-direction:column;gap:10px}.rau-map-row{display:grid;grid-template-columns:1fr 140px 110px;gap:10px;align-items:center}.rau-table{display:flex;flex-direction:column;gap:8px}.rau-kv{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}.rau-inline-code{font:12px/1.4 Consolas,monospace;background:#eff6ff;padding:2px 6px;border-radius:8px}@media (max-width:768px){#rau-panel{left:10px;right:10px;top:10px;width:auto;max-height:calc(100vh - 20px)}#rau-launcher{right:12px;bottom:12px}.rau-map-row{grid-template-columns:1fr}.rau-grid{grid-template-columns:1fr}}`);
  }
  function renderLauncher() {
    if (!document.body || document.querySelector('#rau-launcher')) return;
    const button = document.createElement('button');
    button.id = 'rau-launcher';
    button.textContent = '简历自动填表';
    button.style.pointerEvents = 'auto';
    button.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); safeCall('openPanel', openPanel); });
    document.body.appendChild(button);
  }
  function openPanel() { let panel = document.querySelector('#rau-panel'); if (!panel) { panel = document.createElement('aside'); panel.id = 'rau-panel'; document.body.appendChild(panel); } try { renderPanel(panel); } catch (error) { showFallbackPanel(error, 'openPanel'); } }
  function closePanel() { const panel = document.querySelector('#rau-panel'); if (panel) panel.remove(); }
  function tabLabel(tab) { return { profiles: '简历', templates: '字段模板', autofill: '自动填写', mapping: '字段映射', rules: '站点规则', data: '数据', logs: '日志' }[tab] || tab; }
  function renderPanel(panel) {
    const profile = getActiveProfile();
    const scan = scanPageFields();
    const siteRule = getCurrentSiteRule();
    panel.innerHTML = `<div class="rau-head"><div class="rau-row"><div class="rau-grow"><h2 class="rau-title">简历自动填表</h2><div class="rau-sub">多简历、OCR、字段映射、站点规则、通用招聘表单自动填写</div></div><button class="rau-btn rau-btn-secondary" id="rau-close">关闭</button></div><div class="rau-tabs">${TABS.map((tab) => `<button class="rau-tab${state.ui.tab === tab ? ' is-active' : ''}" data-tab="${tab}">${tabLabel(tab)}</button>`).join('')}</div></div><div class="rau-section"><div class="rau-kv"><span class="rau-badge">当前站点: ${escapeHtml(getSiteKey())}</span><span class="rau-meta">识别到 ${scan.length} 个候选控件</span></div></div>${renderTab(profile, scan, siteRule)}`;
    wirePanelEvents(panel, scan);
  }
  function renderTab(profile, scan, siteRule) {
    if (state.ui.tab === 'profiles') return renderProfilesTab(profile);
    if (state.ui.tab === 'templates') return renderTemplatesTab(profile);
    if (state.ui.tab === 'autofill') return renderAutofillTab(profile, scan);
    if (state.ui.tab === 'mapping') return renderMappingTab(scan);
    if (state.ui.tab === 'rules') return renderRulesTab(siteRule);
    if (state.ui.tab === 'data') return renderDataTab(profile);
    return renderLogsTab();
  }
  function renderFieldEditor(key, label, value) {
    if (LONG_FIELDS.has(key)) return `<div class="rau-field" style="grid-column:1 / -1"><label class="rau-small">${escapeHtml(label)}</label><textarea class="rau-textarea" data-field="${key}">${escapeHtml(value)}</textarea></div>`;
    return `<div class="rau-field"><label class="rau-small">${escapeHtml(label)}</label><input class="rau-input" data-field="${key}" value="${escapeHtml(value)}"></div>`;
  }
  function renderProfilesTab(profile) {
    const selectedFileText = pendingImportFileName ? `\u5df2\u9009\u62e9\u6587\u4ef6: ${pendingImportFileName}` : '\u5c1a\u672a\u9009\u62e9\u4efb\u4f55\u6587\u4ef6\u3002';
    const importButtonLabel = state.ui.busy ? '\u89e3\u6790\u4e2d...' : '\u4e0a\u4f20\u5e76\u89e3\u6790';
    const disabledAttr = state.ui.busy ? ' disabled' : '';
    return `<div class="rau-section"><div class="rau-row"><div class="rau-grow"><label class="rau-small">\u5f53\u524d\u7b80\u5386\u6863\u6848</label><select class="rau-select" id="rau-profile-select">${state.profiles.map((item) => `<option value="${escapeHtml(item.id)}"${item.id === profile.id ? ' selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></div><button class="rau-btn rau-btn-secondary" id="rau-new-profile">\u65b0\u5efa</button><button class="rau-btn rau-btn-danger" id="rau-delete-profile">\u5220\u9664</button></div><div class="rau-row"><div class="rau-grow"><label class="rau-small">\u6863\u6848\u540d\u79f0</label><input class="rau-input" id="rau-profile-name" value="${escapeHtml(profile.name)}"></div></div><div class="rau-row"><input type="file" id="rau-file" class="rau-input rau-grow" accept=".pdf,.docx,.txt,.md,image/*,.png,.jpg,.jpeg,.webp,.json"${disabledAttr}><button class="rau-btn rau-btn-primary" id="rau-import"${disabledAttr}>${importButtonLabel}</button></div><div class="rau-meta">${escapeHtml(selectedFileText)}</div><div class="rau-row"><button class="rau-btn rau-btn-secondary rau-grow" id="rau-export-profile">\u5bfc\u51fa\u5f53\u524d\u6863\u6848</button><button class="rau-btn rau-btn-secondary rau-grow" id="rau-import-json">\u5bfc\u5165 JSON \u6863\u6848</button></div><div class="rau-meta">\u652f\u6301 PDF / DOCX / TXT / \u56fe\u7247 OCR\u3002\u5bfc\u5165\u53ea\u4fdd\u5b58\u5728\u672c\u5730\u6d4f\u89c8\u5668\u811a\u672c\u5b58\u50a8\u4e2d\uff0c\u4e0d\u4f1a\u5199\u5165\u516c\u5171\u811a\u672c\u9ed8\u8ba4\u6570\u636e\u3002</div></div><div class="rau-section"><div class="rau-grid">${FIELD_DEFS.map(([key, label]) => renderFieldEditor(key, label, profile.fields[key] || '')).join('')}</div></div>`;
  }
  function renderTemplatesTab(profile) {
    const templates = ensureTemplates(profile);
    return `<div class="rau-section"><div class="rau-row"><button class="rau-btn rau-btn-secondary rau-grow" id="rau-template-sync">同步结构化模板</button><button class="rau-btn rau-btn-secondary rau-grow" id="rau-template-demo">填充示例模板</button></div><div class="rau-meta">这里维护教育经历、项目经历、实习经历、奖项、证书和自定义问答。同步后会自动写回普通文本字段，方便通用站点表单填写。</div></div><div class="rau-section rau-list">${renderTemplateSection('educations', '教育经历', templates.educations, ['school','major','degree','start','end','description'])}${renderTemplateSection('projects', '项目经历', templates.projects, ['name','role','start','end','stack','description','highlights'])}${renderTemplateSection('internships', '实习经历', templates.internships, ['company','role','start','end','description','highlights'])}${renderTemplateSection('awards', '奖项', templates.awards, ['name','date','description'])}${renderTemplateSection('certificates', '证书', templates.certificates, ['name','date','score','description'])}${renderTemplateSection('customQuestions', '自定义问答', templates.customQuestions, ['question','keywords','priority','answer'])}</div>`;
  }
  function renderTemplateSection(type, label, items, fields) {
    return `<div class="rau-card"><div class="rau-row"><div class="rau-grow"><strong>${escapeHtml(label)}</strong><div class="rau-small">${escapeHtml(type)}</div></div><button class="rau-btn rau-btn-secondary" data-template-add="${type}">新增</button></div><div class="rau-list">${(items || []).map((item, index) => renderTemplateCard(type, label, item, index, fields)).join('') || `<div class="rau-small">暂无条目</div>`}</div></div>`;
  }
  function renderTemplateCard(type, label, item, index, fields) {
    return `<div class="rau-card"><div class="rau-row"><strong>${escapeHtml(label)} #${index + 1}</strong><button class="rau-btn rau-btn-danger" data-template-remove="${type}" data-template-index="${index}">删除</button></div><div class="rau-grid">${fields.map((field) => renderTemplateInput(type, index, field, item && item[field] != null ? item[field] : '')).join('')}</div></div>`;
  }
  function renderTemplateInput(type, index, field, value) {
    const stringValue = Array.isArray(value) ? value.join('\n') : String(value || '');
    const longField = ['description', 'answer', 'highlights', 'keywords'].includes(field);
    const title = ({ school: '学校', major: '专业', degree: '学历/学位', start: '开始时间', end: '结束时间', description: '描述', name: '名称', role: '角色/岗位', stack: '技术栈', company: '公司', date: '日期', score: '分数/等级', question: '问题', keywords: '关键词', priority: '优先级', answer: '答案', highlights: '亮点' })[field] || field;
    if (longField) return `<div class="rau-field" style="grid-column:1 / -1"><label class="rau-small">${escapeHtml(title)}</label><textarea class="rau-textarea" data-template-field="${type}" data-template-index="${index}" data-template-key="${field}">${escapeHtml(stringValue)}</textarea></div>`;
    return `<div class="rau-field"><label class="rau-small">${escapeHtml(title)}</label><input class="rau-input" data-template-field="${type}" data-template-index="${index}" data-template-key="${field}" value="${escapeHtml(stringValue)}"></div>`;
  }
  function renderAutofillTab(profile, scan) {
    return `<div class="rau-section"><div class="rau-row"><button class="rau-btn rau-btn-primary rau-grow" id="rau-fill">自动填写当前页面</button><button class="rau-btn rau-btn-secondary" id="rau-scan">重新扫描</button><button class="rau-btn rau-btn-secondary" id="rau-fill-mapped">仅填已映射</button></div><div class="rau-row"><button class="rau-btn rau-btn-secondary rau-grow" id="rau-fill-empty">只填空白字段</button><button class="rau-btn rau-btn-secondary rau-grow" id="rau-fill-all">覆盖当前可识别字段</button></div><div class="rau-meta">${escapeHtml(describeAutofillTargets(profile, scan))}</div></div><div class="rau-section"><div class="rau-list">${scan.slice(0, 80).map((item, index) => `<div class="rau-card"><div class="rau-kv"><strong>#${index + 1} ${escapeHtml(item.tag)}</strong><span class="rau-small">${escapeHtml(item.selector)}</span></div><div class="rau-small">标签信息: ${escapeHtml((item.meta || '').slice(0, 160) || '无')}</div><div class="rau-small">当前识别: <span class="rau-inline-code">${escapeHtml(item.inferredField || '未识别')}</span></div></div>`).join('')}</div></div>`;
  }
  function renderMappingTab(scan) {
    const siteMappings = getSiteMappings();
    return `<div class="rau-section"><div class="rau-row"><button class="rau-btn rau-btn-secondary rau-grow" id="rau-auto-map">按识别结果生成映射</button><button class="rau-btn rau-btn-secondary" id="rau-clear-mapping">清空本站映射</button></div><div class="rau-meta">字段映射用于解决站点标签写法特殊、自动识别不准的情况。保存后该站点会优先按映射填写。</div></div><div class="rau-section"><div class="rau-table">${scan.slice(0, 80).map((item, index) => `<div class="rau-card rau-map-row"><div><div><strong>#${index + 1} ${escapeHtml(item.tag)}</strong></div><div class="rau-small">${escapeHtml((item.meta || '').slice(0, 120) || item.selector)}</div></div><select class="rau-select" data-map-target="${escapeHtml(item.key)}"><option value="">不映射</option>${FIELD_DEFS.map(([key, label]) => `<option value="${key}"${siteMappings[item.key] === key ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select><button class="rau-btn rau-btn-secondary" data-highlight="${escapeHtml(item.key)}">高亮字段</button></div>`).join('')}</div></div>`;
  }
  function renderRulesTab(siteRule) {
    return `<div class="rau-section"><div class="rau-row"><label class="rau-small rau-grow">启用本站规则</label><input type="checkbox" id="rau-rule-enabled" ${siteRule.enabled ? 'checked' : ''}></div><div class="rau-row"><label class="rau-small rau-grow">面板打开时自动扫描</label><input type="checkbox" id="rau-rule-autoscan" ${siteRule.autoScan ? 'checked' : ''}></div><div class="rau-row"><div class="rau-grow"><label class="rau-small">优先选择器</label><textarea class="rau-textarea" id="rau-rule-preferred">${escapeHtml(siteRule.preferredSelectors || '')}</textarea></div></div><div class="rau-row"><div class="rau-grow"><label class="rau-small">忽略选择器</label><textarea class="rau-textarea" id="rau-rule-ignore">${escapeHtml(siteRule.ignoreSelectors || '')}</textarea></div></div><div class="rau-row"><div class="rau-grow"><label class="rau-small">备注</label><textarea class="rau-textarea" id="rau-rule-notes">${escapeHtml(siteRule.notes || '')}</textarea></div></div><div class="rau-row"><button class="rau-btn rau-btn-primary rau-grow" id="rau-save-rules">保存站点规则</button></div></div>`;
  }
  function renderDataTab(profile) {
    return `<div class="rau-section"><div class="rau-row"><button class="rau-btn rau-btn-secondary rau-grow" id="rau-export-state">导出全部数据</button><button class="rau-btn rau-btn-secondary rau-grow" id="rau-copy-json">复制当前档案 JSON</button></div><div class="rau-row"><button class="rau-btn rau-btn-danger rau-grow" id="rau-reset-scan">清空最近扫描</button><button class="rau-btn rau-btn-danger rau-grow" id="rau-reset-logs">清空日志</button></div><div class="rau-meta">当前档案文件: ${escapeHtml(profile.fileName || '未导入')}，最近导入时间: ${escapeHtml(profile.importedAt || '无')}</div></div><div class="rau-section"><label class="rau-small">当前档案 JSON 预览</label><textarea class="rau-textarea" readonly>${escapeHtml(JSON.stringify(profile, null, 2))}</textarea></div>`;
  }
  function renderLogsTab() { return `<div class="rau-section"><div id="rau-log" class="rau-log">${escapeHtml(state.logs.join('\n'))}</div></div>`; }
  function wirePanelEvents(panel, scan) {
    panel.querySelector('#rau-close').addEventListener('click', closePanel);
    panel.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { state.ui.tab = button.dataset.tab; saveState(); renderPanel(panel); }));
    const profile = getActiveProfile();
    if (state.ui.tab === 'profiles') {
      panel.querySelector('#rau-profile-select').addEventListener('change', (event) => { state.activeProfileId = event.target.value; saveState(); renderPanel(panel); });
      panel.querySelector('#rau-profile-name').addEventListener('change', (event) => { profile.name = event.target.value.trim() || profile.name; saveState(); });
      panel.querySelector('#rau-new-profile').addEventListener('click', () => { const id = createId(); state.profiles.unshift(makeProfile(id, `简历-${state.profiles.length + 1}`)); state.activeProfileId = id; saveState(); log('已新建简历档案。'); renderPanel(panel); });
      panel.querySelector('#rau-delete-profile').addEventListener('click', () => { if (state.profiles.length <= 1) { log('至少保留一个简历档案。'); return; } state.profiles = state.profiles.filter((item) => item.id !== profile.id); state.activeProfileId = state.profiles[0].id; saveState(); log('已删除当前简历档案。'); renderPanel(panel); });
      panel.querySelector('#rau-import').addEventListener('click', async () => {
        if (state.ui.busy) { log('\u6b63\u5728\u5bfc\u5165\uff0c\u8bf7\u7a0d\u5019\u3002'); return; }
        const fileInput = panel.querySelector('#rau-file');
        const file = pendingImportFile || (fileInput.files && fileInput.files[0]);
        if (!file) { log('请选择要导入的文件。'); notify('请先选择要导入的简历文件。'); return; }
        state.ui.busy = true;
        saveState();
        log(`开始导入文件: ${file.name}`);
        try {
          if (file.name.toLowerCase().endsWith('.json')) {
            await importProfileJson(file);
          } else {
            await importResumeFile(file, profile);
          }
          pendingImportFile = null;
          pendingImportFileName = '';
          notify(`导入完成: ${file.name}`);
        } catch (error) {
          console.error(error);
          log(`导入失败: ${error.message}`);
          notify(`导入失败: ${error.message}`);
        } finally {
          state.ui.busy = false;
          saveState();
          renderPanel(panel);
        }
      });
      panel.querySelector('#rau-export-profile').addEventListener('click', () => exportProfile(profile));
      panel.querySelector('#rau-import-json').addEventListener('click', () => panel.querySelector('#rau-file').click());
      panel.querySelector('#rau-file').addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        pendingImportFile = file;
        pendingImportFileName = file.name;
        log(`已选择文件: ${file.name}`);
        renderPanel(panel);
      });
      panel.querySelectorAll('[data-field]').forEach((element) => element.addEventListener('change', () => saveFieldsFromPanel(panel, profile)));
    }
    if (state.ui.tab === 'templates') {
      panel.querySelector('#rau-template-sync').addEventListener('click', () => { saveTemplateCardsFromPanel(panel, profile); syncTemplatesToFields(profile); log('已同步结构化模板到文本字段。'); renderPanel(panel); });
      panel.querySelector('#rau-template-demo').addEventListener('click', () => { profile.templates = sampleTemplates(); saveState(); renderPanel(panel); });
      panel.querySelectorAll('[data-template-add]').forEach((button) => button.addEventListener('click', () => { const templates = ensureTemplates(profile); const type = button.dataset.templateAdd; templates[type].push(createTemplateItem(type)); saveState(); renderPanel(panel); }));
      panel.querySelectorAll('[data-template-remove]').forEach((button) => button.addEventListener('click', () => { const templates = ensureTemplates(profile); const type = button.dataset.templateRemove; const index = Number(button.dataset.templateIndex); templates[type].splice(index, 1); saveState(); renderPanel(panel); }));
      panel.querySelectorAll('[data-template-field]').forEach((element) => element.addEventListener('change', () => saveTemplateCardsFromPanel(panel, profile)));
    }
    if (state.ui.tab === 'autofill') {
      const runAutofill = (action, options) => safeCall(action, () => { const filled = autofillActiveProfile(options); renderPanel(panel); return filled; });
      panel.querySelector('#rau-fill').addEventListener('click', () => runAutofill('autofillCurrentPage', { overwrite: false }));
      panel.querySelector('#rau-fill-mapped').addEventListener('click', () => runAutofill('autofillMappedOnly', { overwrite: true, mappedOnly: true }));
      panel.querySelector('#rau-fill-empty').addEventListener('click', () => runAutofill('autofillEmptyOnly', { overwrite: false, emptyOnly: true }));
      panel.querySelector('#rau-fill-all').addEventListener('click', () => runAutofill('autofillOverwrite', { overwrite: true }));
      panel.querySelector('#rau-scan').addEventListener('click', () => safeCall('rescanPage', () => { state.lastScan = []; saveState(); log(`重新扫描完成，发现 ${scanPageFields().length} 个候选控件。`); renderPanel(panel); }));
    }
    if (state.ui.tab === 'mapping') {
      panel.querySelector('#rau-auto-map').addEventListener('click', () => { autoGenerateMappings(scan); renderPanel(panel); });
      panel.querySelector('#rau-clear-mapping').addEventListener('click', () => { state.mappings[getSiteKey()] = {}; saveState(); log('已清空本站映射。'); renderPanel(panel); });
      panel.querySelectorAll('[data-map-target]').forEach((select) => select.addEventListener('change', () => { const site = getSiteKey(); if (!state.mappings[site]) state.mappings[site] = {}; const value = select.value.trim(); const target = select.dataset.mapTarget; if (!value) delete state.mappings[site][target]; else state.mappings[site][target] = value; saveState(); }));
      panel.querySelectorAll('[data-highlight]').forEach((button) => button.addEventListener('click', () => highlightFieldByKey(button.dataset.highlight, scan)));
    }
    if (state.ui.tab === 'rules') {
      panel.querySelector('#rau-save-rules').addEventListener('click', () => { const rule = getCurrentSiteRule(); rule.enabled = panel.querySelector('#rau-rule-enabled').checked; rule.autoScan = panel.querySelector('#rau-rule-autoscan').checked; rule.preferredSelectors = panel.querySelector('#rau-rule-preferred').value.trim(); rule.ignoreSelectors = panel.querySelector('#rau-rule-ignore').value.trim(); rule.notes = panel.querySelector('#rau-rule-notes').value.trim(); saveState(); log(`已保存站点规则: ${getSiteKey()}`); });
    }
    if (state.ui.tab === 'data') {
      panel.querySelector('#rau-export-state').addEventListener('click', exportStateToFile);
      panel.querySelector('#rau-copy-json').addEventListener('click', async () => { try { await navigator.clipboard.writeText(JSON.stringify(profile, null, 2)); log('已复制当前档案 JSON。'); } catch { log('复制失败。'); } });
      panel.querySelector('#rau-reset-scan').addEventListener('click', () => { state.lastScan = []; saveState(); log('已清空最近扫描。'); renderPanel(panel); });
      panel.querySelector('#rau-reset-logs').addEventListener('click', () => { state.logs = []; saveState(); renderPanel(panel); });
    }
    if (state.ui.tab === 'logs') {
      const logBox = panel.querySelector('#rau-log');
      if (logBox) {
        logBox.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });
        logBox.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: true });
      }
    }
  }
  function ensureTemplates(profile) {
    if (!profile.templates || typeof profile.templates !== 'object') profile.templates = {};
    ['educations','projects','internships','awards','certificates','customQuestions'].forEach((key) => { if (!Array.isArray(profile.templates[key])) profile.templates[key] = []; });
    return profile.templates;
  }
  function sampleTemplates() {
    return {
      educations: [{ school: '学校名称', major: '专业名称', degree: '本科/硕士', start: '2021-09', end: '2025-06', description: '主修课程、成绩、荣誉' }],
      projects: [{ name: '项目名称', role: '负责角色', start: '2024-03', end: '2024-06', description: '项目背景', highlights: ['负责核心模块', '完成关键优化'], stack: 'React / Node.js / GIS' }],
      internships: [{ company: '公司名称', role: '岗位名称', start: '2024-07', end: '2024-09', description: '实习内容', highlights: ['完成业务需求', '推动性能优化'] }],
      awards: [{ name: '奖项名称', date: '2024-10', description: '竞赛或荣誉说明' }],
      certificates: [{ name: '证书名称', date: '2024-01', score: '可选', description: '证书说明' }],
      customQuestions: [{ question: '为什么选择我们？', keywords: ['为什么选择我们', 'why us'], priority: 100, answer: '这里填写你的标准回答模板。' }]
    };
  }
  function createTemplateItem(type) {
    if (type === 'educations') return { school: '', major: '', degree: '', start: '', end: '', description: '' };
    if (type === 'projects') return { name: '', role: '', start: '', end: '', stack: '', description: '', highlights: [] };
    if (type === 'internships') return { company: '', role: '', start: '', end: '', description: '', highlights: [] };
    if (type === 'awards') return { name: '', date: '', description: '' };
    if (type === 'certificates') return { name: '', date: '', score: '', description: '' };
    if (type === 'customQuestions') return { question: '', keywords: [], priority: 50, answer: '' };
    return {};
  }
  function syncTemplatesToFields(profile) {
    const t = ensureTemplates(profile);
    profile.fields.educationDetail = t.educations.map((item) => `${item.start || ''} - ${item.end || ''} ${item.school || ''} ${item.major || ''} ${item.degree || ''}\n${item.description || ''}`.trim()).filter(Boolean).join('\n\n');
    profile.fields.project = t.projects.map((item) => `${item.start || ''} - ${item.end || ''} ${item.name || ''} ${item.role || ''}\n${item.description || ''}${item.highlights && item.highlights.length ? `\n${item.highlights.map((x) => `- ${x}`).join('\n')}` : ''}${item.stack ? `\n技术栈: ${item.stack}` : ''}`.trim()).filter(Boolean).join('\n\n');
    profile.fields.internship = t.internships.map((item) => `${item.start || ''} - ${item.end || ''} ${item.company || ''} ${item.role || ''}\n${item.description || ''}${item.highlights && item.highlights.length ? `\n${item.highlights.map((x) => `- ${x}`).join('\n')}` : ''}`.trim()).filter(Boolean).join('\n\n');
    profile.fields.award = t.awards.map((item) => `${item.date || ''} ${item.name || ''} ${item.description || ''}`.trim()).filter(Boolean).join('\n');
    profile.fields.certificate = t.certificates.map((item) => `${item.date || ''} ${item.name || ''} ${item.score || ''} ${item.description || ''}`.trim()).filter(Boolean).join('\n');
    const qaText = t.customQuestions.map((item) => `Q: ${item.question || ''}\nA: ${item.answer || ''}`).filter(Boolean).join('\n\n');
    profile.fields.custom = qaText.trim();
    saveState();
  }
  function normalizeTemplateValue(key, value) {
    if (key === 'highlights' || key === 'keywords') return String(value || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
    if (key === 'priority') return Number(String(value || '0').trim() || '0');
    return String(value || '').trim();
  }
  function saveTemplateCardsFromPanel(panel, profile) {
    const templates = ensureTemplates(profile);
    panel.querySelectorAll('[data-template-field]').forEach((element) => {
      const type = element.dataset.templateField;
      const index = Number(element.dataset.templateIndex);
      const key = element.dataset.templateKey;
      if (!templates[type] || !templates[type][index]) return;
      templates[type][index][key] = normalizeTemplateValue(key, element.value);
    });
    saveState();
  }
  function saveFieldsFromPanel(panel, profile) { panel.querySelectorAll('[data-field]').forEach((element) => { profile.fields[element.dataset.field] = element.value.trim(); }); saveState(); }
  async function importProfileJson(file) {
    try {
      const parsed = JSON.parse(await file.text());
      const profile = makeProfile(createId(), parsed.name || file.name.replace(/\.[^.]+$/, ''));
      profile.fileName = file.name; profile.importedAt = new Date().toISOString(); profile.fields = Object.assign(profile.fields, parsed.fields || {}); profile.sourceText = parsed.sourceText || '';
      state.profiles.unshift(profile); state.activeProfileId = profile.id; saveState(); log(`已导入 JSON 档案: ${profile.name}`);
    } catch (error) { log(`JSON 导入失败: ${error.message}`); }
  }
  async function importResumeFile(file, profile) {
    log(`开始解析文件: ${file.name}`);
    const text = await extractTextFromFile(file);
    log(`文本提取完成，长度 ${text.trim().length} 字符。`);
    if (!text.trim()) { log('未提取到文本，请尝试更清晰的 PDF 或图片。'); notify('未提取到简历文本，请尝试更清晰的 PDF、DOCX 或图片。'); return; }
    const parsed = parseResumeText(text);
    if (!parsed.fields.custom) parsed.fields.custom = text.slice(0, 8000);
    profile.fileName = file.name; profile.importedAt = new Date().toISOString(); profile.sourceText = text.slice(0, 120000); profile.fields = Object.assign({}, profile.fields, parsed.fields);
    const filledCount = Object.values(parsed.fields).filter((value) => String(value || '').trim()).length;
    state.lastImportText = text.slice(0, 6000);
    saveState();
    log(`\u89e3\u6790\u5b8c\u6210: ${parsed.hits.length ? parsed.hits.join('\u3001') : '\u672a\u547d\u4e2d\u663e\u5f0f\u5b57\u6bb5\uff0c\u5df2\u4fdd\u7559\u539f\u6587\u4f9b\u624b\u52a8\u4fee\u6b63'}\uff0c\u5171\u5199\u5165 ${filledCount} \u9879\u5b57\u6bb5\u3002`);
    if (!filledCount) notify('\u5df2\u63d0\u53d6\u6587\u672c\uff0c\u4f46\u6682\u672a\u5339\u914d\u5230\u7ed3\u6784\u5316\u5b57\u6bb5\uff0c\u53ef\u7ee7\u7eed\u5728\u5b57\u6bb5\u6a21\u677f\u6216\u5b57\u6bb5\u6620\u5c04\u4e2d\u8865\u5145\u3002');

  }
  async function extractTextFromFile(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.txt') || name.endsWith('.md')) return await file.text();
    if (name.endsWith('.docx')) {
      const mammothLib = await ensureMammothLib();
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammothLib.extractRawText({ arrayBuffer });
      return result.value || '';
    }
    if (name.endsWith('.pdf')) return await extractTextFromPdf(file);
    if ((file.type || '').startsWith('image/')) return await extractTextFromImage(file);
    try { return await file.text(); } catch { return ''; }
  }
  async function extractTextFromPdf(file) {
    const pdfLib = await ensurePdfJsLib();
    const pdf = await pdfLib.getDocument({ data: await file.arrayBuffer(), disableWorker: true }).promise;
    let text = '';
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const pageText = mergePdfTextItems(content.items || []);
      text += `${pageText}\n`;
      const signalText = compactResumeText(pageText).replace(/[^\u4e00-\u9fa5A-Za-z0-9@.]/g, '');
      if (signalText.length >= 20) continue;
      try {
        const viewport = page.getViewport({ scale: 1.7 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) text += `${await extractTextFromImage(blob)}\n`;
      } catch (error) {
        log(`PDF \u7b2c ${pageNo} \u9875 OCR \u5931\u8d25: ${error.message}`);
      }
    }
    return text;
  }
  function mergePdfTextItems(items) {
    if (!Array.isArray(items) || !items.length) return '';
    let result = '';
    let prev = null;
    items.forEach((item) => {
      const str = item && item.str ? String(item.str) : '';
      if (!str) return;
      if (!prev) { result += str; prev = item; return; }
      const prevX = prev.transform && typeof prev.transform[4] === 'number' ? prev.transform[4] : 0;
      const prevY = prev.transform && typeof prev.transform[5] === 'number' ? prev.transform[5] : 0;
      const currX = item.transform && typeof item.transform[4] === 'number' ? item.transform[4] : 0;
      const currY = item.transform && typeof item.transform[5] === 'number' ? item.transform[5] : 0;
      const prevWidth = typeof prev.width === 'number' ? prev.width : 0;
      const sameLine = Math.abs(currY - prevY) < 2;
      const gap = currX - (prevX + prevWidth);
      const shouldBreakLine = prev.hasEOL || item.hasEOL || !sameLine;
      const shouldAddSpace = sameLine && gap > 8 && /[A-Za-z0-9@.)\]-]$/.test(result) && /^[A-Za-z0-9@(\[]/.test(str);
      if (shouldBreakLine) result += '\n';
      else if (shouldAddSpace) result += ' ';
      result += str;
      prev = item;
    });
    return result;
  }
  async function extractTextFromImage(fileOrBlob) {
    const tesseractLib = await ensureTesseractLib();
    const result = await tesseractLib.recognize(fileOrBlob, 'chi_sim+eng', {
      logger: (msg) => {
        if (msg.status === 'recognizing text' && typeof msg.progress === 'number') {
          const progress = Math.round(msg.progress * 100);
          if (progress % 25 === 0) log(`OCR \u8fdb\u884c\u4e2d: ${progress}%`);
        }
      }
    });
    return result.data && result.data.text ? result.data.text : '';
  }
  function parseResumeText(text) {
    const cleaned = normalizeText(text);
    const compact = compactResumeText(cleaned);
    const fields = Object.fromEntries(FIELD_DEFS.map(([k]) => [k, '']));
    const hits = [];
    const setField = (key, value) => {
      const nextValue = tidyValue(value);
      if (!nextValue || fields[key]) return false;
      fields[key] = nextValue;
      hits.push(key);
      return true;
    };
    const directMatchers = [
      ['name', /(?:\u59d3\u540d|\u540d\u5b57|name)[:\s]*([^\n|]{2,20})/i],
      ['phone', /(?:\u624b\u673a(?:\u53f7\u7801)?|\u8054\u7cfb\u7535\u8bdd|\u7535\u8bdd|tel|phone)[:\s]*((?:\+?86[-\s]?)?1[3-9]\d{9})/i],
      ['email', /(?:email|mail|\u90ae\u7bb1|\u7535\u5b50\u90ae\u7bb1)[:\s]*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i],
      ['wechat', /(?:\u5fae\u4fe1(?:\u53f7)?|wechat)[:\s]*([A-Za-z0-9_-]{5,30})/i],
      ['gender', /(?:\u6027\u522b|gender)[:\s]*(\u7537|\u5973|male|female)/i],
      ['birthday', /(?:\u51fa\u751f\u65e5\u671f|\u751f\u65e5|\u51fa\u751f\u5e74\u6708)[:\s]*(\d{4}[./-]\d{1,2}(?:[./-]\d{1,2})?)/i],
      ['age', /(?:\u5e74\u9f84|age)[:\s]*(\d{1,2})/i],
      ['city', /(?:\u73b0\u5c45\u57ce\u5e02|\u6240\u5728\u57ce\u5e02|\u5c45\u4f4f\u57ce\u5e02)[:\s]*([^\n|]{2,20})/i],
      ['hometown', /(?:\u7c4d\u8d2f|\u751f\u6e90\u5730|\u6237\u7c4d)[:\s]*([^\n|]{2,20})/i],
      ['politics', /(?:\u653f\u6cbb\u9762\u8c8c)[:\s]*([^\n|]{2,20})/i],
      ['education', /(?:\u6700\u9ad8\u5b66\u5386|\u5b66\u5386)[:\s]*(\u535a\u58eb|\u7855\u58eb|\u672c\u79d1|\u5927\u4e13|\u4e13\u79d1|\u9ad8\u4e2d)/i],
      ['school', /(?:\u6bd5\u4e1a\u9662\u6821|\u5b66\u6821|\u9662\u6821)[:\s]*([^\n|]{2,40}(?:\u5927\u5b66|\u5b66\u9662|University|College))/i],
      ['major', /(?:\u4e13\u4e1a)[:\s]*([^\n|]{2,40})/i],
      ['degree', /(?:\u5b66\u4f4d)[:\s]*([^\n|]{2,20})/i],
      ['graduateDate', /(?:\u6bd5\u4e1a\u65f6\u95f4|\u6bd5\u4e1a\u65e5\u671f)[:\s]*(\d{4}[./-]\d{1,2})/i],
      ['expectedCity', /(?:\u671f\u671b\u57ce\u5e02|\u610f\u5411\u57ce\u5e02)[:\s]*([^\n|]{2,30})/i],
      ['expectedJob', /(?:\u671f\u671b\u5c97\u4f4d|\u610f\u5411\u5c97\u4f4d|\u804c\u4f4d\u65b9\u5411)[:\s]*([^\n|]{2,40})/i],
      ['expectedSalary', /(?:\u671f\u671b\u85aa\u8d44|\u671f\u671b\u6708\u85aa|\u85aa\u8d44\u8981\u6c42)[:\s]*([^\n|]{2,30})/i]
    ];
    directMatchers.forEach(([key, regex]) => {
      const match = cleaned.match(regex) || compact.match(regex);
      if (match) setField(key, match[1]);
    });
    const anywhereMatchers = [
      ['phone', /((?:\+?86[-\s]?)?1[3-9]\d{9})/],
      ['email', /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i],
      ['github', /(https?:\/\/github\.com\/[^\s/]+(?:\/[^\s]+)?)/i],
      ['linkedin', /(https?:\/\/[^\s]*linkedin\.com\/[^\s]+)/i],
      ['portfolio', /(https?:\/\/[^\s]+(?:portfolio|blog|site|me|top|cn|com))/i],
      ['education', /(\u535a\u58eb|\u7855\u58eb|\u672c\u79d1|\u5927\u4e13|\u4e13\u79d1|\u9ad8\u4e2d)/],
      ['school', /([\u4e00-\u9fa5A-Za-z]{2,40}(?:\u5927\u5b66|\u5b66\u9662|University|College))/]
    ];
    anywhereMatchers.forEach(([key, regex]) => {
      const match = compact.match(regex) || cleaned.match(regex);
      if (match) setField(key, match[1]);
    });
    if (!fields.name) {
      const candidate = cleaned.split('\n').map((line) => line.replace(/\s+/g, '').trim()).filter(Boolean).slice(0, 8).find((line) => /^[\u4e00-\u9fa5\u00b7]{2,6}$/.test(line));
      if (candidate) setField('name', candidate);
    }
    if (!fields.graduateDate) {
      const graduateMatch = compact.match(/(20\d{2}[./-]\d{1,2})(?:\u6bd5\u4e1a|graduat)/i);
      if (graduateMatch) setField('graduateDate', graduateMatch[1]);
    }
    [[
      'skills', ['\u4e13\u4e1a\u6280\u80fd', '\u6280\u80fd', '\u6280\u80fd\u6807\u7b7e']
    ], [
      'project', ['\u9879\u76ee\u7ecf\u5386', '\u9879\u76ee\u7ecf\u9a8c']
    ], [
      'internship', ['\u5b9e\u4e60\u7ecf\u5386', '\u5de5\u4f5c\u7ecf\u5386', '\u5b9e\u8df5\u7ecf\u5386']
    ], [
      'educationDetail', ['\u6559\u80b2\u7ecf\u5386']
    ], [
      'selfIntro', ['\u81ea\u6211\u8bc4\u4ef7', '\u4e2a\u4eba\u4f18\u52bf', '\u4e2a\u4eba\u603b\u7ed3', '\u81ea\u6211\u4ecb\u7ecd']
    ], [
      'award', ['\u83b7\u5956\u7ecf\u5386', '\u83b7\u5956\u60c5\u51b5', '\u5956\u52b1']
    ], [
      'certificate', ['\u8bc1\u4e66', '\u8d44\u683c\u8bc1\u4e66']
    ], [
      'campus', ['\u6821\u56ed\u7ecf\u5386', '\u5b66\u751f\u5de5\u4f5c', '\u793e\u56e2\u7ecf\u5386']
    ], [
      'languages', ['\u8bed\u8a00\u80fd\u529b', '\u5916\u8bed']
    ]].forEach(([field, titles]) => {
      if (fields[field]) return;
      const block = findSection(cleaned, titles) || findSection(compact, titles);
      if (block) setField(field, block);
    });
    fields.custom = cleaned.slice(0, 8000);
    return { fields, hits };
  }
  function normalizeText(text) { return String(text).replace(/\r/g, '').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/[\uFF1A\uFE55]/g, ':').trim(); }
  function compactResumeText(text) { return String(text || '').replace(/\r/g, '').replace(/([\u4e00-\u9fa5A-Za-z0-9@._%+-])\s+(?=[\u4e00-\u9fa5A-Za-z0-9@._%+-])/g, '$1').replace(/\s*:\s*/g, ':').replace(/\n{3,}/g, '\n\n').trim(); }
  function findSection(text, titles) { const lines = String(text || '').split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean); for (let i = 0; i < lines.length; i += 1) { const normalizedLine = lines[i].replace(/\s+/g, '').toLowerCase(); const hit = titles.find((item) => normalizedLine.includes(String(item).replace(/\s+/g, '').toLowerCase())); if (!hit) continue; const block = []; for (let j = i + 1; j < lines.length && block.join('\n').length < 1600; j += 1) { const sectionLine = lines[j].replace(/\s+/g, ''); if (SECTION_TITLES.some((title) => sectionLine.includes(String(title).replace(/\s+/g, ''))) && block.length >= 2) break; block.push(lines[j]); } const result = block.join('\n').trim(); if (result) return result; } return ''; }
  function tidyValue(value) { return String(value).replace(/\s+/g, ' ').trim(); }
  function detectQuestionAnswer(meta, profile) {
    const templates = ensureTemplates(profile);
    const questions = (templates.customQuestions || []).slice().sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
    const normalized = String(meta || '').toLowerCase();
    const canned = [
      ['why us', ['why us', 'choose us', 'join us', 'company reason', '为什么选择', '为什么加入']],
      ['strength', ['strength', '优点', '优势']],
      ['weakness', ['weakness', '缺点', '不足']],
      ['career plan', ['career plan', '职业规划', '未来规划', '未来三年']]
    ];
    for (const item of questions) {
      const question = String(item.question || '').toLowerCase().trim();
      const keywords = Array.isArray(item.keywords) ? item.keywords.map((x) => String(x).toLowerCase()) : [];
      const probes = [question].concat(keywords).filter(Boolean);
      if (probes.some((probe) => normalized.includes(probe))) return item.answer || '';
    }
    for (const [title, aliases] of canned) {
      if (!aliases.some((alias) => normalized.includes(alias))) continue;
      const found = questions.find((item) => {
        const q = String(item.question || '').toLowerCase();
        const keys = Array.isArray(item.keywords) ? item.keywords.map((x) => String(x).toLowerCase()) : [];
        return q.includes(title) || aliases.some((alias) => q.includes(alias) || keys.some((k) => k.includes(alias)));
      });
      if (found && found.answer) return found.answer;
    }
    return '';
  }
  function inferExperienceType(meta) {
    const lower = String(meta || '').toLowerCase();
    if (lower.includes('\u9879\u76ee') || lower.includes('project')) return 'projects';
    if (lower.includes('\u5b9e\u4e60') || lower.includes('\u5de5\u4f5c\u7ecf\u5386') || lower.includes('\u5de5\u4f5c\u7ecf\u9a8c') || lower.includes('intern') || lower.includes('company') || lower.includes('\u516c\u53f8')) return 'internships';
    if (lower.includes('\u6559\u80b2') || lower.includes('\u5b66\u6821') || lower.includes('\u4e13\u4e1a') || lower.includes('\u5b66\u5386') || lower.includes('\u5b66\u4f4d') || lower.includes('education')) return 'educations';
    return '';
  }
  function inferExperienceSubField(meta, type) {
    const lower = String(meta || '').toLowerCase();
    const isDateRange = lower.includes('range') || lower.includes('daterange') || lower.includes('date range') || lower.includes('\u8d77\u6b62\u65f6\u95f4') || lower.includes('\u65f6\u95f4\u8303\u56f4') || lower.includes('\u65e5\u671f\u8303\u56f4');
    if (isDateRange) return 'dateRange';
    if (type === 'projects') {
      if (lower.includes('\u540d\u79f0') || lower.includes('\u9879\u76ee\u540d') || lower.includes('project name') || lower.includes('title')) return 'name';
      if (lower.includes('\u89d2\u8272') || lower.includes('\u804c\u8d23') || lower.includes('role') || lower.includes('\u5c97\u4f4d')) return 'role';
      if (lower.includes('\u5f00\u59cb') || lower.includes('start')) return 'start';
      if (lower.includes('\u7ed3\u675f') || lower.includes('end')) return 'end';
      if (lower.includes('\u6280\u672f') || lower.includes('tech') || lower.includes('stack')) return 'stack';
      if (lower.includes('\u4eae\u70b9') || lower.includes('\u6210\u679c') || lower.includes('\u4e1a\u7ee9') || lower.includes('highlight')) return 'highlights';
      return 'description';
    }
    if (type === 'internships') {
      if (lower.includes('\u516c\u53f8') || lower.includes('company')) return 'company';
      if (lower.includes('\u89d2\u8272') || lower.includes('\u5c97\u4f4d') || lower.includes('\u804c\u4f4d') || lower.includes('role')) return 'role';
      if (lower.includes('\u5f00\u59cb') || lower.includes('start')) return 'start';
      if (lower.includes('\u7ed3\u675f') || lower.includes('end')) return 'end';
      if (lower.includes('\u4eae\u70b9') || lower.includes('\u6210\u679c') || lower.includes('\u4e1a\u7ee9') || lower.includes('highlight')) return 'highlights';
      return 'description';
    }
    if (type === 'educations') {
      if (lower.includes('\u5b66\u6821') || lower.includes('\u9662\u6821') || lower.includes('school')) return 'school';
      if (lower.includes('\u4e13\u4e1a') || lower.includes('major')) return 'major';
      if (lower.includes('\u5b66\u5386') || lower.includes('\u5b66\u4f4d') || lower.includes('degree')) return 'degree';
      if (lower.includes('\u5f00\u59cb') || lower.includes('start')) return 'start';
      if (lower.includes('\u7ed3\u675f') || lower.includes('\u6bd5\u4e1a') || lower.includes('end')) return 'end';
      return 'description';
    }
    return '';
  }
  function getTemplateFieldValue(entry, subField) {
    if (!entry) return '';
    if (subField === 'dateRange') return [entry.start, entry.end].filter(Boolean).join(' - ');
    const value = entry[subField];
    if (Array.isArray(value)) return value.map((x) => `- ${x}`).join('\n');
    return value || '';
  }
  function scanPageFields() {
    const siteRule = getCurrentSiteRule();
    const adapter = getSiteAdapter();
    const selectors = ['input:not([type="hidden"]):not([type="file"]):not([type="submit"]):not([type="button"]):not([type="image"])', 'textarea', 'select', '[contenteditable="true"]', '.ant-select', '.ant-picker input', '.el-select .el-input__inner', '.el-date-editor input', '[role="combobox"]'];
    if (adapter.selectors && adapter.selectors.length) selectors.unshift(...adapter.selectors);
    if (siteRule.preferredSelectors) selectors.unshift(...siteRule.preferredSelectors.split('\n').map((item) => item.trim()).filter(Boolean));
    const ignoreList = siteRule.ignoreSelectors ? siteRule.ignoreSelectors.split('\n').map((item) => item.trim()).filter(Boolean) : [];
    const elements = Array.from(new Set(selectors.flatMap((selector) => safeQuery(selector))));
    const result = elements.filter((element) => isVisible(element) && !matchesAny(element, ignoreList)).map((element, index) => { const meta = collectElementMetadata(element); const key = buildElementKey(element, index); return { key, element, tag: element.tagName.toLowerCase(), selector: element.id ? `#${element.id}` : buildShortSelector(element), meta, inferredField: inferFieldKey({ key, meta, element }) }; });
    state.lastScan = result.map((item) => ({ key: item.key, tag: item.tag, selector: item.selector, meta: item.meta, inferredField: item.inferredField })); saveState(); return result;
  }
  function safeQuery(selector) { try { return Array.from(document.querySelectorAll(selector)); } catch { return []; } }
  function matchesAny(element, selectors) { return selectors.some((selector) => { try { return element.matches(selector) || !!element.closest(selector); } catch { return false; } }); }
  function collectElementMetadata(element) {
    const pieces = []; const push = (value) => { if (value) pieces.push(String(value).trim()); };
    push(element.name); push(element.id); push(element.placeholder); push(element.type); push(element.getAttribute && element.getAttribute('aria-label')); push(element.getAttribute && element.getAttribute('title')); push(element.getAttribute && element.getAttribute('data-testid'));
    if (element.labels) Array.from(element.labels).forEach((label) => push(label.innerText));
    const wrapper = element.closest('.ant-form-item,.el-form-item,.ivu-form-item,.n-form-item,.form-item,.form-group,.field,.el-col,.ant-col,.form-row,.form-cell,.resume-form-item');
    if (wrapper) push((wrapper.innerText || '').slice(0, 200));
    if (element.previousElementSibling) push(element.previousElementSibling.innerText || '');
    if (element.parentElement) push((element.parentElement.innerText || '').slice(0, 200));
    return normalizeText(pieces.join(' | ').toLowerCase());
  }
  function buildElementKey(element, index) { return `${location.hostname}|${element.tagName.toLowerCase()}|${element.name || ''}|${element.id || ''}|${element.placeholder || ''}|${index}`; }
  function buildShortSelector(element) { const parts = [element.tagName.toLowerCase()]; if (element.name) parts.push(`[name="${cssEscape(element.name)}"]`); else if (element.placeholder) parts.push(`[placeholder="${cssEscape(element.placeholder)}"]`); return parts.join(''); }
  function autoGenerateMappings(scan) { const siteMappings = getSiteMappings(); scan.forEach((item) => { if (item.inferredField) siteMappings[item.key] = item.inferredField; }); saveState(); log(`已为本站生成 ${Object.keys(siteMappings).length} 条映射。`); }
  function highlightFieldByKey(key, scan) { const target = scan.find((item) => item.key === key); if (!target) return; const element = target.element; const old = element.style.outline; element.scrollIntoView({ behavior: 'smooth', block: 'center' }); element.style.outline = '3px solid #ef4444'; setTimeout(() => { element.style.outline = old; }, 2200); }
  function inferFieldKey(candidate) { const siteMappings = getSiteMappings(); if (siteMappings[candidate.key]) return siteMappings[candidate.key]; const meta = candidate.meta || ''; const adapter = getSiteAdapter(); for (const [key, aliases] of Object.entries(adapter.aliases || {})) { if (aliases.some((alias) => meta.includes(String(alias).toLowerCase()))) return key; } for (const key of Object.keys(FIELD_ALIASES)) { if (FIELD_ALIASES[key].some((alias) => meta.includes(String(alias).toLowerCase()))) return key; } return ''; }
  function describeAutofillTargets(profile, scan) { const mapped = scan.map((item) => inferFieldKey(item)).filter(Boolean); const uniqueMapped = Array.from(new Set(mapped)); const ready = uniqueMapped.filter((key) => profile.fields[key]); return `发现 ${scan.length} 个候选控件，可识别 ${uniqueMapped.length} 类字段，当前简历可直接填充 ${ready.length} 类。`; }
  function autofillActiveProfile(options) {
    const config = Object.assign({ overwrite: false, mappedOnly: false, emptyOnly: false }, options || {});
    if (!getCurrentSiteRule().enabled) { log('本站规则已禁用，跳过自动填写。'); return 0; }
    const profile = getActiveProfile();
    const scan = scanPageFields();
    let filled = 0;
    const expCounters = {};
    scan.forEach((candidate) => {
      if (config.emptyOnly && hasUserValue(candidate.element)) return;
      if (!config.overwrite && hasUserValue(candidate.element)) return;
      const meta = candidate.meta || '';
      const qaAnswer = detectQuestionAnswer(meta, profile);
      if (qaAnswer && applyValueToField(candidate.element, qaAnswer, 'custom')) { filled += 1; return; }
      const expType = inferExperienceType(meta);
      if (expType) {
        const subField = inferExperienceSubField(meta, expType);
        const templates = ensureTemplates(profile)[expType] || [];
        const counterKey = `${expType}:${subField}`;
        const index = expCounters[counterKey] || 0;
        const entry = templates[index];
        const templatedValue = getTemplateFieldValue(entry, subField);
        if (templatedValue && applyValueToField(candidate.element, templatedValue, 'custom')) {
          expCounters[counterKey] = index + 1;
          filled += 1;
          return;
        }
      }
      const fieldKey = inferFieldKey(candidate);
      if (!fieldKey) return;
      if (config.mappedOnly && !getSiteMappings()[candidate.key]) return;
      const value = profile.fields[fieldKey];
      if (!value) return;
      if (applyValueToField(candidate.element, value, fieldKey)) filled += 1;
    });
    log(`自动填写完成，命中 ${filled} 个字段。`);
    notify(filled ? `自动填写完成，命中 ${filled} 个字段。` : '未匹配到可填写字段，请打开映射页补充站点字段映射。');
    return filled;
  }
  function hasUserValue(element) { if (element.matches('select')) return !!element.value; if (element.matches('input,textarea')) return !!String(element.value || '').trim(); if (element.matches('[contenteditable="true"]')) return !!String(element.textContent || '').trim(); return false; }
  function applyValueToField(element, rawValue, fieldKey) {
    const value = normalizeFieldValue(rawValue, fieldKey); if (!value) return false;
    if (element.matches('select')) return fillNativeSelect(element, value, fieldKey);
    if (isCustomSelect(element)) return fillCustomSelect(element, value, fieldKey);
    if (element.matches('[contenteditable="true"]')) { element.focus(); element.textContent = value; dispatchInputEvents(element); return true; }
    if (element.matches('textarea,input')) { const type = (element.getAttribute('type') || '').toLowerCase(); if (type === 'radio' || type === 'checkbox') return fillChoiceInput(element, value, fieldKey); trySetNativeValue(element, value); dispatchInputEvents(element); return true; }
    return false;
  }
  function normalizeFieldValue(value, fieldKey) { let result = String(value).trim(); if (fieldKey === 'skills') result = result.replace(/\n+/g, ' / '); if (fieldKey === 'phone') { const matched = result.match(/(?:\+?86[-\s]?)?(1[3-9]\d{9})/); if (matched) result = matched[1]; } return result; }
  function isCustomSelect(element) { return element.classList.contains('ant-select') || element.classList.contains('el-select') || element.getAttribute('role') === 'combobox' || !!element.closest('.ant-select,.el-select,[role="combobox"]'); }
  function fillNativeSelect(select, value, fieldKey) {
    const normalized = value.toLowerCase();
    const option = Array.from(select.options).find((item) => { const text = `${item.text} ${item.value}`.toLowerCase(); return text.includes(normalized) || normalized.includes(text); }) || findByDictionary(select.options, value, fieldKey);
    if (!option) return false; select.value = option.value; dispatchInputEvents(select); return true;
  }
  function fillCustomSelect(element, value, fieldKey) {
    const root = element.closest('.ant-select,.el-select,[role="combobox"]') || element; const clickable = root.matches('[role="combobox"]') ? root : root.querySelector('input,.ant-select-selector,.el-input__inner,[role="combobox"]');
    if (!clickable) return false; clickable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); if (typeof clickable.click === 'function') clickable.click();
    const options = Array.from(document.querySelectorAll('.ant-select-item-option,.el-select-dropdown__item,[role="option"],.select-option,li[role="option"]')); const matched = options.find((option) => compareOptionText(option.innerText, value, fieldKey));
    if (matched) { matched.click(); return true; }
    if (clickable.matches && clickable.matches('input')) { trySetNativeValue(clickable, value); dispatchInputEvents(clickable); clickable.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return true; }
    return false;
  }
  function fillChoiceInput(input, value, fieldKey) { const root = input.closest('label,.ant-radio-wrapper,.ant-checkbox-wrapper,.el-radio,.el-checkbox') || input.parentElement; const text = `${root && root.innerText ? root.innerText : ''} ${input.value || ''}`; if (!compareOptionText(text, value, fieldKey)) return false; input.click(); return true; }
  function compareOptionText(text, value, fieldKey) {
    const lower = String(text || '').trim().toLowerCase(); const target = String(value || '').trim().toLowerCase(); if (!lower || !target) return false; if (lower.includes(target) || target.includes(lower)) return true;
    const dictionary = OPTION_DICTIONARY[fieldKey]; if (!dictionary) return false;
    return Object.keys(dictionary).some((standard) => { const aliases = dictionary[standard]; const matched = standard.toLowerCase() === target || aliases.some((alias) => String(alias).toLowerCase() === target); return matched && [standard].concat(aliases).some((alias) => lower.includes(String(alias).toLowerCase())); });
  }
  function findByDictionary(optionsLike, value, fieldKey) {
    const dictionary = OPTION_DICTIONARY[fieldKey]; if (!dictionary) return null; const target = String(value).toLowerCase();
    for (const standard of Object.keys(dictionary)) { const aliases = dictionary[standard]; const matched = standard.toLowerCase() === target || aliases.some((alias) => String(alias).toLowerCase() === target); if (!matched) continue; const option = Array.from(optionsLike).find((item) => { const text = `${item.text || item.innerText || ''} ${item.value || ''}`.toLowerCase(); return [standard].concat(aliases).some((alias) => text.includes(String(alias).toLowerCase())); }); if (option) return option; }
    return null;
  }
  function trySetNativeValue(element, value) { const proto = Object.getPrototypeOf(element); const descriptor = proto && Object.getOwnPropertyDescriptor(proto, 'value'); if (descriptor && descriptor.set) descriptor.set.call(element, value); else element.value = value; }
  function dispatchInputEvents(element) { element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); element.dispatchEvent(new Event('blur', { bubbles: true })); }
  function isVisible(element) { const style = window.getComputedStyle(element); return style.display !== 'none' && style.visibility !== 'hidden' && (element.offsetParent !== null || style.position === 'fixed'); }
  function exportProfile(profile) { downloadFile(`${profile.name || 'resume-profile'}.json`, JSON.stringify(profile, null, 2), 'application/json'); log(`已导出档案: ${profile.name}`); }
  function exportStateToFile() { downloadFile('resume-autofill-universal-data.json', JSON.stringify(state, null, 2), 'application/json'); log('已导出全部数据。'); }
  function downloadFile(name, content, type) { const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function maybeAutoFillOnOpen() { const rule = getCurrentSiteRule(); const pageKey = `${location.href}|${document.title}`; if (!rule.autoFillOnOpen || autoFilledPageKey === pageKey) return; autoFilledPageKey = pageKey; setTimeout(() => safeCall('自动打开后填充', () => autofillActiveProfile({ overwrite: false })), 1200); }
  function observeDomChanges() { let timer = null; const observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(() => { const panel = document.querySelector('#rau-panel'); if (panel) return; maybeAutoFillOnOpen(); }, 600); }); observer.observe(document.documentElement, { childList: true, subtree: true }); maybeAutoFillOnOpen(); }
  function createId() { return `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
  function cssEscape(value) { return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
  function escapeHtml(value) { return String(value == null ? '' : value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
})();




