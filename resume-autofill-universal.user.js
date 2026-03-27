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
  const SECTION_TITLES = ['\u6559\u80b2\u80cc\u666f', '\u6559\u80b2\u7ecf\u5386', '\u9879\u76ee\u7ecf\u5386', '\u9879\u76ee\u7ecf\u9a8c', '\u5b9e\u4e60\u7ecf\u5386', '\u5de5\u4f5c\u7ecf\u5386', '\u5b9e\u8df5\u7ecf\u5386', '\u4e13\u4e1a\u6280\u80fd', '\u6280\u80fd', '\u8363\u8a89&\u6280\u80fd', '\u6280\u80fd&\u8bc1\u4e66&\u5176\u4ed6\u8363\u8a89', '\u81ea\u6211\u8bc4\u4ef7', '\u4e2a\u4eba\u4f18\u52bf', '\u83b7\u5956\u60c5\u51b5', '\u6821\u56ed\u7ecf\u5386', '\u8bc1\u4e66', '\u8bed\u8a00\u80fd\u529b'];
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
        phone: ['\u624b\u673a\u53f7\u7801', '\u624b\u673a\u53f7', 'mobile', 'phone'],
        email: ['\u90ae\u7bb1', 'email'],
        city: ['\u6240\u5728\u5730\u70b9', 'living_city', 'current_city'],
        hometown: ['\u5bb6\u4e61', '\u7c4d\u8d2f', 'native_place', 'hometown'],
        expectedCity: ['\u610f\u5411\u57ce\u5e02', '\u671f\u671b\u5de5\u4f5c\u5730\u70b9', 'application_preferred_city', 'application_preferred_city_list', 'preferred_city'],
        expectedJob: ['\u671f\u671b\u5c97\u4f4d', '\u6c42\u804c\u5c97\u4f4d', 'expected_job', 'job_intention'],
        educationDetail: ['\u6559\u80b2\u7ecf\u5386'],
        internship: ['\u5b9e\u4e60\u7ecf\u5386'],
        project: ['\u9879\u76ee\u7ecf\u5386'],
        school: ['\u5b66\u6821\u540d\u79f0', 'school_name', 'school'],
        education: ['\u5b66\u5386', 'education'],
        degree: ['\u5b66\u5386\u7c7b\u578b', '\u5b66\u4f4d', 'degree', 'education_type'],
        major: ['\u4e13\u4e1a', 'major'],
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
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        return result.catch((error) => {
          console.error('[Resume Autofill Universal]', action, error);
          showFallbackPanel(error, action);
          return null;
        });
      }
      return result;
    } catch (error) {
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
    return `<div class="rau-section"><div class="rau-row"><button class="rau-btn rau-btn-primary rau-grow" id="rau-fill">\u81ea\u52a8\u586b\u5199\u5f53\u524d\u9875\u9762</button><button class="rau-btn rau-btn-secondary" id="rau-scan">\u91cd\u65b0\u626b\u63cf</button><button class="rau-btn rau-btn-secondary" id="rau-fill-mapped">\u4ec5\u586b\u5df2\u6620\u5c04</button></div><div class="rau-row"><button class="rau-btn rau-btn-secondary rau-grow" id="rau-fill-empty">\u53ea\u586b\u7a7a\u767d\u5b57\u6bb5</button><button class="rau-btn rau-btn-secondary rau-grow" id="rau-fill-all">\u8986\u76d6\u5f53\u524d\u53ef\u8bc6\u522b\u5b57\u6bb5</button></div><div class="rau-meta">${escapeHtml(describeAutofillTargets(profile, scan))}</div></div><div class="rau-section"><div class="rau-list">${scan.slice(0, 80).map((item, index) => `<div class="rau-card"><div class="rau-kv"><strong>#${index + 1} ${escapeHtml(item.tag)}</strong><span class="rau-small">${escapeHtml(item.controlType || item.tag)}</span></div><div class="rau-small">\u5b57\u6bb5\u6807\u7b7e: ${escapeHtml((item.label || '').slice(0, 120) || '\u65e0')}</div><div class="rau-small">\u6240\u5728\u533a\u5757: ${escapeHtml((item.section || '').slice(0, 80) || '\u65e0')}</div><div class="rau-small">\u5019\u9009\u9009\u9879: ${escapeHtml((item.optionsText || '').slice(0, 120) || '\u65e0')}</div><div class="rau-small">\u6807\u7b7e\u4fe1\u606f: ${escapeHtml((item.meta || '').slice(0, 160) || '\u65e0')}</div><div class="rau-small">\u5f53\u524d\u8bc6\u522b: <span class="rau-inline-code">${escapeHtml(item.inferredField || '\u672a\u8bc6\u522b')}</span>${item.inferredScore ? ` <span class="rau-small">(${item.inferredScore})</span>` : ''}</div></div>`).join('')}</div></div>`;
  }
  function renderMappingTab(scan) {
    const siteMappings = getSiteMappings();
    return `<div class="rau-section"><div class="rau-row"><button class="rau-btn rau-btn-secondary rau-grow" id="rau-auto-map">\u6309\u8bc6\u522b\u7ed3\u679c\u751f\u6210\u6620\u5c04</button><button class="rau-btn rau-btn-secondary" id="rau-clear-mapping">\u6e05\u7a7a\u672c\u7ad9\u6620\u5c04</button></div><div class="rau-meta">\u5b57\u6bb5\u6620\u5c04\u7528\u4e8e\u89e3\u51b3\u7ad9\u70b9\u6807\u7b7e\u5199\u6cd5\u7279\u6b8a\u3001\u81ea\u52a8\u8bc6\u522b\u4e0d\u51c6\u7684\u60c5\u51b5\u3002\u4fdd\u5b58\u540e\u8be5\u7ad9\u70b9\u4f1a\u4f18\u5148\u6309\u6620\u5c04\u586b\u5199\u3002</div></div><div class="rau-section"><div class="rau-table">${scan.slice(0, 80).map((item, index) => `<div class="rau-card rau-map-row"><div><div><strong>#${index + 1} ${escapeHtml(item.tag)}</strong></div><div class="rau-small">${escapeHtml((item.label || item.meta || '').slice(0, 120) || item.selector)}</div><div class="rau-small">${escapeHtml((item.section || item.controlType || '').slice(0, 80))}${item.inferredScore ? ` \u00b7 \u5206\u6570 ${item.inferredScore}` : ''}</div></div><select class="rau-select" data-map-target="${escapeHtml(item.key)}"><option value="">\u4e0d\u6620\u5c04</option>${FIELD_DEFS.map(([key, label]) => `<option value="${key}"${siteMappings[item.key] === key ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select><button class="rau-btn rau-btn-secondary" data-highlight="${escapeHtml(item.key)}">\u9ad8\u4eae\u5b57\u6bb5</button></div>`).join('')}</div></div>`;
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
      const runAutofill = (action, options) => safeCall(action, async () => { const filled = await autofillActiveProfile(options); renderPanel(panel); return filled; });
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
    const normalizedItems = items
      .map((item) => {
        const str = item && item.str ? String(item.str).trim() : '';
        const transform = item && Array.isArray(item.transform) ? item.transform : [];
        return {
          str,
          x: typeof transform[4] === 'number' ? transform[4] : 0,
          y: typeof transform[5] === 'number' ? transform[5] : 0,
          width: typeof item.width === 'number' ? item.width : 0,
          height: typeof item.height === 'number' ? item.height : 0,
          hasEOL: Boolean(item && item.hasEOL)
        };
      })
      .filter((item) => item.str)
      .sort((a, b) => {
        if (Math.abs(a.y - b.y) > 2.5) return b.y - a.y;
        return a.x - b.x;
      });
    if (!normalizedItems.length) return '';

    const rows = [];
    normalizedItems.forEach((item) => {
      const lastRow = rows[rows.length - 1];
      const tolerance = Math.max(2.5, item.height * 0.35 || 3);
      if (!lastRow || Math.abs(lastRow.y - item.y) > tolerance) rows.push({ y: item.y, items: [item] });
      else lastRow.items.push(item);
    });

    return rows.map((row) => {
      const orderedItems = row.items.slice().sort((a, b) => a.x - b.x);
      let line = '';
      let previous = null;
      orderedItems.forEach((item) => {
        if (!previous) {
          line = item.str;
          previous = item;
          return;
        }
        const previousEnd = previous.x + previous.width;
        const gap = item.x - previousEnd;
        const spaceThreshold = Math.max(6, Math.min(16, previous.height * 0.8 || 8));
        const shouldAddSpace = gap > spaceThreshold && /[\u4e00-\u9fa5A-Za-z0-9@.)\]-]$/.test(line) && /^[\u4e00-\u9fa5A-Za-z0-9@([]/.test(item.str);
        if (previous.hasEOL) line += '\n';
        else if (shouldAddSpace) line += ' ';
        line += item.str;
        previous = item;
      });
      return line.split('\n').map((part) => part.trim()).filter(Boolean).join('\n');
    }).filter(Boolean).join('\n');
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
    const lines = getResumeLines(cleaned);
    const fields = Object.fromEntries(FIELD_DEFS.map(([key]) => [key, '']));
    const templates = createStructuredTemplates();
    const hits = [];
    const setField = (key, value, options = {}) => {
      const overwrite = Boolean(options.overwrite);
      const append = Boolean(options.append);
      const nextValue = tidyValue(value, key);
      if (!nextValue) return false;
      if (append && LONG_FIELDS.has(key) && fields[key]) {
        if (fields[key].includes(nextValue)) return false;
        fields[key] = tidyValue(`${fields[key]}\n${nextValue}`, key);
        if (!hits.includes(key)) hits.push(key);
        return true;
      }
      if (!overwrite && fields[key]) return false;
      if (fields[key] === nextValue) return false;
      fields[key] = nextValue;
      if (!hits.includes(key)) hits.push(key);
      return true;
    };

    const headerText = lines.slice(0, 40).join('\n');
    const searchText = [headerText, cleaned, compact].filter(Boolean).join('\n');
    [
      ['email', /(?:\u90ae\u7bb1|\u7535\u5b50\u90ae\u7bb1|email|mail)[:\uFF1A\s]*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i],
      ['wechat', /(?:\u5fae\u4fe1(?:\u53f7)?|wechat)[:\uFF1A\s]*([A-Za-z0-9_-]{5,30})/i],
      ['gender', /(?:\u6027\u522b|gender)[:\uFF1A\s]*(\u7537|\u5973|male|female)/i],
      ['birthday', /(?:\u51fa\u751f\u65e5\u671f|\u751f\u65e5|\u51fa\u751f\u5e74\u6708)[:\uFF1A\s]*(\d{4}[./-]\d{1,2}(?:[./-]\d{1,2})?)/i],
      ['age', /(?:\u5e74\u9f84|age)[:\uFF1A\s]*(\d{1,2})/i],
      ['city', /(?:\u73b0\u5c45\u57ce\u5e02|\u6240\u5728\u57ce\u5e02|\u5c45\u4f4f\u57ce\u5e02|\u6240\u5728\u5730\u70b9)[:\uFF1A\s]*([^\n]{2,30})/i],
      ['hometown', /(?:\u7c4d\u8d2f|\u5bb6\u4e61|\u751f\u6e90\u5730|\u6237\u7c4d)[:\uFF1A\s]*([^\n]{2,30})/i],
      ['politics', /(?:\u653f\u6cbb\u9762\u8c8c)[:\uFF1A\s]*([^\n]{2,20})/i],
      ['graduateDate', /(?:\u6bd5\u4e1a\u65f6\u95f4|\u6bd5\u4e1a\u65e5\u671f|\u9884\u8ba1\u6bd5\u4e1a\u65f6\u95f4|\u9884\u8ba1\u6bd5\u4e1a)[:\uFF1A\s]*(\d{4}[./-]\d{1,2})/i],
      ['expectedSalary', /(?:\u671f\u671b\u85aa\u8d44|\u671f\u671b\u6708\u85aa|\u85aa\u8d44\u8981\u6c42)[:\uFF1A\s]*([^\n]{2,30})/i],
      ['github', /(https?:\/\/github\.com\/[^\s]+)/i],
      ['linkedin', /(https?:\/\/[^\s]*linkedin\.com\/[^\s]+)/i],
      ['portfolio', /(https?:\/\/[^\s]+(?:portfolio|blog|site|me|top|cn|com)[^\s]*)/i]
    ].forEach(([key, regex]) => {
      const match = searchText.match(regex);
      if (match) setField(key, match[1]);
    });

    const nameMatch = searchText.match(/(?:\u59d3\u540d|\u540d\u5b57|name)[:\uFF1A\s]*([^\n|]{2,20})/i);
    if (nameMatch) setField('name', nameMatch[1]);
    if (!fields.name) {
      const nameLine = lines.slice(0, 25).find((line) => isLikelyNameLine(line));
      if (nameLine) setField('name', nameLine);
    }

    const phoneLine = lines.find((line) => /(\u7535\u8bdd|\u624b\u673a\u53f7\u7801?|\u8054\u7cfb\u7535\u8bdd|\u8054\u7cfb\u65b9\u5f0f|mobile|phone|tel)/i.test(line));
    const phoneMatches = (phoneLine || compact).match(/1[3-9]\d{9}/g) || [];
    if (phoneMatches.length) setField('phone', phoneMatches[phoneMatches.length - 1]);
    if (!fields.wechat && phoneLine && /\u5fae\u4fe1/.test(phoneLine) && phoneMatches.length > 1) setField('wechat', phoneMatches[0]);

    const expectedJobLine = lines.find((line) => /^(?:\u6c42\u804c\u5c97\u4f4d|\u671f\u671b\u5c97\u4f4d|\u610f\u5411\u5c97\u4f4d|\u804c\u4f4d\u65b9\u5411)[:\uFF1A]/.test(line));
    if (expectedJobLine) setField('expectedJob', stripLabelPrefix(expectedJobLine));
    const cityLine = lines.find((line, index) => index < 16 && isLikelyCityLine(line));
    if (cityLine) setField('expectedCity', cityLine.replace(/\s+/g, ''));
    const statusLine = lines.find((line) => /(\u968f\u65f6\u5230\u5c97|\u7acb\u5373\u5230\u5c97|\u5c3d\u5feb\u5230\u5c97|\u4e00\u5468\u5185\u5230\u5c97|\u4e00\u4e2a\u6708\u5185\u5230\u5c97|\u6c42\u804c\u4e2d|\u5df2\u79bb\u804c|\u5728\u804c)/.test(line));
    if (statusLine) setField('jobStatus', statusLine);

    if (!fields.hometown) {
      const locationLine = lines.slice(0, 18).find((line) => {
        const normalizedLine = line.replace(/\s+/g, '');
        return /^(?:\u4e2d\u56fd)?[\u4e00-\u9fa5]{2,10}$/.test(normalizedLine)
          && !/(\u51fa\u751f\u5e74\u6708|\u51fa\u751f\u65e5\u671f|\u6027\u522b|\u6c11\u65cf|\u653f\u6cbb\u9762\u8c8c|\u7535\u8bdd|\u624b\u673a|\u90ae\u7bb1|\u5fae\u4fe1|\u5e74\u9f84|\u6c42\u804c\u5c97\u4f4d|\u6559\u80b2\u80cc\u666f|\u6559\u80b2\u7ecf\u5386|\u4e2d\u5171\u515a\u5458|\u6c49\u65cf|\u6ee1\u65cf|\u56de\u65cf|\u58ee\u65cf|\u8499\u53e4\u65cf|\u85cf\u65cf|\u7ef4\u543e\u5c14\u65cf|\u82d7\u65cf|\u5f5d\u65cf|\u4f97\u65cf|\u671d\u9c9c\u65cf|\u5e03\u4f9d\u65cf|\u65cf$)/.test(normalizedLine)
          && !isLikelyNameLine(normalizedLine);
      });
      if (locationLine) setField('hometown', locationLine);
    }

    const sections = extractResumeSections(lines);
    if (sections.educationDetail) {
      setField('educationDetail', sections.educationDetail);
      parseEducationSection(sections.educationDetail, setField);
    }
    if (sections.internship) setField('internship', sections.internship);
    if (sections.project) setField('project', sections.project);
    if (sections.selfIntro) setField('selfIntro', sections.selfIntro);
    if (sections.campus) setField('campus', sections.campus);
    if (sections.languages) setField('languages', sections.languages, { append: true });
    if (sections.award) setField('award', sections.award, { append: true });
    if (sections.certificate) setField('certificate', sections.certificate, { append: true });
    if (sections.skills) splitCompositeSkillsSection(sections.skills, setField);

    if (!fields.school) {
      const schoolMatch = cleaned.match(/([\u4e00-\u9fa5A-Za-z]{2,40}(?:\u5927\u5b66|\u5b66\u9662|University|College))/);
      if (schoolMatch) setField('school', schoolMatch[1]);
    }
    if (!fields.education || !fields.degree) {
      const degreeMatch = cleaned.match(/(\u535a\u58eb|\u7855\u58eb|\u672c\u79d1|\u4e13\u79d1|\u5927\u4e13|\u5b66\u58eb|\u7814\u7a76\u751f)/);
      if (degreeMatch) {
        const degreeValue = normalizeEducationValue(degreeMatch[1]);
        setField('degree', degreeValue);
        setField('education', degreeValue);
      }
    }
    if (!fields.major) {
      const schoolIndex = lines.findIndex((line) => fields.school && line.includes(fields.school));
      const majorCandidate = schoolIndex >= 0 ? lines[schoolIndex + 1] : '';
      if (majorCandidate) {
        const majorWindow = schoolIndex >= 0 ? lines.slice(schoolIndex + 1, schoolIndex + 4).join('') : majorCandidate;
        const stripped = majorWindow.replace(/[\uFF08(]?(\u535a\u58eb|\u7855\u58eb|\u672c\u79d1|\u4e13\u79d1|\u5927\u4e13|\u5b66\u58eb|\u7814\u7a76\u751f)[\uFF09)]?/g, '').trim();
        if (stripped && !/(\u4e3b\u4fee\u8bfe\u7a0b|\u4e13\u4e1a\u6210\u7ee9|\u5728\u6821\u8363\u8a89)/.test(stripped)) setField('major', stripped);
      }
    }
    if (!fields.age && fields.birthday) {
      const inferredAge = inferAgeFromBirthday(fields.birthday);
      if (inferredAge) setField('age', String(inferredAge));
    }

    fields.custom = cleaned.slice(0, 8000);
    return { fields, hits };
  }
  function createStructuredTemplates() {
    return { educations: [], projects: [], internships: [], awards: [], certificates: [], customQuestions: [] };
  }
  function populateStructuredTemplates(sections, templates) {
    templates.educations = parseEducationEntries(sections.educationDetail || '');
    templates.internships = parseExperienceEntries(sections.internship || '', 'internship');
    templates.projects = parseExperienceEntries(sections.project || '', 'project');
    templates.awards = parseSimpleNamedEntries(sections.award || '', 'award');
    templates.certificates = parseSimpleNamedEntries((sections.certificate || '') || (sections.languages || ''), 'certificate');
  }
  function formatEducationTemplates(items) {
    return items.map((item) => `${item.start || ''}${item.end ? ` ~ ${item.end}` : ''} ${item.school || ''} ${item.degree || ''} ${item.major || ''}`.trim() + `${item.description ? `\n${item.description}` : ''}`).filter(Boolean).join('\n\n');
  }
  function formatInternshipTemplates(items) {
    return items.map((item) => `${item.start || ''}${item.end ? ` ~ ${item.end}` : ''} ${item.company || ''} ${item.role || ''}`.trim() + `${item.description ? `\n${item.description}` : ''}${item.highlights && item.highlights.length ? `\n${item.highlights.map((x) => `- ${x}`).join('\n')}` : ''}`).filter(Boolean).join('\n\n');
  }
  function formatProjectTemplates(items) {
    return items.map((item) => `${item.start || ''}${item.end ? ` ~ ${item.end}` : ''} ${item.name || ''} ${item.role || ''}`.trim() + `${item.description ? `\n${item.description}` : ''}${item.highlights && item.highlights.length ? `\n${item.highlights.map((x) => `- ${x}`).join('\n')}` : ''}${item.stack ? `\n\u6280\u672f\u6808: ${item.stack}` : ''}`).filter(Boolean).join('\n\n');
  }
  function applyEducationTemplateFields(item, setField) {
    if (!item) return;
    if (item.school) setField('school', item.school, { overwrite: true });
    if (item.major) setField('major', item.major, { overwrite: true });
    if (item.degree) {
      setField('degree', item.degree, { overwrite: true });
      setField('education', item.degree, { overwrite: true });
    }
    if (item.end) setField('graduateDate', item.end, { overwrite: true });
  }
  function buildCustomSupplement(sections, fields) {
    const parts = [];
    if (sections.campus && sections.campus !== fields.campus) parts.push(`\u6821\u56ed\u7ecf\u5386\n${sections.campus}`);
    if (sections.selfIntro && !fields.selfIntro) parts.push(`\u81ea\u6211\u8bc4\u4ef7\n${sections.selfIntro}`);
    return parts.join('\n\n').trim();
  }
  function parseEducationEntries(sectionText) {
    return splitSectionBlocks(sectionText, 'education').map((block) => {
      const lines = getResumeLines(block);
      const joined = lines.join(' ');
      const range = extractDateRangeParts(joined);
      const school = (lines.find((line) => /(\u5927\u5b66|\u5b66\u9662|University|College)/i.test(line) && !/(\u516c\u53f8|\u96c6\u56e2|\u5b9e\u4e60|\u9879\u76ee)/.test(line)) || '').trim();
      const degreeToken = ((joined.match(/(\u535a\u58eb|\u7855\u58eb|\u672c\u79d1|\u4e13\u79d1|\u5927\u4e13|\u5b66\u58eb|\u7814\u7a76\u751f)/) || [])[1] || '').trim();
      const major = extractEducationMajor(lines, school, degreeToken);
      const description = lines.filter((line) => {
        const compactLine = line.replace(/\s+/g, '');
        if (!compactLine) return false;
        if (school && compactLine === school.replace(/\s+/g, '')) return false;
        if (range.raw && compactLine.includes(range.raw.replace(/\s+/g, ''))) return false;
        return !((degreeToken && compactLine === degreeToken) || (major && compactLine === major.replace(/\s+/g, '')));
      }).join('\n').trim();
      const degree = normalizeEducationValue(degreeToken || '');
      return { school, major, degree, start: range.start, end: range.end, description };
    }).filter((item) => item.school || item.major || item.degree || item.description);
  }
  function parseExperienceEntries(sectionText, type) {
    return splitSectionBlocks(sectionText, type).map((block) => {
      const lines = getResumeLines(block);
      const joined = lines.join(' ');
      const range = extractDateRangeParts(joined);
      const descriptionLines = [];
      let company = '';
      let role = '';
      let name = '';
      let stack = '';
      const highlightLines = [];
      lines.forEach((line, index) => {
        const normalized = line.replace(range.pattern || /^$/, '').trim();
        if (!normalized) return;
        if (/^(?:\u6280\u672f\u6808|Tech Stack)[:\uFF1A]?/i.test(normalized)) { stack = stripLabelPrefix(normalized); return; }
        if (/^(?:\u6210\u679c|\u4eae\u70b9|\u4e1a\u7ee9)[:\uFF1A]?/.test(normalized)) { highlightLines.push(stripLabelPrefix(normalized)); return; }
        if (/^(?:\u804c\u8d23|\u8d1f\u8d23|\u9879\u76ee\u7b80\u4ecb|\u5de5\u4f5c\u5185\u5bb9|\u5b9e\u4e60\u5185\u5bb9)[:\uFF1A]?/.test(normalized)) { descriptionLines.push(stripLabelPrefix(normalized)); return; }
        if (index === 0) {
          if (type === 'internship') {
            company = extractCompanyName(normalized);
            role = extractRoleName(normalized, company);
          } else {
            name = extractProjectName(normalized);
            role = extractRoleName(normalized, name);
          }
          if ((!company && type === 'internship') || (!name && type === 'project')) descriptionLines.push(normalized);
          return;
        }
        if (type === 'internship' && !company && /(\u516c\u53f8|\u96c6\u56e2|\u6709\u9650\u516c\u53f8|\u79d1\u6280|\u4fe1\u606f|\u8f6f\u4ef6|\u7814\u7a76\u9662|\u94f6\u884c)/.test(normalized)) {
          company = extractCompanyName(normalized) || normalized;
          if (!role) role = extractRoleName(normalized, company);
          return;
        }
        if (!role && /(\u5b9e\u4e60\u751f|\u5de5\u7a0b\u5e08|\u5f00\u53d1|\u4ea7\u54c1|\u6d4b\u8bd5|\u7b97\u6cd5|\u8fd0\u8425|\u5c97)/.test(normalized) && normalized.length <= 40) { role = normalized; return; }
        descriptionLines.push(normalized);
      });
      const description = descriptionLines.join('\n').trim();
      if (type === 'internship') return { company, role, start: range.start, end: range.end, description, highlights: uniqueTextParts(highlightLines) };
      return { name, role, start: range.start, end: range.end, stack, description, highlights: uniqueTextParts(highlightLines) };
    }).filter((item) => (type === 'internship' ? (item.company || item.role || item.description) : (item.name || item.role || item.description || item.stack)));
  }
  function parseSimpleNamedEntries(sectionText) {
    return getResumeLines(sectionText).map((line) => line.replace(/^[\s\u00B7\u2022\u25AA*\-]+/, '').trim()).filter(Boolean).map((line) => {
      const range = extractDateRangeParts(line);
      const dateMatch = line.match(/20\d{2}[./-]\d{1,2}/);
      return { name: line.replace(range.pattern || /^$/, '').replace(dateMatch ? dateMatch[0] : '', '').trim(), date: normalizeDateToken(dateMatch ? dateMatch[0] : ''), description: line };
    }).filter((item) => item.name);
  }
  function splitSectionBlocks(sectionText, type) {
    const lines = getResumeLines(sectionText);
    if (!lines.length) return [];
    const anchors = [];
    lines.forEach((line, index) => {
      if (/(20\d{2}[./-]\d{1,2})\s*(?:~|\uFF5E|\-|\u81f3)\s*(?:20\d{2}[./-]\d{1,2}|\u81f3\u4eca|\u73b0\u5728)/.test(line)) anchors.push(index);
      else if (type === 'education' && /(\u5927\u5b66|\u5b66\u9662|University|College)/i.test(line) && (index === 0 || /(20\d{2}[./-]\d{1,2})/.test(lines[index - 1]))) anchors.push(index);
    });
    if (!anchors.length) return [lines.join('\n')];
    const filtered = anchors.filter((index, pos) => pos === 0 || index - anchors[pos - 1] > 1);
    return filtered.map((start, pos) => lines.slice(start, filtered[pos + 1] || lines.length).join('\n')).filter(Boolean);
  }
  function extractDateRangeParts(text) {
    const match = String(text || '').match(/(20\d{2}[./-]\d{1,2})\s*(?:~|\uFF5E|\-|\u81f3)\s*(\u81f3\u4eca|\u73b0\u5728|20\d{2}[./-]\d{1,2})/);
    return { start: normalizeDateToken(match ? match[1] : ''), end: normalizeDateToken(match ? match[2] : ''), raw: match ? match[0] : '', pattern: match ? new RegExp(escapeRegExp(match[0])) : null };
  }
  function normalizeDateToken(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    if (/^(?:\u81f3\u4eca|\u73b0\u5728)$/.test(text)) return '\u81f3\u4eca';
    return text.replace(/[./]/g, '-');
  }
  function extractEducationMajor(lines, school, degreeToken) {
    const directLine = lines.find((line) => /^\u4e13\u4e1a[:\uFF1A]?/.test(line));
    if (directLine) return stripLabelPrefix(directLine);
    let source = lines.join(' ');
    if (school) source = source.replace(school, ' ');
    if (degreeToken) source = source.replace(new RegExp(degreeToken, 'g'), ' ');
    source = source.replace(/(20\d{2}[./-]\d{1,2})\s*(?:~|\uFF5E|\-|\u81f3)\s*(?:20\d{2}[./-]\d{1,2}|\u81f3\u4eca|\u73b0\u5728)/g, ' ');
    const match = source.match(/([\u4e00-\u9fa5A-Za-z]{2,24}(?:\u5b66|\u5de5\u7a0b|\u6280\u672f|\u79d1\u5b66|\u7ba1\u7406|GIS|AI|Web|\u524d\u7aef))/);
    return match ? match[1].trim() : '';
  }
  function extractCompanyName(text) {
    const match = String(text || '').trim().match(/([\u4e00-\u9fa5A-Za-z0-9()\uFF08\uFF09]{2,60}?(?:\u96c6\u56e2|\u516c\u53f8|\u6709\u9650\u516c\u53f8|\u79d1\u6280|\u4fe1\u606f|\u8f6f\u4ef6|\u7814\u7a76\u9662|\u5de5\u4f5c\u5ba4|\u94f6\u884c))/);
    return match ? match[1].trim() : '';
  }
  function extractProjectName(text) {
    const stripped = String(text || '').trim().replace(/^[\-\s]+/, '');
    return stripped.split(/\s{2,}|\s+(?=\u8d1f\u8d23|\u804c\u8d23|\u89d2\u8272|\u5c97\u4f4d)/)[0].trim();
  }
  function extractRoleName(text, prefix) {
    let line = String(text || '').trim();
    if (prefix) line = line.replace(prefix, '').trim();
    const labeled = line.match(/(?:\u89d2\u8272|\u5c97\u4f4d|\u804c\u4f4d|role)[:\uFF1A]?\s*([^\n]{2,30})/i);
    if (labeled) return labeled[1].trim();
    const short = line.split(/[\u3002\uFF0C,]/)[0].trim();
    return /(\u5b9e\u4e60\u751f|\u5de5\u7a0b\u5e08|\u5f00\u53d1|\u4ea7\u54c1|\u6d4b\u8bd5|\u7b97\u6cd5|\u8fd0\u8425|\u5c97)/.test(short) ? short : '';
  }
  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function normalizeText(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/([\uFF08(])\n+/g, '$1')
      .replace(/\n+([\uFF09)])/g, '$1')
      .replace(/\n[ \t]*([~\uFF5E-])[ \t]*\n/g, ' $1 ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[\uFF1A\uFE55]/g, ':')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  function compactResumeText(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/([\u4e00-\u9fa5A-Za-z0-9@._%+-])\s+(?=[\u4e00-\u9fa5A-Za-z0-9@._%+-])/g, '$1')
      .replace(/\s*:\s*/g, ':')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  function getResumeLines(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.replace(/\u00a0/g, ' ').replace(/[ \t]{2,}/g, ' ').trim())
      .filter(Boolean);
  }
  function normalizeSectionToken(value) {
    return String(value || '').toLowerCase().replace(/[\s:\uFF1A\u00B7\u2022\u25AA*\-\u2014_()[\]\uFF08\uFF09\u3010\u3011,\uFF0C\u3002.!\uFF01\uFF1F?\u3001/&+~\uFF5E]/g, '');
  }
  function getSectionTitleMap() {
    return {
      educationDetail: ['\u6559\u80b2\u80cc\u666f', '\u6559\u80b2\u7ecf\u5386'],
      internship: ['\u5b9e\u4e60\u7ecf\u5386', '\u5de5\u4f5c\u7ecf\u5386', '\u5b9e\u8df5\u7ecf\u5386'],
      project: ['\u9879\u76ee\u7ecf\u5386', '\u9879\u76ee\u7ecf\u9a8c'],
      skills: ['\u6280\u80fd&\u8bc1\u4e66&\u5176\u4ed6\u8363\u8a89', '\u8363\u8a89&\u6280\u80fd', '\u4e13\u4e1a\u6280\u80fd', '\u6280\u80fd\u6807\u7b7e', '\u6280\u80fd'],
      selfIntro: ['\u81ea\u6211\u8bc4\u4ef7', '\u4e2a\u4eba\u4f18\u52bf', '\u4e2a\u4eba\u603b\u7ed3', '\u81ea\u6211\u4ecb\u7ecd'],
      award: ['\u83b7\u5956\u7ecf\u5386', '\u83b7\u5956\u60c5\u51b5', '\u5956\u52b1', '\u8363\u8a89'],
      certificate: ['\u8bc1\u4e66', '\u8d44\u683c\u8bc1\u4e66'],
      campus: ['\u6821\u56ed\u7ecf\u5386', '\u5b66\u751f\u5de5\u4f5c', '\u793e\u56e2\u7ecf\u5386'],
      languages: ['\u8bed\u8a00\u80fd\u529b', '\u5916\u8bed']
    };
  }
  function isSectionTitleLine(line) {
    const normalizedLine = normalizeSectionToken(line);
    return SECTION_TITLES.some((title) => {
      const normalizedTitle = normalizeSectionToken(title);
      return normalizedLine === normalizedTitle || normalizedLine.endsWith(normalizedTitle) || normalizedTitle.endsWith(normalizedLine);
    });
  }
  function isPersonalInfoLine(line) {
    const normalizedLine = String(line || '').replace(/\s+/g, '');
    return /^(\u51fa\u751f\u5e74\u6708|\u51fa\u751f\u65e5\u671f|\u6027\u522b|\u6c11\u65cf|\u653f\u6cbb\u9762\u8c8c|\u7535\u8bdd|\u624b\u673a|\u624b\u673a\u53f7|\u90ae\u7bb1|\u7535\u5b50\u90ae\u7bb1|\u5fae\u4fe1|\u5e74\u9f84|\u5bb6\u4e61|\u7c4d\u8d2f|\u6240\u5728\u5730\u70b9|\u73b0\u5c45\u57ce\u5e02|\u6c42\u804c\u5c97\u4f4d|\u671f\u671b\u5c97\u4f4d|\u968f\u65f6\u5230\u5c97|\u7acb\u5373\u5230\u5c97|\u5c3d\u5feb\u5230\u5c97)/.test(normalizedLine);
  }
  function stripLabelPrefix(line) {
    return String(line || '').replace(/^[\u00B7\u2022\u25AA*\-]?\s*[^:\uFF1A\n]{1,24}[:\uFF1A]\s*/, '').trim();
  }
  function isLikelyNameLine(line) {
    const normalizedLine = String(line || '').replace(/\s+/g, '').trim();
    return /^[\u4e00-\u9fa5\u00b7]{2,6}$/.test(normalizedLine)
      && !/(\u51fa\u751f\u5e74\u6708|\u51fa\u751f\u65e5\u671f|\u6027\u522b|\u6c11\u65cf|\u653f\u6cbb\u9762\u8c8c|\u7535\u8bdd|\u624b\u673a|\u90ae\u7bb1|\u6559\u80b2\u80cc\u666f|\u6559\u80b2\u7ecf\u5386|\u5b9e\u4e60\u7ecf\u5386|\u9879\u76ee\u7ecf\u9a8c|\u9879\u76ee\u7ecf\u5386|\u6280\u80fd|\u8bc1\u4e66|\u8363\u8a89|\u5c97\u4f4d|\u5de5\u7a0b\u5e08|\u5f00\u53d1|\u5b9e\u4e60|\u9879\u76ee|\u6c49\u65cf|\u515a\u5458|\u672c\u79d1|\u7855\u58eb|\u535a\u58eb)/.test(normalizedLine);
  }
  function isLikelyCityLine(line) {
    const normalizedLine = String(line || '').replace(/\s+/g, '');
    if (!normalizedLine || normalizedLine.length > 24) return false;
    if (!/^[\u4e00-\u9fa5\u3001,\uFF0C/]+$/.test(normalizedLine)) return false;
    if (!/[\u3001,\uFF0C/]/.test(normalizedLine)) return false;
    const parts = normalizedLine.split(/[\u3001,\uFF0C/]/).filter(Boolean);
    return parts.length >= 2 && parts.every((part) => /^[\u4e00-\u9fa5]{2,4}$/.test(part));
  }
  function stripSectionNoise(text, key) {
    let lines = getResumeLines(text).filter((line) => !isSectionTitleLine(line));
    if (key === 'educationDetail') {
      const startIndex = lines.findIndex((line) => /(20\d{2}[./-]\d{1,2}.*(?:~|\uFF5E|\u81f3\u4eca|20\d{2}[./-]\d{1,2})|\u5927\u5b66|\u5b66\u9662|\u672c\u79d1|\u7855\u58eb|\u535a\u58eb|\u4e13\u79d1|\u5927\u4e13)/.test(line));
      if (startIndex > 0) lines = lines.slice(startIndex);
    }
    if (key === 'internship' || key === 'project') {
      const startIndex = lines.findIndex((line) => /(20\d{2}[./-]\d{1,2}|\u804c\u8d23[:\uFF1A]|\u9879\u76ee\u7b80\u4ecb[:\uFF1A]|\u6280\u672f\u6808[:\uFF1A]|\u6210\u679c[:\uFF1A]|\u8d1f\u8d23\u4eba|\u5b9e\u4e60\u751f|\u5de5\u7a0b\u5e08)/.test(line));
      if (startIndex > 0) lines = lines.slice(startIndex);
    }
    lines = lines.filter((line) => !isPersonalInfoLine(line));
    return tidyValue(lines.join('\n'), key);
  }
  function scoreSectionCandidate(key, text, mode) {
    const normalizedText = compactResumeText(text);
    if (!normalizedText) return -100;
    let score = Math.min(normalizedText.length, 2000) / 40;
    const add = (regex, points) => { if (regex.test(normalizedText)) score += points; };
    const subtract = (regex, points) => { if (regex.test(normalizedText)) score -= points; };
    if (key === 'educationDetail') {
      add(/\u5927\u5b66|\u5b66\u9662|\u672c\u79d1|\u7855\u58eb|\u535a\u58eb|\u4e13\u4e1a\u6210\u7ee9|\u4e3b\u4fee\u8bfe\u7a0b|\u5728\u6821\u8363\u8a89/, 45);
      add(/20\d{2}[./-]\d{1,2}/, 15);
      subtract(/\u804c\u8d23|\u4e3e\u63aa|\u6548\u679c|\u9879\u76ee\u7b80\u4ecb|\u6280\u672f\u6808/, 35);
    } else if (key === 'internship') {
      add(/\u5b9e\u4e60|\u804c\u8d23|\u4e3e\u63aa|\u6548\u679c|\u516c\u53f8|\u96c6\u56e2|\u5b9e\u4e60\u751f|\u5de5\u7a0b\u5e08/, 45);
      add(/20\d{2}[./-]\d{1,2}/, 15);
      if (/20\d{2}[./-]\d{1,2}/.test(normalizedText) && /(\u804c\u8d23|\u4e3e\u63aa|\u6548\u679c)/.test(normalizedText)) score += 30;
      subtract(/\u9879\u76ee\u7b80\u4ecb|\u6280\u672f\u6808|\u6210\u679c|\u4e3b\u4fee\u8bfe\u7a0b/, 25);
    } else if (key === 'project') {
      add(/\u9879\u76ee\u7b80\u4ecb|\u6280\u672f\u6808|\u6210\u679c|\u8d1f\u8d23\u4eba|\u5168\u6808\u5f00\u53d1|\u524d\u7aef\u5f00\u53d1|\u6a21\u578b\u8bad\u7ec3|Docker|FastAPI/, 45);
      add(/20\d{2}[./-]\d{1,2}/, 15);
      if (/20\d{2}[./-]\d{1,2}/.test(normalizedText) && /(\u9879\u76ee\u7b80\u4ecb|\u6280\u672f\u6808|\u6210\u679c)/.test(normalizedText)) score += 30;
      subtract(/\u4e3b\u4fee\u8bfe\u7a0b|\u5728\u6821\u8363\u8a89|\u653f\u6cbb\u9762\u8c8c|\u7535\u8bdd|\u90ae\u7bb1/, 30);
    } else if (key === 'skills') {
      add(/\u719f\u6089|\u638c\u63e1|\u4e86\u89e3|\u64c5\u957f|\u7cbe\u901a|\u6280\u80fd|\u8bc1\u4e66|\u8363\u8a89|CET|\u666e\u901a\u8bdd|Vue|React|TypeScript|Three\.js|Mapbox|ECharts|Docker|Git/, 45);
      subtract(/\u804c\u8d23|\u4e3e\u63aa|\u6548\u679c|\u9879\u76ee\u7b80\u4ecb/, 25);
    } else if (key === 'award') {
      add(/\u4e00\u7b49\u5956|\u4e8c\u7b49\u5956|\u4e09\u7b49\u5956|\u5956\u5b66\u91d1|\u6311\u6218\u676f|\u8363\u8a89|\u5fd7\u613f\u8005|\u4e13\u5229|\u8bba\u6587|\u8f6f\u8457/, 45);
    } else if (key === 'certificate') {
      add(/\u8bc1\u4e66|CET|\u96c5\u601d|\u6258\u798f|\u666e\u901a\u8bdd|\u8f6f\u8003|\u6559\u5e08\u8d44\u683c/, 45);
    } else if (key === 'languages') {
      add(/\u82f1\u8bed|\u65e5\u8bed|\u97e9\u8bed|\u5fb7\u8bed|\u6cd5\u8bed|CET|IELTS|TOEFL|\u6258\u798f|\u96c5\u601d/, 45);
    }
    if (mode === 'forward') score += 12;
    if (mode === 'combined') score -= 4;
    if (mode === 'trailing') score -= 10;
    subtract(/\u51fa\u751f\u5e74\u6708|\u6027\u522b|\u7535\u8bdd|\u90ae\u7bb1|\u6c42\u804c\u5c97\u4f4d/, 40);
    return score;
  }
  function extractResumeSections(lines) {
    const titleMap = getSectionTitleMap();
    const titleEntries = Object.entries(titleMap).flatMap(([key, titles]) => titles.map((title) => ({ key, normalized: normalizeSectionToken(title) })));
    const headings = [];
    lines.forEach((line, index) => {
      const normalizedLine = normalizeSectionToken(line);
      if (!normalizedLine) return;
      const hit = titleEntries.find((item) => normalizedLine === item.normalized || normalizedLine.endsWith(item.normalized) || item.normalized.endsWith(normalizedLine));
      if (hit) headings.push({ key: hit.key, index });
    });
    const candidates = {};
    const addCandidate = (key, candidateText, mode) => {
      const cleanedText = stripSectionNoise(candidateText, key);
      if (!cleanedText) return;
      if (!candidates[key]) candidates[key] = [];
      candidates[key].push({ text: cleanedText, score: scoreSectionCandidate(key, cleanedText, mode) });
    };
    headings.forEach((heading, idx) => {
      const nextIndex = headings[idx + 1] ? headings[idx + 1].index : lines.length;
      const forwardText = lines.slice(heading.index + 1, nextIndex).join('\n');
      const prevIndex = idx === 0 ? 0 : headings[idx - 1].index + 1;
      const trailingText = lines.slice(prevIndex, heading.index).join('\n');
      addCandidate(heading.key, forwardText, 'forward');
      addCandidate(heading.key, trailingText, 'trailing');
      if (heading.key === 'internship' || heading.key === 'project') {
        const leadText = extractExperienceLead(trailingText);
        addCandidate(heading.key, [leadText, forwardText].filter(Boolean).join('\n'), 'combined');
      }
    });
    const result = {};
    Object.keys(titleMap).forEach((key) => {
      const best = (candidates[key] || []).sort((a, b) => b.score - a.score)[0];
      if (best && best.score > 0) result[key] = best.text;
    });
    return result;
  }
  function extractExperienceLead(text) {
    const lines = getResumeLines(text);
    const indices = lines.map((line, index) => (/20\d{2}[./-]\d{1,2}/.test(line) ? index : -1)).filter((index) => index >= 0);
    if (!indices.length) return text;
    let startIndex = indices[indices.length - 1];
    for (let index = indices.length - 2; index >= 0; index -= 1) {
      if (startIndex - indices[index] <= 6) startIndex = indices[index];
      else break;
    }
    return lines.slice(startIndex).join('\n');
  }
  function parseEducationSection(sectionText, setField) {
    const lines = getResumeLines(sectionText);
    const schoolLine = lines.find((line) => /(\u5927\u5b66|\u5b66\u9662|University|College)/i.test(line) && !/(\u516c\u53f8|\u96c6\u56e2|\u5b9e\u4e60|\u9879\u76ee|\u8d1f\u8d23\u4eba)/.test(line));
    if (schoolLine) setField('school', schoolLine.replace(/^(\u81f3\u4eca|\u6bd5\u4e1a\u4e8e|\u5c31\u8bfb\u4e8e)/, '').trim());
    const dateLine = lines.find((line) => /20\d{2}[./-]\d{1,2}.*(?:~|\uFF5E|\u81f3\u4eca|20\d{2}[./-]\d{1,2})/.test(line));
    if (dateLine) {
      const dateMatches = dateLine.match(/20\d{2}[./-]\d{1,2}/g) || [];
      if (dateMatches.length > 1) setField('graduateDate', dateMatches[dateMatches.length - 1]);
    }
    const schoolIndex = schoolLine ? lines.indexOf(schoolLine) : -1;
    let majorSource = lines.find((line) => !/^(?:\u6559\u80b2\u80cc\u666f|\u6559\u80b2\u7ecf\u5386|\u4e3b\u4fee\u8bfe\u7a0b|\u4e13\u4e1a\u6210\u7ee9|\u5728\u6821\u8363\u8a89)/.test(line) && /(\u672c\u79d1|\u7855\u58eb|\u535a\u58eb|\u4e13\u79d1|\u5927\u4e13|\u5b66\u58eb|\u7814\u7a76\u751f)/.test(line) && !/(\u5927\u5b66|\u5b66\u9662|University|College)/i.test(line) && !/^(?:\u672c\u79d1|\u7855\u58eb|\u535a\u58eb|\u4e13\u79d1|\u5927\u4e13|\u5b66\u58eb|\u7814\u7a76\u751f)$/.test(line));
    if (!majorSource && schoolIndex >= 0) majorSource = lines.slice(schoolIndex + 1, schoolIndex + 4).join('');
    if (majorSource) {
      const normalizedLine = majorSource.replace(/\s+/g, '').replace(/\uFF08/g, '?').replace(/\uFF09/g, '?').trim();
      const pairMatch = normalizedLine.match(/^(.+?)[?(]((?:\u535a\u58eb|\u7855\u58eb|\u672c\u79d1|\u4e13\u79d1|\u5927\u4e13|\u5b66\u58eb|\u7814\u7a76\u751f))[)?]?$/);
      const degreeToken = pairMatch ? pairMatch[2] : ((normalizedLine.match(/(\u535a\u58eb|\u7855\u58eb|\u672c\u79d1|\u4e13\u79d1|\u5927\u4e13|\u5b66\u58eb|\u7814\u7a76\u751f)/) || [])[1] || '');
      const majorValue = (pairMatch ? pairMatch[1] : normalizedLine.replace(/[?(]?(\u535a\u58eb|\u7855\u58eb|\u672c\u79d1|\u4e13\u79d1|\u5927\u4e13|\u5b66\u58eb|\u7814\u7a76\u751f)[)?]?/g, '')).trim();
      if (majorValue && !/(\u4e3b\u4fee\u8bfe\u7a0b|\u4e13\u4e1a\u6210\u7ee9|\u5728\u6821\u8363\u8a89)/.test(majorValue)) setField('major', majorValue);
      if (degreeToken) {
        const degreeValue = normalizeEducationValue(degreeToken);
        setField('degree', degreeValue);
        setField('education', degreeValue);
      }
    }
    const courseLine = lines.find((line) => /^\u4e3b\u4fee\u8bfe\u7a0b[:\uFF1A]?/.test(line));
    if (courseLine) setField('skills', stripLabelPrefix(courseLine), { append: true });
    const awardLine = lines.find((line) => /^\u5728\u6821\u8363\u8a89[:\uFF1A]?/.test(line));
    if (awardLine) setField('award', stripLabelPrefix(awardLine), { append: true });
  }
  function splitCompositeSkillsSection(sectionText, setField) {
    const lines = getResumeLines(sectionText);
    const skillLines = [];
    const awardLines = [];
    const certificateLines = [];
    const languageLines = [];
    let lastBucket = 'skills';
    lines.forEach((line) => {
      const strippedLine = line.replace(/^[\s\u00B7\u2022\u25AA*\-]+/, '').trim();
      if (!strippedLine) return;
      if (/^(?:\u5176\u4ed6\u8363\u8a89|\u5728\u6821\u8363\u8a89|\u8363\u8a89|\u83b7\u5956|\u5956\u52b1|\u6210\u679c)[:\uFF1A]/.test(strippedLine)) {
        awardLines.push(stripLabelPrefix(strippedLine));
        lastBucket = 'award';
        return;
      }
      if (/^(?:\u8bc1\u4e66|\u8d44\u683c\u8bc1\u4e66)[:\uFF1A]/.test(strippedLine)) {
        certificateLines.push(stripLabelPrefix(strippedLine));
        lastBucket = 'certificate';
        return;
      }
      if (/^(?:\u8bed\u8a00\u80fd\u529b|\u8bed\u8a00)[:\uFF1A]/.test(strippedLine)) {
        languageLines.push(stripLabelPrefix(strippedLine));
        lastBucket = 'languages';
        return;
      }
      if (/^(?:\u6280\u80fd|\u4e13\u4e1a\u6280\u80fd|\u56e2\u961f\u80fd\u529b|\u4e3b\u4fee\u8bfe\u7a0b|\u6280\u672f\u6808)[:\uFF1A]/.test(strippedLine)) {
        skillLines.push(stripLabelPrefix(strippedLine));
        lastBucket = 'skills';
        return;
      }
      if (/(?:CET|\u96c5\u601d|\u6258\u798f|\u666e\u901a\u8bdd|\u56db\u7ea7|\u516d\u7ea7)/i.test(strippedLine) && !/(\u9879\u76ee|\u6280\u672f\u6808)/.test(strippedLine)) {
        certificateLines.push(strippedLine);
        lastBucket = 'certificate';
        return;
      }
      if (/(\u4e00\u7b49\u5956|\u4e8c\u7b49\u5956|\u4e09\u7b49\u5956|\u5956\u5b66\u91d1|\u6311\u6218\u676f|\u5fd7\u613f\u8005|\u4e13\u5229|\u8bba\u6587|\u8f6f\u8457)/.test(strippedLine) && !/(\u719f\u6089|\u638c\u63e1|\u4e86\u89e3|\u64c5\u957f|\u7cbe\u901a)/.test(strippedLine)) {
        awardLines.push(strippedLine);
        lastBucket = 'award';
        return;
      }
      if (/(\u82f1\u8bed|\u65e5\u8bed|\u97e9\u8bed|\u5fb7\u8bed|\u6cd5\u8bed|CET|IELTS|TOEFL|\u6258\u798f|\u96c5\u601d)/i.test(strippedLine)) {
        languageLines.push(strippedLine);
        lastBucket = 'languages';
        return;
      }
      if (/(\u719f\u6089|\u638c\u63e1|\u4e86\u89e3|\u64c5\u957f|\u7cbe\u901a|Vue|React|TypeScript|Three\.js|Mapbox|ECharts|Docker|Git|PostGIS|GDAL|FastAPI|Cursor|ClaudeCode|Trae)/i.test(strippedLine)) {
        skillLines.push(strippedLine);
        lastBucket = 'skills';
        return;
      }
      if (lastBucket === 'award') awardLines.push(strippedLine);
      else if (lastBucket === 'certificate') certificateLines.push(strippedLine);
      else if (lastBucket === 'languages') languageLines.push(strippedLine);
      else skillLines.push(strippedLine);
    });
    if (skillLines.length) setField('skills', joinUniqueLines(skillLines), { append: true });
    if (awardLines.length) setField('award', joinUniqueLines(awardLines), { append: true });
    if (certificateLines.length) setField('certificate', joinUniqueLines(certificateLines), { append: true });
    if (languageLines.length) setField('languages', joinUniqueLines(languageLines), { append: true });
  }
  function joinUniqueLines(lines) {
    const seen = new Set();
    return lines.map((line) => String(line || '').trim()).filter((line) => line && !seen.has(line) && seen.add(line)).join('\n');
  }
  function normalizeEducationValue(value) {
    const text = String(value || '').trim();
    if (/\u535a\u58eb/.test(text)) return '\u535a\u58eb';
    if (/\u7855\u58eb|\u7814\u7a76\u751f/.test(text)) return '\u7855\u58eb';
    if (/\u672c\u79d1|\u5b66\u58eb/.test(text)) return '\u672c\u79d1';
    if (/\u4e13\u79d1|\u5927\u4e13/.test(text)) return '\u4e13\u79d1';
    return text;
  }
  function inferAgeFromBirthday(value) {
    const match = String(value || '').match(/(\d{4})[./-](\d{1,2})(?:[./-](\d{1,2}))?/);
    if (!match) return 0;
    const year = Number(match[1]);
    const month = Number(match[2] || 1);
    const day = Number(match[3] || 1);
    if (!year || !month || !day) return 0;
    const now = new Date();
    let age = now.getFullYear() - year;
    const monthDiff = now.getMonth() + 1 - month;
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < day)) age -= 1;
    return age > 0 && age < 100 ? age : 0;
  }
  function findSection(text, titles) {
    const lines = getResumeLines(text);
    const sections = extractResumeSections(lines);
    const titleMap = getSectionTitleMap();
    const matchedKey = Object.keys(titleMap).find((key) => titles.some((title) => titleMap[key].includes(title)));
    if (matchedKey && sections[matchedKey]) return sections[matchedKey];
    const startIndex = lines.findIndex((line) => titles.some((title) => normalizeSectionToken(line).includes(normalizeSectionToken(title))));
    if (startIndex < 0) return '';
    return tidyValue(lines.slice(startIndex + 1).join('\n'), matchedKey || '');
  }
  function tidyValue(value, fieldKey = '') {
    const text = String(value || '').replace(/\r/g, '').replace(/\u00a0/g, ' ');
    if (LONG_FIELDS.has(fieldKey)) {
      return text.split('\n').map((line) => line.replace(/[ \t]{2,}/g, ' ').trim()).filter((line, index, array) => line || (index > 0 && array[index - 1])).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    return text.replace(/\s+/g, ' ').trim();
  }
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
    const lower = getCandidateSearchText(meta);
    if (lower.includes('\u9879\u76ee') || lower.includes('project')) return 'projects';
    if (lower.includes('\u5b9e\u4e60') || lower.includes('\u5de5\u4f5c\u7ecf\u5386') || lower.includes('\u5de5\u4f5c\u7ecf\u9a8c') || lower.includes('intern') || lower.includes('company') || lower.includes('\u516c\u53f8')) return 'internships';
    if (lower.includes('\u6559\u80b2') || lower.includes('\u5b66\u6821') || lower.includes('\u4e13\u4e1a') || lower.includes('\u5b66\u5386') || lower.includes('\u5b66\u4f4d') || lower.includes('education')) return 'educations';
    return '';
  }
  function inferExperienceSubField(meta, type) {
    const lower = getCandidateSearchText(meta);
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
    const seenKeys = new Set();
    const result = elements
      .filter((element) => isVisible(element) && !matchesAny(element, ignoreList))
      .map((element, index) => buildScanCandidate(element, index))
      .filter((candidate) => {
        if (!candidate || !candidate.key) return false;
        if (seenKeys.has(candidate.key)) return false;
        seenKeys.add(candidate.key);
        return true;
      });
    result.forEach((candidate) => {
      const match = inferFieldMatch(candidate);
      candidate.inferredField = match.fieldKey;
      candidate.inferredScore = match.score;
      candidate.matchReason = match.reason;
    });
    state.lastScan = result.map((item) => ({ key: item.key, tag: item.tag, selector: item.selector, meta: item.meta, label: item.label, section: item.section, optionsText: item.optionsText, controlType: item.controlType, inferredField: item.inferredField, inferredScore: item.inferredScore, matchReason: item.matchReason }));
    saveState();
    return result;
  }
  function safeQuery(selector) { try { return Array.from(document.querySelectorAll(selector)); } catch { return []; } }
  function matchesAny(element, selectors) { return selectors.some((selector) => { try { return element.matches(selector) || !!element.closest(selector); } catch { return false; } }); }
  function buildScanCandidate(element, index) {
    const wrapper = findFieldWrapper(element);
    const controlType = detectControlType(element);
    const label = collectElementLabelText(element, wrapper);
    const section = collectElementSectionText(element, wrapper);
    const context = collectElementContextText(element, wrapper);
    const optionList = collectElementOptionTexts(element, wrapper, controlType);
    const optionsText = optionList.slice(0, 24).join(' | ');
    const key = buildElementKey(element, index, controlType, wrapper, label, section);
    const selector = element.id ? `#${element.id}` : buildShortSelector(element);
    const meta = collectElementMetadata(element, { label, section, context, optionsText, controlType });
    return {
      key,
      element,
      tag: element.tagName.toLowerCase(),
      selector,
      meta,
      label,
      section,
      context,
      optionsText,
      optionCount: optionList.length,
      controlType,
      inputType: String(element.getAttribute && element.getAttribute('type') || '').toLowerCase()
    };
  }
  function findFieldWrapper(element) {
    return element.closest('.ant-form-item,.el-form-item,.ivu-form-item,.n-form-item,.form-item,.form-group,.field,.field-item,.form-row,.form-cell,.resume-form-item,.resume-item,.item,[data-field]') || element.parentElement;
  }
  function detectControlType(element) {
    if (!element || !element.matches) return 'input';
    if (element.matches('select')) return 'native-select';
    if (element.matches('textarea')) return 'textarea';
    if (element.matches('[contenteditable="true"]')) return 'contenteditable';
    const type = String(element.getAttribute('type') || '').toLowerCase();
    if (type === 'radio') return 'radio';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'date' || type === 'month' || type === 'datetime-local') return 'date';
    if (isCustomSelect(element)) return 'custom-select';
    return 'input';
  }
  function safeInnerText(node, maxLength = 220) {
    if (!node) return '';
    return normalizeText(String(node.innerText || node.textContent || '')).replace(/\s+/g, ' ').slice(0, maxLength).trim();
  }
  function uniqueTextParts(values) {
    const seen = new Set();
    return values.map((value) => String(value || '').trim()).filter((value) => value && !seen.has(value) && seen.add(value));
  }
  function collectElementLabelText(element, wrapper) {
    const pieces = [];
    if (element.labels) Array.from(element.labels).forEach((label) => pieces.push(safeInnerText(label, 80)));
    if (wrapper) {
      const labelNodes = Array.from(wrapper.querySelectorAll('label,.ant-form-item-label,.ant-form-item-label label,.el-form-item__label,.form-label,.label,[data-label]')).slice(0, 4);
      labelNodes.forEach((node) => pieces.push(safeInnerText(node, 80)));
    }
    if (element.previousElementSibling) pieces.push(safeInnerText(element.previousElementSibling, 80));
    if (element.parentElement && element.parentElement !== wrapper) pieces.push(safeInnerText(element.parentElement.firstElementChild, 80));
    pieces.push(collectNearbyLabelText(element, wrapper));
    return uniqueTextParts(pieces).join(' | ');
  }
  function collectNearbyLabelText(element, wrapper) {
    const pieces = [];
    let current = element;
    for (let depth = 0; depth < 3 && current; depth += 1) {
      let sibling = current.previousElementSibling;
      let hops = 0;
      while (sibling && hops < 3) {
        const text = safeInnerText(sibling, 60);
        if (text && text.length <= 40) pieces.push(text);
        sibling = sibling.previousElementSibling;
        hops += 1;
      }
      current = current.parentElement;
      if (wrapper && current === wrapper.parentElement) break;
    }
    return uniqueTextParts(pieces).join(' | ');
  }
  function collectElementSectionText(element, wrapper) {
    const headingText = findNearbyHeadingText(wrapper || element);
    if (headingText) return headingText;
    const formSection = element.closest('[data-section],section,fieldset,.section,.block,.card,.panel,.resume-block');
    return safeInnerText(formSection && formSection.querySelector('h1,h2,h3,h4,h5,h6,legend,.section-title,.block-title,.card-title,.panel-title,.title'), 80);
  }
  function findNearbyHeadingText(node) {
    let current = node;
    while (current && current !== document.body) {
      let sibling = current.previousElementSibling;
      while (sibling) {
        const heading = sibling.matches && sibling.matches('h1,h2,h3,h4,h5,h6,legend,.section-title,.block-title,.card-title,.panel-title,.title,.resume-title') ? sibling : sibling.querySelector && sibling.querySelector('h1,h2,h3,h4,h5,h6,legend,.section-title,.block-title,.card-title,.panel-title,.title,.resume-title');
        const text = safeInnerText(heading, 80);
        if (text) return text;
        sibling = sibling.previousElementSibling;
      }
      current = current.parentElement;
    }
    return '';
  }
  function collectElementContextText(element, wrapper) {
    const pieces = [];
    pieces.push(safeInnerText(wrapper, 260));
    if (wrapper && wrapper.parentElement) pieces.push(safeInnerText(wrapper.parentElement, 260));
    if (element.parentElement && element.parentElement !== wrapper) pieces.push(safeInnerText(element.parentElement, 220));
    return uniqueTextParts(pieces).join(' | ');
  }
  function collectElementOptionTexts(element, wrapper, controlType) {
    if (controlType === 'native-select') return Array.from(element.options || []).map((option) => safeInnerText(option, 40)).filter(Boolean);
    if (controlType === 'radio' || controlType === 'checkbox') return collectGroupOptionTexts(element, wrapper, controlType);
    if (controlType === 'custom-select') {
      const root = element.closest('.ant-select,.el-select,[role="combobox"]') || element;
      const visibleOptions = Array.from(document.querySelectorAll('.ant-select-item-option,.el-select-dropdown__item,[role="option"],.select-option,li[role="option"]')).map((option) => safeInnerText(option, 40)).filter(Boolean);
      const inlineHints = [safeInnerText(root, 120), safeInnerText(root.querySelector && root.querySelector('[title],[aria-label]'), 80)];
      return uniqueTextParts(visibleOptions.length ? visibleOptions : inlineHints);
    }
    return [];
  }
  function collectGroupOptionTexts(element, wrapper, controlType) {
    const scope = element.closest('form,.ant-form,.el-form,.resume-form,.container,.content,.main,.page') || document;
    const pieces = [];
    const selector = `input[type="${controlType}"]${element.name ? `[name="${cssEscape(element.name)}"]` : ''}`;
    Array.from(safeQuery(selector)).forEach((input) => {
      const root = input.closest('label,.ant-radio-wrapper,.ant-checkbox-wrapper,.el-radio,.el-checkbox,.radio,.checkbox') || input.parentElement;
      pieces.push(safeInnerText(root, 60));
      pieces.push(safeInnerText(input, 40));
      pieces.push(input.value || '');
    });
    if (!pieces.length && wrapper) pieces.push(safeInnerText(wrapper, 160));
    return uniqueTextParts(pieces);
  }
  function collectElementMetadata(element, descriptor = {}) {
    const pieces = [];
    const push = (value) => { if (value) pieces.push(String(value).trim()); };
    push(element.name);
    push(element.id);
    push(element.placeholder);
    push(element.type);
    push(element.getAttribute && element.getAttribute('aria-label'));
    push(element.getAttribute && element.getAttribute('title'));
    push(element.getAttribute && element.getAttribute('data-testid'));
    push(descriptor.label);
    push(descriptor.section);
    push(descriptor.optionsText);
    push(descriptor.context);
    return normalizeText(pieces.join(' | ').toLowerCase());
  }
  function buildElementKey(element, index, controlType, wrapper, label, section) {
    const host = location.hostname;
    if (controlType === 'radio' || controlType === 'checkbox') {
      const groupName = normalizeSectionToken(element.name || label || section || safeInnerText(wrapper, 80) || element.id || `${controlType}-${index}`);
      return `${host}|${controlType}|${groupName}`;
    }
    if (controlType === 'custom-select') {
      const root = element.closest('.ant-select,.el-select,[role="combobox"]') || element;
      const rootName = normalizeSectionToken(root.id || root.getAttribute('aria-controls') || root.getAttribute('aria-labelledby') || root.getAttribute('aria-label') || label || section || `${controlType}-${index}`);
      return `${host}|${controlType}|${rootName}`;
    }
    return `${host}|${element.tagName.toLowerCase()}|${element.name || ''}|${element.id || ''}|${element.placeholder || ''}|${index}`;
  }
  function buildShortSelector(element) {
    const parts = [element.tagName.toLowerCase()];
    if (element.name) parts.push(`[name="${cssEscape(element.name)}"]`);
    else if (element.id) parts.push(`#${cssEscape(element.id)}`);
    else if (element.placeholder) parts.push(`[placeholder="${cssEscape(element.placeholder)}"]`);
    return parts.join('');
  }
  function autoGenerateMappings(scan) {
    const siteMappings = getSiteMappings();
    scan.forEach((item) => {
      if (item.inferredField && (item.inferredScore || 0) >= 10) siteMappings[item.key] = item.inferredField;
    });
    saveState();
    log(`\u5df2\u4e3a\u672c\u7ad9\u751f\u6210 ${Object.keys(siteMappings).length} \u6761\u6620\u5c04\u3002`);
  }
  function highlightFieldByKey(key, scan) {
    const target = scan.find((item) => item.key === key);
    if (!target) return;
    const element = target.element;
    const old = element.style.outline;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.style.outline = '3px solid #ef4444';
    setTimeout(() => { element.style.outline = old; }, 2200);
  }
  function inferFieldMatch(candidate) {
    const siteMappings = getSiteMappings();
    if (siteMappings[candidate.key]) return { fieldKey: siteMappings[candidate.key], score: 999, reason: 'manual' };
    const adapter = getSiteAdapter();
    const scores = Object.keys(FIELD_ALIASES).map((fieldKey) => scoreFieldCandidate(candidate, fieldKey, adapter)).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
    const best = scores[0];
    const second = scores[1] ? scores[1].score : 0;
    if (!best || best.score < 10) return { fieldKey: '', score: best ? best.score : 0, reason: '' };
    if (best.score - second < 3 && best.score < 18) return { fieldKey: '', score: best.score, reason: best.reason };
    return best;
  }
  function inferFieldKey(candidate) { return inferFieldMatch(candidate).fieldKey; }
  function scoreFieldCandidate(candidate, fieldKey, adapter) {
    const label = normalizeMatchText(candidate.label);
    const section = normalizeMatchText(candidate.section);
    const meta = normalizeMatchText(candidate.meta);
    const context = normalizeMatchText(candidate.context);
    const selector = normalizeMatchText(`${candidate.selector || ''} ${candidate.element && candidate.element.name ? candidate.element.name : ''} ${candidate.element && candidate.element.id ? candidate.element.id : ''} ${candidate.element && candidate.element.placeholder ? candidate.element.placeholder : ''}`);
    const options = normalizeMatchText(candidate.optionsText);
    const aliases = Array.from(new Set([].concat(FIELD_ALIASES[fieldKey] || [], (adapter.aliases && adapter.aliases[fieldKey]) || [])));
    let score = 0;
    const reasons = [];
    aliases.forEach((alias) => {
      const normalizedAlias = normalizeMatchText(alias);
      if (!normalizedAlias) return;
      score += scoreAliasInText(label, normalizedAlias, 18, reasons, `label:${alias}`);
      score += scoreAliasInText(section, normalizedAlias, 14, reasons, `section:${alias}`);
      score += scoreAliasInText(selector, normalizedAlias, 12, reasons, `selector:${alias}`);
      score += scoreAliasInText(meta, normalizedAlias, 7, reasons, `meta:${alias}`);
      score += scoreAliasInText(context, normalizedAlias, 4, reasons, `context:${alias}`);
      score += scoreAliasInText(options, normalizedAlias, 4, reasons, `options:${alias}`);
    });
    const searchBlob = `${label} ${section} ${meta} ${options}`;
    if (LONG_FIELDS.has(fieldKey)) {
      if (candidate.controlType === 'textarea' || candidate.controlType === 'contenteditable') score += 10;
      else score -= 6;
    } else if (candidate.controlType === 'textarea' || candidate.controlType === 'contenteditable') {
      score -= 5;
    } else {
      score += 2;
    }
    if (fieldKey === 'project' && /\u9879\u76ee/.test(searchBlob)) score += 30;
    if (fieldKey === 'internship' && /(\u5b9e\u4e60|\u5de5\u4f5c\u7ecf\u5386|\u5de5\u4f5c\u7ecf\u9a8c)/.test(searchBlob)) score += 30;
    if (fieldKey === 'educationDetail' && /\u6559\u80b2/.test(searchBlob)) score += 28;
    if (fieldKey === 'award' && /(\u83b7\u5956|\u8363\u8a89|\u5956\u9879)/.test(searchBlob)) score += 24;
    if (fieldKey === 'certificate' && /\u8bc1\u4e66/.test(searchBlob)) score += 24;
    if (fieldKey === 'skills' && /(\u6280\u80fd|\u4e13\u4e1a\u6280\u80fd|\u56e2\u961f\u80fd\u529b)/.test(searchBlob)) score += 24;
    if (fieldKey === 'selfIntro' && /(\u81ea\u6211\u8bc4\u4ef7|\u4e2a\u4eba\u4f18\u52bf|\u81ea\u6211\u4ecb\u7ecd)/.test(searchBlob)) score += 24;
    if (fieldKey === 'city' && /(\u73b0\u5c45\u57ce\u5e02|\u6240\u5728\u57ce\u5e02|\u6240\u5728\u5730\u70b9|\u5c45\u4f4f\u57ce\u5e02)/.test(searchBlob)) score += 18;
    if (fieldKey === 'expectedCity' && /(\u671f\u671b\u57ce\u5e02|\u610f\u5411\u57ce\u5e02|\u5de5\u4f5c\u5730\u70b9|\u57ce\u5e02)/.test(searchBlob)) score += 18;
    if (fieldKey === 'expectedJob' && /(\u5c97\u4f4d|\u804c\u4f4d|\u65b9\u5411)/.test(searchBlob)) score += 18;
    if (fieldKey === 'jobStatus' && /(\u5230\u5c97|\u72b6\u6001|\u6c42\u804c\u72b6\u6001)/.test(searchBlob)) score += 18;
    if (fieldKey === 'phone' && /(\u7535\u8bdd|\u624b\u673a|mobile|tel)/.test(searchBlob)) score += 18;
    if (fieldKey === 'email' && /(\u90ae\u7bb1|email|mail)/.test(searchBlob)) score += 18;
    if (fieldKey === 'gender' && /(\u6027\u522b|gender|sex)/.test(searchBlob)) score += 18;
    if (fieldKey === 'birthday' && /(\u51fa\u751f|\u751f\u65e5|birthday|birth)/.test(searchBlob)) score += 18;
    if (fieldKey === 'age' && /(\u5e74\u9f84|age)/.test(searchBlob)) score += 18;
    if (fieldKey === 'school' && /(\u5b66\u6821|\u9662\u6821|school|college|university)/.test(searchBlob)) score += 18;
    if (fieldKey === 'major' && /(\u4e13\u4e1a|major)/.test(searchBlob)) score += 18;
    if (fieldKey === 'education' && /(\u5b66\u5386|education)/.test(searchBlob)) score += 18;
    if (fieldKey === 'degree' && /(\u5b66\u4f4d|degree)/.test(searchBlob)) score += 18;
    if (fieldKey === 'graduateDate' && /(\u6bd5\u4e1a|graduat)/.test(searchBlob)) score += 18;
    if (fieldKey === 'portfolio' && /(\u4f5c\u54c1|\u7f51\u7ad9|blog|portfolio|site|url)/.test(searchBlob)) score += 18;
    if (['native-select', 'custom-select', 'radio', 'checkbox'].includes(candidate.controlType)) score += scoreCandidateOptions(candidate, fieldKey);
    if (fieldKey === 'award' && /(\u9879\u76ee|\u5b9e\u4e60|\u6559\u80b2)/.test(section)) score -= 10;
    if (fieldKey === 'project' && /(\u83b7\u5956|\u8363\u8a89|\u8bc1\u4e66)/.test(section)) score -= 12;
    if (fieldKey === 'internship' && /(\u83b7\u5956|\u8363\u8a89|\u8bc1\u4e66)/.test(section)) score -= 12;
    return { fieldKey, score, reason: reasons.slice(0, 4).join(', ') };
  }
  function scoreAliasInText(text, alias, weight, reasons, reason) {
    if (!text || !alias) return 0;
    if (text === alias) { if (reasons.length < 4) reasons.push(reason); return weight + 3; }
    if (text.includes(alias)) { if (reasons.length < 4) reasons.push(reason); return weight; }
    return 0;
  }
  function normalizeMatchText(value) { return normalizeSectionToken(String(value || '')); }
  function scoreCandidateOptions(candidate, fieldKey) {
    const optionText = String(candidate.optionsText || '').toLowerCase();
    if (!optionText) return 0;
    let score = scoreOptionDictionaryMatch(optionText, fieldKey);
    if (fieldKey === 'expectedCity' && /(\u5317\u4eac|\u4e0a\u6d77|\u676d\u5dde|\u5357\u4eac|\u6df1\u5733|\u5e7f\u5dde|\u82cf\u5dde|\u6b66\u6c49|\u6210\u90fd|\u897f\u5b89|\u5929\u6d25|\u91cd\u5e86)/.test(optionText)) score += 12;
    if (fieldKey === 'jobStatus' && /(\u968f\u65f6\u5230\u5c97|\u7acb\u5373\u5230\u5c97|\u5c3d\u5feb\u5230\u5c97|\u4e00\u5468\u5185\u5230\u5c97|\u4e00\u4e2a\u6708\u5185\u5230\u5c97|\u5728\u804c|\u79bb\u804c)/.test(optionText)) score += 12;
    return score;
  }
  function scoreOptionDictionaryMatch(optionText, fieldKey) {
    const dictionary = OPTION_DICTIONARY[fieldKey];
    if (!dictionary) return 0;
    return Object.entries(dictionary).reduce((total, [standard, aliases]) => {
      const tokens = [standard].concat(aliases || []);
      return total + (tokens.some((token) => optionText.includes(String(token).toLowerCase())) ? 8 : 0);
    }, 0);
  }
  function isCompatibleFieldTarget(candidate, fieldKey) {
    if (!candidate || !fieldKey) return false;
    if (LONG_FIELDS.has(fieldKey)) return candidate.controlType === 'textarea' || candidate.controlType === 'contenteditable';
    if (candidate.controlType === 'textarea' || candidate.controlType === 'contenteditable') return false;
    return true;
  }
  function getCandidateSearchText(candidate) {
    if (!candidate || typeof candidate !== 'object') return String(candidate || '').toLowerCase();
    return [candidate.label, candidate.section, candidate.context, candidate.meta, candidate.optionsText, candidate.selector].filter(Boolean).join(' ').toLowerCase();
  }
  function describeAutofillTargets(profile, scan) {
    const mapped = scan.map((item) => item.inferredField || inferFieldKey(item)).filter(Boolean);
    const uniqueMapped = Array.from(new Set(mapped));
    const ready = uniqueMapped.filter((key) => profile.fields[key]);
    return `\u53d1\u73b0 ${scan.length} \u4e2a\u5019\u9009\u63a7\u4ef6\uff0c\u53ef\u8bc6\u522b ${uniqueMapped.length} \u7c7b\u5b57\u6bb5\uff0c\u5f53\u524d\u7b80\u5386\u53ef\u76f4\u63a5\u586b\u5145 ${ready.length} \u7c7b\u3002`;
  }
  async function autofillActiveProfile(options) {
    const config = Object.assign({ overwrite: false, mappedOnly: false, emptyOnly: false }, options || {});
    if (!getCurrentSiteRule().enabled) { log('\u672c\u7ad9\u89c4\u5219\u5df2\u7981\u7528\uff0c\u8df3\u8fc7\u81ea\u52a8\u586b\u5199\u3002'); return 0; }
    const profile = getActiveProfile();
    const siteMappings = getSiteMappings();
    const scan = scanPageFields().slice().sort((a, b) => (Number(Boolean(siteMappings[b.key])) - Number(Boolean(siteMappings[a.key]))) || ((b.inferredScore || 0) - (a.inferredScore || 0)));
    let filled = 0;
    const expCounters = {};
    const directFieldUsage = new Set();
    for (const candidate of scan) {
      if (config.emptyOnly && hasUserValue(candidate.element)) continue;
      if (!config.overwrite && hasUserValue(candidate.element)) continue;
      const manualMapped = Boolean(siteMappings[candidate.key]);
      const searchText = getCandidateSearchText(candidate);
      const qaAnswer = detectQuestionAnswer(searchText, profile);
      if (qaAnswer && /(why us|\u4e3a\u4ec0\u4e48\u9009\u62e9|\u4e3a\u4ec0\u4e48\u52a0\u5165|strength|weakness|\u4f18\u70b9|\u7f3a\u70b9|career plan|\u804c\u4e1a\u89c4\u5212|\u95ee\u9898|question)/.test(searchText) && await applyValueToField(candidate.element, qaAnswer, 'custom')) { filled += 1; continue; }
      const expType = inferExperienceType(candidate);
      if (expType) {
        const subField = inferExperienceSubField(candidate, expType);
        const templates = ensureTemplates(profile)[expType] || [];
        const counterKey = `${expType}:${subField}`;
        const index = expCounters[counterKey] || 0;
        const entry = templates[index];
        const templatedValue = getTemplateFieldValue(entry, subField);
        if (templatedValue && await applyValueToField(candidate.element, templatedValue, 'custom')) {
          expCounters[counterKey] = index + 1;
          filled += 1;
          continue;
        }
      }
      const fieldKey = candidate.inferredField || inferFieldKey(candidate);
      if (!fieldKey) continue;
      if (config.mappedOnly && !manualMapped) continue;
      if (!manualMapped && !isCompatibleFieldTarget(candidate, fieldKey)) continue;
      if (!manualMapped && directFieldUsage.has(fieldKey)) continue;
      const value = profile.fields[fieldKey];
      if (!value) continue;
      if (await applyValueToField(candidate.element, value, fieldKey)) {
        filled += 1;
        directFieldUsage.add(fieldKey);
        await delay(40);
      }
    }
    const recognized = scan.filter((item) => item.inferredField).length;
    log(`\u81ea\u52a8\u586b\u5199\u5b8c\u6210\uff0c\u547d\u4e2d ${filled} \u4e2a\u5b57\u6bb5\uff0c\u8bc6\u522b\u5b57\u6bb5 ${recognized}/${scan.length}\u3002`);
    notify(filled ? `\u81ea\u52a8\u586b\u5199\u5b8c\u6210\uff0c\u547d\u4e2d ${filled} \u4e2a\u5b57\u6bb5\u3002` : '\u672a\u5339\u914d\u5230\u53ef\u586b\u5199\u5b57\u6bb5\uff0c\u8bf7\u6253\u5f00\u6620\u5c04\u9875\u8865\u5145\u7ad9\u70b9\u5b57\u6bb5\u6620\u5c04\u3002');
    return filled;
  }
  function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  function hasUserValue(element) { if (element.matches('select')) return !!element.value; if (element.matches('input,textarea')) return !!String(element.value || '').trim(); if (element.matches('[contenteditable="true"]')) return !!String(element.textContent || '').trim(); return false; }
  async function applyValueToField(element, rawValue, fieldKey) {
    const value = normalizeFieldValue(rawValue, fieldKey); if (!value) return false;
    if (element.matches('select')) return fillNativeSelect(element, value, fieldKey);
    if (isCustomSelect(element)) return await fillCustomSelect(element, value, fieldKey);
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
  async function fillCustomSelect(element, value, fieldKey) {
    const root = element.closest('.ant-select,.el-select,[role="combobox"]') || element;
    const clickable = root.matches('[role="combobox"]') ? root : root.querySelector('input,.ant-select-selector,.el-input__inner,[role="combobox"]');
    if (!clickable) return false;
    clickable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    if (typeof clickable.click === 'function') clickable.click();
    if (clickable.dispatchEvent) clickable.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await delay(120);
    let options = Array.from(document.querySelectorAll('.ant-select-item-option,.el-select-dropdown__item,[role="option"],.select-option,li[role="option"]'));
    let matched = options.find((option) => compareOptionText(option.innerText, value, fieldKey));
    if (!matched && clickable.matches && clickable.matches('input')) {
      trySetNativeValue(clickable, value);
      dispatchInputEvents(clickable);
      await delay(160);
      options = Array.from(document.querySelectorAll('.ant-select-item-option,.el-select-dropdown__item,[role="option"],.select-option,li[role="option"]'));
      matched = options.find((option) => compareOptionText(option.innerText, value, fieldKey));
    }
    if (matched) {
      matched.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      matched.click();
      await delay(80);
      return true;
    }
    if (clickable.matches && clickable.matches('input')) {
      trySetNativeValue(clickable, value);
      dispatchInputEvents(clickable);
      clickable.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await delay(60);
      return true;
    }
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




