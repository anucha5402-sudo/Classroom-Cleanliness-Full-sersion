const CRITERIA = [
  { key: 'floor', label: 'ความสะอาดของพื้นห้อง', icon: '🧹', levels: ['สะอาด','ค่อนข้างสะอาด','ปานกลาง','ค่อนข้างไม่สะอาด','ไม่สะอาด'], pts: [0,3,7,11,15] },
  { key: 'trashUnder', label: 'ขยะใต้โต๊ะ (ใต้โต๊ะที่ใส่ของ)', icon: '🗑️', levels: ['สะอาด','ค่อนข้างสะอาด','ปานกลาง','ค่อนข้างไม่สะอาด','ไม่สะอาด'], pts: [0,3,7,11,15] },
  { key: 'trashOn', label: 'ขยะบนโต๊ะ', icon: '📄', levels: ['สะอาด','ค่อนข้างสะอาด','ปานกลาง','ค่อนข้างไม่สะอาด','ไม่สะอาด'], pts: [0,3,7,11,15] },
  { key: 'chair', label: 'ความเป็นระเบียบของเก้าอี้', icon: '🪑', levels: ['เป็นระเบียบ','ค่อนข้างเป็นระเบียบ','ปานกลาง','ค่อนข้างไม่เป็นระเบียบ','ไม่เป็นระเบียบ'], pts: [0,3,7,11,15] },
  { key: 'desk', label: 'ความเป็นระเบียบของโต๊ะ', icon: '🗄️', levels: ['เป็นระเบียบ','ค่อนข้างเป็นระเบียบ','ปานกลาง','ค่อนข้างไม่เป็นระเบียบ','ไม่เป็นระเบียบ'], pts: [0,3,7,11,15] },
  { key: 'fan', label: 'พัดลม (ปิดหลังเลิกใช้งาน ทั้งหมด 4 ตัว)', icon: '🌀', levels: ['ปิดทั้งหมด (0 ตัวไม่ปิด)','ไม่ปิด 1 ตัว','ไม่ปิด 2 ตัว','ไม่ปิด 3 ตัว','ไม่ปิด 4 ตัว'], pts: [0,3,5,7,10] },
  { key: 'light', label: 'ไฟ (ปิดหลังเลิกใช้งาน)', icon: '💡', levels: ['ปิด','ไม่ปิด'], pts: [0,8] }
];
const SEVERITY = [
  { value: 1, label: 'ค่อนข้างรุนแรง', pts: 10 },
  { value: 2, label: 'รุนแรง', pts: 20 },
  { value: 3, label: 'รุนแรงมาก', pts: 35 }
];
const GRADES = ['ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'];
const ROOM_CODES = [];
GRADES.forEach(g => { ROOM_CODES.push(`${g}/1`); ROOM_CODES.push(`${g}/2`); });

const GRADE_GROUPS = [
  { label: 'มัธยมศึกษาตอนต้น (ม.1 - ม.3)', grades: ['ม.1', 'ม.2', 'ม.3'] },
  { label: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)', grades: ['ม.4', 'ม.5', 'ม.6'] }
];
function roomCodesForGroup(group) {
  const codes = [];
  group.grades.forEach(g => { codes.push(`${g}/1`); codes.push(`${g}/2`); });
  return codes;
}

const TEACHERS = {
  'ม.1/1': ['อ.กุลวลี', 'อ.เจนจิรา'],
  'ม.1/2': ['อ.เดือนเพ็ญ'],
  'ม.2/1': ['อ.กรรณิการ์'],
  'ม.2/2': ['อ.อัสมิง'],
  'ม.3/1': ['อ.เกษรินทร์'],
  'ม.3/2': ['อ.ขัตติยะ', 'อ.ชาญวิทย์'],
  'ม.4/1': ['อ.อารีษา'],
  'ม.4/2': ['อ.นวพร'],
  'ม.5/1': ['อ.อินทีวร'],
  'ม.5/2': ['อ.ธัญญาเรศ'],
  'ม.6/1': ['อ.ธนาวุฒิ'],
  'ม.6/2': ['อ.ธวัชชัย']
};
function teacherNamesFor(code) {
  const t = TEACHERS[code];
  return t ? t.join(' / ') : '';
}

const DEFAULT_PASSWORD = 'inspect2025';
const PW_KEY = 'app-password';

const state = { selections: {}, severityLevel: null, severityPhoto: null };

// ==========================================================================
// ชั้นเก็บข้อมูล (Storage layer)
// ถ้ามีการตั้งค่า firebase-config.js ไว้ถูกต้อง จะใช้ Firestore เป็นฐานข้อมูลกลาง
// (แชร์ข้อมูลข้ามเครื่อง/อุปกรณ์ได้จริง) ถ้ายังไม่ได้ตั้งค่า จะใช้ localStorage
// ของเบราว์เซอร์แทน (ใช้ได้เฉพาะเครื่องนั้น)
// ==========================================================================
let USE_FIREBASE = false;
let db = null;

function isFirebaseConfigured() {
  try {
    return typeof firebaseConfig !== 'undefined' &&
      firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('วางค่า') &&
      firebaseConfig.projectId && !firebaseConfig.projectId.includes('วางค่า');
  } catch (e) {
    return false;
  }
}

function initStorage() {
  if (isFirebaseConfigured() && typeof firebase !== 'undefined') {
    try {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      USE_FIREBASE = true;
    } catch (e) {
      console.error('Firebase init failed, falling back to local storage', e);
      USE_FIREBASE = false;
    }
  }
  renderConnBadges();
}

const localAdapter = {
  async get(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) throw new Error('not found');
    return { key, value: raw };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
  async list(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!prefix || k.startsWith(prefix)) keys.push(k);
    }
    return { keys, prefix };
  }
};

const firebaseAdapter = {
  async get(key) {
    const doc = await db.collection('data').doc(key).get();
    if (!doc.exists) throw new Error('not found');
    return { key, value: doc.data().value };
  },
  async set(key, value) {
    await db.collection('data').doc(key).set({ value, updatedAt: Date.now() });
    return { key, value };
  },
  async delete(key) {
    await db.collection('data').doc(key).delete();
    return { key, deleted: true };
  },
  async list(prefix) {
    const snapshot = await db.collection('data').get();
    const keys = [];
    snapshot.forEach(doc => { if (!prefix || doc.id.startsWith(prefix)) keys.push(doc.id); });
    return { keys, prefix };
  }
};

const storage = {
  get: (...args) => (USE_FIREBASE ? firebaseAdapter : localAdapter).get(...args),
  set: (...args) => (USE_FIREBASE ? firebaseAdapter : localAdapter).set(...args),
  delete: (...args) => (USE_FIREBASE ? firebaseAdapter : localAdapter).delete(...args),
  list: (...args) => (USE_FIREBASE ? firebaseAdapter : localAdapter).list(...args)
};

function renderConnBadges() {
  const html = USE_FIREBASE
    ? `<span class="conn-badge online"><span class="conn-dot online"></span>เชื่อมต่อฐานข้อมูลกลาง</span>`
    : `<span class="conn-badge offline"><span class="conn-dot"></span>โหมดออฟไลน์ (เก็บเฉพาะเครื่องนี้)</span>`;
  ['conn-badge-landing', 'conn-badge-viewer', 'conn-badge-entry'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
}

// ==========================================================================
// ยูทิลิตี้ทั่วไป
// ==========================================================================
function showMsg(el, text, type) {
  el.innerHTML = `<div class="msg ${type}">${text}</div>`;
  if (type === 'ok') setTimeout(() => { el.innerHTML = ''; }, 3500);
}

function showPage(id) {
  ['page-landing','page-login','page-viewer','page-entry'].forEach(p => {
    document.getElementById(p).style.display = (p === id) ? 'block' : 'none';
  });
}

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(from + (to - from) * eased);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ==========================================================================
// Modal (ยืนยันการบันทึก / ดูรายละเอียดคะแนนที่ถูกหัก)
// ==========================================================================
function openModal(html) {
  document.getElementById('modal-card').innerHTML = html;
  document.getElementById('modal-overlay').style.display = 'flex';
}
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});

function scoreColor(total) {
  return total < 0 ? '#d64545' : total < 60 ? '#b17600' : '#1479c9';
}

// รวมคะแนนที่ถูกหักแยกตามหัวข้อ จากหลายการตรวจ (ใช้สรุปปัญหารายสัปดาห์)
function summarizeDeductions(recs) {
  const totals = {};
  CRITERIA.forEach(c => { totals[c.key] = 0; });
  let severityTotal = 0;
  recs.forEach(r => {
    CRITERIA.forEach(c => {
      const lvl = r.selections && r.selections[c.key];
      if (lvl) totals[c.key] += c.pts[lvl - 1];
    });
    if (r.severity) {
      const sev = SEVERITY.find(s => s.value === r.severity.level);
      if (sev) severityTotal += sev.pts;
    }
  });
  const items = CRITERIA
    .map(c => ({ icon: c.icon, label: c.label, total: totals[c.key] }))
    .filter(x => x.total > 0);
  if (severityTotal > 0) items.push({ icon: '⚠️', label: 'กรณีพิเศษ', total: severityTotal });
  items.sort((a, b) => b.total - a.total);
  return items;
}

// สร้างแถวรายละเอียดคะแนนที่ถูกหักของ 1 การตรวจ (ใช้ทั้งตอนยืนยันบันทึก และตอนดูย้อนหลัง)
function buildBreakdownRowsHtml(record) {
  let rows = '';
  CRITERIA.forEach(c => {
    const lvl = record.selections[c.key];
    if (!lvl) return;
    const pts = c.pts[lvl - 1];
    rows += `
      <div class="modal-breakdown-row">
        <div>
          <div class="mb-label">${c.icon} ${c.label}</div>
          <div class="mb-sub">ระดับ ${lvl} - ${c.levels[lvl - 1]}</div>
        </div>
        <div class="mb-pts ${pts === 0 ? 'zero' : 'neg'}">${pts === 0 ? '0' : '-' + pts}</div>
      </div>
    `;
  });
  if (record.severity) {
    const sev = SEVERITY.find(s => s.value === record.severity.level);
    rows += `
      <div class="modal-breakdown-row" style="display:block;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div class="mb-label">⚠️ กรณีพิเศษ: ${sev ? sev.label : ''}</div>
            <div class="mb-sub">${record.severity.remark || ''}</div>
          </div>
          <div class="mb-pts neg">-${sev ? sev.pts : 0}</div>
        </div>
        ${record.severity.photo ? `<img src="${record.severity.photo}" class="photo-thumb" style="margin-top:8px;" onclick="window.open('${record.severity.photo}','_blank')">` : ''}
      </div>
    `;
  }
  return rows;
}

function buildRecordBlockHtml(record) {
  return `
    <div class="modal-record-block">
      <div class="modal-record-meta">
        ${record.date} ${record.inspector ? '&middot; ผู้ตรวจ: ' + record.inspector : ''}
      </div>
      ${buildBreakdownRowsHtml(record)}
      <div class="modal-total-line">
        <span>คะแนนรวม</span>
        <span style="color:${scoreColor(record.total)}">${record.total}</span>
      </div>
    </div>
  `;
}

function showRecordListModal(title, subtitle, records) {
  const html = `
    <button class="modal-close-x" onclick="closeModal()">✕</button>
    <h2>${title}</h2>
    <div class="modal-sub">${subtitle}</div>
    ${records.map(buildRecordBlockHtml).join('')}
  `;
  openModal(html);
}

// โมดัลดูรายละเอียดแบบเลือกวันที่ (ใช้กับค่าเฉลี่ยรายสัปดาห์ ที่อาจมีหลายวันในสัปดาห์เดียว)
function showRecordDetailByDate(title, records) {
  const byDate = {};
  records.forEach(r => { (byDate[r.date] = byDate[r.date] || []).push(r); });
  const dates = Object.keys(byDate).sort().reverse();
  let selectedDate = dates[0];

  function render() {
    const pills = dates.map(d => `<button type="button" class="date-pill ${d === selectedDate ? 'active' : ''}" data-date="${d}">${d}</button>`).join('');
    const recs = byDate[selectedDate];
    const html = `
      <button class="modal-close-x" onclick="closeModal()">✕</button>
      <h2>${title}</h2>
      <div class="date-pill-row">${pills}</div>
      ${recs.map(buildRecordBlockHtml).join('')}
    `;
    openModal(html);
    document.querySelectorAll('.date-pill').forEach(p => {
      p.addEventListener('click', () => { selectedDate = p.dataset.date; render(); });
    });
  }
  render();
}

// ==========================================================================
// การนำทางหน้า
// ==========================================================================
let isLoggedInInspector = false;

document.getElementById('btn-go-viewer').addEventListener('click', () => {
  showPage('page-viewer');
  loadDaily();
  loadWeekly();
});
document.getElementById('viewer-back').addEventListener('click', () => {
  showPage(isLoggedInInspector ? 'page-entry' : 'page-landing');
});
document.getElementById('btn-go-login').addEventListener('click', () => {
  document.getElementById('login-password').value = '';
  document.getElementById('login-msg').innerHTML = '';
  showPage('page-login');
});
document.getElementById('login-cancel').addEventListener('click', () => showPage('page-landing'));

document.getElementById('btn-donate').addEventListener('click', () => {
  const html = `
    <button class="modal-close-x" onclick="closeModal()">✕</button>
    <div class="donate-hero">
      <div class="donate-emoji">🍪</div>
      <h2 class="donate-title">บริจาคค่าขนมให้สภานักเรียน</h2>
      <p class="donate-msg">ทุกบาทที่ร่วมบริจาค ช่วยให้สภานักเรียนดูแลความสะอาดและซ่อมแซมอุปกรณ์ในห้องเรียนให้เพื่อนๆ ได้นะ 💙</p>
    </div>

    <div class="donate-qr-card">
      <img src="assets/donate-qr.png" alt="QR Code รับบริจาค" class="donate-qr-img">
    </div>

    <div class="donate-dua">
      <div class="donate-dua-arabic">بَارَكَ اللهُ لَكَ فِي أَهْلِكَ وَمَالِكَ</div>
      <div class="donate-dua-translate">(ขออัลลอฮ์ทรงประทานความบารากะฮ์ (ความจำเริญ) ให้แก่ครอบครัวและทรัพย์สินของท่าน)</div>
    </div>

    <div class="donate-info">
      <div class="donate-info-row">
        <span><img src="assets/logo-krungthai.png" class="donate-bank-icon" alt="กรุงไทย">ธนาคาร</span>
        <b>กรุงไทย</b>
      </div>
      <div class="donate-info-row"><span>เลขบัญชี</span><b>663-2-43414-2</b></div>
      <div class="donate-info-row"><span>ชื่อบัญชี</span><b>เงินบริจาคเพื่อโรงเรียนดารุสสลามวิทยา</b></div>
    </div>
    <p class="donate-tax-note">💡 บริจาคผ่านระบบ e-Donation นี้ สามารถนำไปใช้ลดหย่อนภาษีได้ด้วยนะ</p>
    <button class="primary donate-copy-btn" id="copy-acc-btn" style="width:100%; margin-top:4px;">📋 คัดลอกเลขบัญชี</button>
  `;
  openModal(html);
  document.getElementById('copy-acc-btn').addEventListener('click', () => {
    const btn = document.getElementById('copy-acc-btn');
    navigator.clipboard.writeText('663-2-43414-2').then(() => {
      btn.textContent = '✅ คัดลอกเลขบัญชีแล้ว';
      setTimeout(() => { btn.textContent = '📋 คัดลอกเลขบัญชี'; }, 2000);
    }).catch(() => {
      btn.textContent = 'คัดลอกไม่สำเร็จ ลองคัดลอกด้วยตัวเองนะ';
    });
  });
});

document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  });
});

async function getStoredPassword() {
  try {
    const res = await storage.get(PW_KEY);
    return res ? res.value : DEFAULT_PASSWORD;
  } catch (e) {
    return DEFAULT_PASSWORD;
  }
}

document.getElementById('login-submit').addEventListener('click', async () => {
  const entered = document.getElementById('login-password').value;
  const msgEl = document.getElementById('login-msg');
  const correct = await getStoredPassword();
  if (entered === correct) {
    isLoggedInInspector = true;
    showPage('page-entry');
    showEntryTab('form');
  } else {
    showMsg(msgEl, 'รหัสผ่านไม่ถูกต้อง', 'err');
  }
});

document.getElementById('entry-logout').addEventListener('click', () => {
  isLoggedInInspector = false;
  showPage('page-landing');
});

document.getElementById('entry-check-scores').addEventListener('click', () => {
  showPage('page-viewer');
  loadDaily();
  loadWeekly();
});

document.getElementById('pw-submit').addEventListener('click', async () => {
  const cur = document.getElementById('pw-current').value;
  const next = document.getElementById('pw-new').value;
  const msgEl = document.getElementById('pw-msg');
  const correct = await getStoredPassword();
  if (cur !== correct) {
    showMsg(msgEl, 'รหัสผ่านปัจจุบันไม่ถูกต้อง', 'err');
    return;
  }
  if (!next || next.length < 4) {
    showMsg(msgEl, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร', 'err');
    return;
  }
  try {
    await storage.set(PW_KEY, next);
    showMsg(msgEl, 'เปลี่ยนรหัสผ่านเรียบร้อย', 'ok');
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value = '';
  } catch (e) {
    showMsg(msgEl, 'บันทึกไม่สำเร็จ กรุณาลองใหม่', 'err');
  }
});

document.querySelectorAll('.subtab[data-vtab]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.subtab[data-vtab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('vpanel-daily').style.display = tab.dataset.vtab === 'daily' ? 'block' : 'none';
    document.getElementById('vpanel-weekly').style.display = tab.dataset.vtab === 'weekly' ? 'block' : 'none';
  });
});

function showEntryTab(tab) {
  document.querySelectorAll('.subtab[data-etab]').forEach(t => t.classList.toggle('active', t.dataset.etab === tab));
  document.getElementById('epanel-form').style.display = tab === 'form' ? 'block' : 'none';
  document.getElementById('epanel-mine').style.display = tab === 'mine' ? 'block' : 'none';
  document.getElementById('epanel-pw').style.display = tab === 'pw' ? 'block' : 'none';
  if (tab === 'mine') loadHistory();
}
document.querySelectorAll('.subtab[data-etab]').forEach(tab => {
  tab.addEventListener('click', () => showEntryTab(tab.dataset.etab));
});

// ==========================================================================
// แบบฟอร์มกรอกข้อมูล
// ==========================================================================
function buildGradeOptions() {
  const sel = document.getElementById('grade');
  sel.innerHTML = GRADE_GROUPS.map(group => `
    <optgroup label="${group.label}">
      ${group.grades.map(g => `<option value="${g}">${g}</option>`).join('')}
    </optgroup>
  `).join('');
}

function updateTeacherHint() {
  const grade = document.getElementById('grade').value;
  const room = document.getElementById('room').value;
  const code = `${grade}/${room}`;
  const names = teacherNamesFor(code);
  const el = document.getElementById('teacher-hint');
  if (names) {
    el.textContent = `👩‍🏫 ครูประจำชั้น ${code}: ${names}`;
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}
document.getElementById('grade').addEventListener('change', updateTeacherHint);
document.getElementById('room').addEventListener('change', updateTeacherHint);

function buildCriteria() {
  const container = document.getElementById('criteria-container');
  container.innerHTML = CRITERIA.map(c => `
    <div class="card">
      <p class="crit-title"><span class="crit-icon">${c.icon}</span>${c.label}</p>
      <div class="levels" data-key="${c.key}">
        ${c.levels.map((lv, i) => `
          <label class="level-opt" data-key="${c.key}" data-level="${i+1}">
            <span class="level-label"><input type="radio" name="${c.key}" value="${i+1}"> ระดับ ${i+1} - ${lv}</span>
            <span class="level-pts">-${c.pts[i]}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.level-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const key = opt.dataset.key;
      const level = parseInt(opt.dataset.level);
      state.selections[key] = level;
      const radio = opt.querySelector('input');
      radio.checked = true;
      container.querySelectorAll(`.level-opt[data-key="${key}"]`).forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      updateScore();
    });
  });

  const sevContainer = document.getElementById('severity-levels');
  sevContainer.innerHTML = SEVERITY.map(s => `
    <label class="level-opt" data-level="${s.value}">
      <span class="level-label"><input type="radio" name="severity" value="${s.value}"> ระดับ ${s.value} - ${s.label}</span>
      <span class="level-pts">-${s.pts}</span>
    </label>
  `).join('');
  sevContainer.querySelectorAll('.level-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const remark = document.getElementById('severity-remark').value.trim();
      if (!remark) {
        showMsg(document.getElementById('msg-area'), 'กรุณากรอกหมายเหตุก่อนเลือกระดับความรุนแรง', 'err');
        return;
      }
      state.severityLevel = parseInt(opt.dataset.level);
      sevContainer.querySelectorAll('.level-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
      updateScore();
    });
  });
}

let lastScoreValue = 100;

function updateScoreRing(total) {
  const ring = document.getElementById('score-ring');
  const pct = Math.max(0, Math.min(100, total));
  const color = total < 0 ? 'var(--danger)' : total < 60 ? '#b17600' : 'var(--primary)';
  ring.style.background = `conic-gradient(${color} ${pct}%, var(--border) 0)`;
}

function updateScore() {
  let deduction = 0;
  let parts = [];
  CRITERIA.forEach(c => {
    const lvl = state.selections[c.key];
    if (lvl) {
      const p = c.pts[lvl - 1];
      deduction += p;
      if (p > 0) parts.push(`${c.label} -${p}`);
    }
  });
  const sevEnabled = document.getElementById('severity-enable').checked;
  if (sevEnabled && state.severityLevel) {
    const sev = SEVERITY.find(s => s.value === state.severityLevel);
    deduction += sev.pts;
    parts.push(`กรณีพิเศษ (${sev.label}) -${sev.pts}`);
  }
  const total = 100 - deduction;
  const scoreEl = document.getElementById('score-total');
  animateNumber(scoreEl, lastScoreValue, total, 260);
  lastScoreValue = total;
  scoreEl.className = 'score-num ' + (total < 0 ? 'neg' : total < 60 ? 'mid' : 'good');
  updateScoreRing(total);
  document.getElementById('score-breakdown').textContent = parts.length ? parts.join(' | ') : 'ยังไม่มีการหักคะแนน';
  return total;
}

// ---------------- แนบรูปภาพประกอบกรณีพิเศษ ----------------
function resizeImageFile(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderPhotoPreview() {
  const el = document.getElementById('severity-photo-preview');
  if (!state.severityPhoto) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="photo-thumb-wrap">
      <img src="${state.severityPhoto}" class="photo-thumb" onclick="window.open('${state.severityPhoto}','_blank')">
      <button type="button" class="photo-remove" id="photo-remove-btn">✕</button>
    </div>
  `;
  document.getElementById('photo-remove-btn').addEventListener('click', () => {
    state.severityPhoto = null;
    document.getElementById('severity-photo-input').value = '';
    renderPhotoPreview();
  });
}

document.getElementById('severity-photo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    state.severityPhoto = await resizeImageFile(file, 800, 0.7);
    renderPhotoPreview();
  } catch (err) {
    showMsg(document.getElementById('msg-area'), 'ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาลองใหม่', 'err');
  }
});

document.getElementById('severity-enable').addEventListener('change', (e) => {
  document.getElementById('severity-fields').style.display = e.target.checked ? 'block' : 'none';
  if (!e.target.checked) {
    state.severityLevel = null;
    state.severityPhoto = null;
    document.getElementById('severity-remark').value = '';
    document.getElementById('severity-photo-input').value = '';
    renderPhotoPreview();
    document.querySelectorAll('#severity-levels .level-opt').forEach(o => o.classList.remove('selected'));
  }
  updateScore();
});

function resetFormAfterSave() {
  state.selections = {};
  state.severityLevel = null;
  state.severityPhoto = null;
  document.querySelectorAll('#criteria-container .level-opt').forEach(o => o.classList.remove('selected'));
  document.querySelectorAll('#criteria-container input[type=radio]').forEach(r => { r.checked = false; });
  document.getElementById('severity-enable').checked = false;
  document.getElementById('severity-fields').style.display = 'none';
  document.getElementById('severity-remark').value = '';
  document.getElementById('severity-photo-input').value = '';
  renderPhotoPreview();
  document.querySelectorAll('#severity-levels .level-opt').forEach(o => o.classList.remove('selected'));
  updateScore();
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const msgArea = document.getElementById('msg-area');
  const missing = CRITERIA.filter(c => !state.selections[c.key]);
  if (missing.length) {
    showMsg(msgArea, 'กรุณาเลือกระดับให้ครบทุกหัวข้อ: ' + missing.map(m => m.label).join(', '), 'err');
    return;
  }
  const sevEnabled = document.getElementById('severity-enable').checked;
  const remark = document.getElementById('severity-remark').value.trim();
  if (sevEnabled && (!remark || !state.severityLevel)) {
    showMsg(msgArea, 'กรณีพิเศษต้องกรอกหมายเหตุและเลือกระดับความรุนแรงให้ครบ', 'err');
    return;
  }
  const grade = document.getElementById('grade').value;
  const room = document.getElementById('room').value;
  const date = document.getElementById('date').value || new Date().toISOString().slice(0,10);
  const inspector = document.getElementById('inspector').value.trim();
  const total = updateScore();
  const record = {
    grade, room, date, inspector,
    selections: { ...state.selections },
    severity: sevEnabled ? { level: state.severityLevel, remark, photo: state.severityPhoto || null } : null,
    total,
    savedAt: Date.now()
  };

  // แสดงหน้ายืนยันก่อนบันทึกจริง
  const confirmHtml = `
    <button class="modal-close-x" onclick="closeModal()">✕</button>
    <h2>ยืนยันการบันทึก?</h2>
    <div class="modal-sub">ห้อง ${grade}/${room} &middot; วันที่ ${date}${inspector ? ' &middot; ผู้ตรวจ: ' + inspector : ''}</div>
    ${buildBreakdownRowsHtml(record)}
    <div class="modal-total-line">
      <span>คะแนนรวม</span>
      <span style="color:${scoreColor(total)}">${total}</span>
    </div>
    <div class="modal-actions">
      <button class="ghost" id="modal-edit-more" style="flex:1;">แก้ไขต่อ</button>
      <button class="primary" id="modal-confirm-save" style="flex:1;">ยืนยันบันทึก</button>
    </div>
  `;
  openModal(confirmHtml);

  document.getElementById('modal-edit-more').addEventListener('click', closeModal);
  document.getElementById('modal-confirm-save').addEventListener('click', async () => {
    const key = `eval:${grade}-${room}:${record.savedAt}`;
    const confirmBtn = document.getElementById('modal-confirm-save');
    confirmBtn.textContent = 'กำลังบันทึก...';
    confirmBtn.disabled = true;
    try {
      const res = await storage.set(key, JSON.stringify(record));
      if (!res) throw new Error('save failed');
      openModal(`
        <div class="success-check">✓</div>
        <div class="success-title">ยืนยันสำเร็จ</div>
        <div class="success-sub">บันทึกผลการตรวจห้อง ${grade}/${room} เรียบร้อยแล้ว (คะแนน ${total})</div>
        <button class="primary" style="width:100%;" onclick="closeModal()">ตกลง</button>
      `);
      resetFormAfterSave();
    } catch (err) {
      openModal(`
        <button class="modal-close-x" onclick="closeModal()">✕</button>
        <h2>บันทึกไม่สำเร็จ</h2>
        <div class="modal-sub">กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง</div>
        <button class="primary" style="width:100%;" onclick="closeModal()">ปิด</button>
      `);
    }
  });
});

// ==========================================================================
// ประวัติ / จัดการ (ฝั่งผู้ตรวจ)
// ==========================================================================
async function loadAllRecords() {
  try {
    const listRes = await storage.list('eval:');
    const keys = listRes ? listRes.keys : [];
    const records = [];
    for (const k of keys) {
      try {
        const r = await storage.get(k);
        if (r) records.push({ key: k, ...JSON.parse(r.value) });
      } catch (e) {}
    }
    records.sort((a, b) => b.savedAt - a.savedAt);
    return records;
  } catch (e) {
    return [];
  }
}

async function loadHistory() {
  const container = document.getElementById('history-container');
  container.innerHTML = '<div class="empty">กำลังโหลด...</div>';
  const records = await loadAllRecords();
  if (!records.length) {
    container.innerHTML = '<div class="empty">ยังไม่มีข้อมูลการตรวจ</div>';
    return;
  }
  container.innerHTML = `
    <div class="table-scroll">
    <table>
      <thead><tr><th>ห้อง</th><th>วันที่</th><th>ผู้ตรวจ</th><th>คะแนน</th><th></th></tr></thead>
      <tbody>
        ${records.map(r => `
          <tr>
            <td>${r.grade}/${r.room}</td>
            <td>${r.date}</td>
            <td>${r.inspector || '-'}</td>
            <td class="score-cell" style="color:${scoreColor(r.total)}">${r.total}</td>
            <td><button class="ghost" data-key="${r.key}">ลบ</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    </div>
  `;
  container.querySelectorAll('button.ghost').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await storage.delete(btn.dataset.key);
        loadHistory();
      } catch (e) {}
    });
  });
}

// ==========================================================================
// ภาพรวมรายวัน (สาธารณะ)
// ==========================================================================
document.getElementById('daily-date').addEventListener('change', loadDaily);

async function loadDaily() {
  const dateInput = document.getElementById('daily-date');
  if (!dateInput.value) dateInput.value = new Date().toISOString().slice(0,10);
  const targetDate = dateInput.value;
  const container = document.getElementById('daily-grid-container');
  container.innerHTML = '<div class="empty">กำลังโหลด...</div>';
  const records = await loadAllRecords();
  const dayRecords = records.filter(r => r.date === targetDate);
  const byRoom = {};
  dayRecords.forEach(r => {
    const code = `${r.grade}/${r.room}`;
    if (!byRoom[code]) byRoom[code] = [];
    byRoom[code].push(r);
  });
  function renderChip(code) {
    const recs = byRoom[code];
    const avg = recs ? Math.round(recs.reduce((a,b)=>a+b.total,0) / recs.length) : null;
    const color = avg === null ? '#6c7f8e' : scoreColor(avg);
    const hlClass = avg === null ? '' : 'hl-' + classifyLevel(avg).cls;
    const teacher = teacherNamesFor(code);
    return `
      <div class="room-chip ${recs ? 'clickable' : ''} ${hlClass}" data-code="${code}">
        <div class="rname">${code}</div>
        ${teacher ? `<div class="rteacher">${teacher}</div>` : ''}
        <div class="rscore" style="color:${color}">${avg === null ? '-' : avg}</div>
        <div class="rdate">${avg === null ? 'ไม่มีการตรวจ' : (recs.length > 1 ? recs.length + ' ครั้ง' : '1 ครั้ง')}</div>
        ${recs ? '<div class="rhint">แตะดูรายละเอียด</div>' : ''}
      </div>
    `;
  }

  container.innerHTML = GRADE_GROUPS.map(group => `
    <div class="grade-group">
      <div class="grade-group-title">${group.label}</div>
      <div class="summary-grid">${roomCodesForGroup(group).map(renderChip).join('')}</div>
    </div>
  `).join('');

  container.querySelectorAll('.room-chip.clickable').forEach(chip => {
    chip.addEventListener('click', () => {
      const code = chip.dataset.code;
      const recs = byRoom[code];
      showRecordListModal(
        `รายละเอียดคะแนน ห้อง ${code}`,
        `วันที่ ${targetDate} &middot; ตรวจทั้งหมด ${recs.length} ครั้ง`,
        recs
      );
    });
  });
}

// ==========================================================================
// ค่าเฉลี่ยรายสัปดาห์ + จัดระดับ (สาธารณะ)
// ==========================================================================
function getISOWeekInfo(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (x) => `${x.getDate().toString().padStart(2,'0')}/${(x.getMonth()+1).toString().padStart(2,'0')}`;
  return {
    key: `${target.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`,
    label: `สัปดาห์ที่ ${weekNo} (${fmt(monday)} - ${fmt(sunday)}/${sunday.getFullYear()})`
  };
}

function classifyLevel(avg) {
  if (avg >= 90) return { label: 'ผ่านเกณฑ์ดีเยี่ยม', cls: 'excellent' };
  if (avg >= 75) return { label: 'ผ่านเกณฑ์', cls: 'pass' };
  if (avg >= 50) return { label: 'ควรปรับปรุง', cls: 'improve' };
  return { label: 'ต้องปรับปรุงโดยด่วน', cls: 'urgent' };
}

let weeklyGroupsCache = {};

async function loadWeekly() {
  const records = await loadAllRecords();
  const groups = {};
  records.forEach(r => {
    const info = getISOWeekInfo(r.date);
    if (!groups[info.key]) groups[info.key] = { label: info.label, rooms: {} };
    const code = `${r.grade}/${r.room}`;
    if (!groups[info.key].rooms[code]) groups[info.key].rooms[code] = [];
    groups[info.key].rooms[code].push(r);
  });
  weeklyGroupsCache = groups;
  const weekSelect = document.getElementById('week-select');
  const keys = Object.keys(groups).sort().reverse();
  const prevSelected = weekSelect.value;
  if (!keys.length) {
    weekSelect.innerHTML = '<option value="">ยังไม่มีข้อมูล</option>';
    renderWeekly(null);
    return;
  }
  weekSelect.innerHTML = keys.map(k => `<option value="${k}">${groups[k].label}</option>`).join('');
  weekSelect.value = keys.includes(prevSelected) ? prevSelected : keys[0];
  renderWeekly(weekSelect.value);
}
document.getElementById('week-select').addEventListener('change', (e) => renderWeekly(e.target.value));

function renderWeekly(weekKey) {
  const legendEl = document.getElementById('weekly-legend');
  const tableEl = document.getElementById('weekly-table-container');
  const issuesContainer = document.getElementById('weekly-issues-container');
  const issuesList = document.getElementById('weekly-issues-list');
  if (!weekKey || !weeklyGroupsCache[weekKey]) {
    legendEl.innerHTML = '';
    tableEl.innerHTML = '<div class="empty">ยังไม่มีข้อมูลการตรวจในสัปดาห์นี้</div>';
    issuesContainer.style.display = 'none';
    return;
  }
  const group = weeklyGroupsCache[weekKey];
  const counts = { excellent: 0, pass: 0, improve: 0, urgent: 0 };
  const rows = ROOM_CODES.map(code => {
    const recs = group.rooms[code];
    if (!recs) return { code, avg: null };
    const avg = Math.round(recs.reduce((a,b)=>a+b.total,0) / recs.length);
    return { code, avg, count: recs.length, recs };
  });
  rows.forEach(r => { if (r.avg !== null) counts[classifyLevel(r.avg).cls]++; });

  const ranked = rows.filter(r => r.avg !== null).slice().sort((a, b) => b.avg - a.avg);
  const rankMap = {};
  ranked.slice(0, 3).forEach((r, idx) => { rankMap[r.code] = idx + 1; });
  const rankMedal = { 1: '🥇', 2: '🥈', 3: '🥉' };

  legendEl.innerHTML = `
    <div class="legend-item"><div class="lcount" style="color:#1a8f4c;">${counts.excellent}</div><div>ผ่านเกณฑ์ดีเยี่ยม</div></div>
    <div class="legend-item"><div class="lcount" style="color:#1479c9;">${counts.pass}</div><div>ผ่านเกณฑ์</div></div>
    <div class="legend-item"><div class="lcount" style="color:#b17600;">${counts.improve}</div><div>ควรปรับปรุง</div></div>
    <div class="legend-item"><div class="lcount" style="color:#d64545;">${counts.urgent}</div><div>ต้องปรับปรุงโดยด่วน</div></div>
  `;

  tableEl.innerHTML = `
    <div class="table-scroll">
    <table>
      <thead><tr><th>ห้อง</th><th>ครูประจำชั้น</th><th>จำนวนครั้งที่ตรวจ</th><th>คะแนนเฉลี่ย</th><th>ระดับ</th></tr></thead>
      <tbody>
        ${rows.map(r => {
          const teacher = teacherNamesFor(r.code);
          if (r.avg === null) return `<tr><td>${r.code}</td><td class="teacher-col">${teacher}</td><td>-</td><td>-</td><td style="color:var(--text-muted);">ไม่มีข้อมูล</td></tr>`;
          const lvl = classifyLevel(r.avg);
          const rank = rankMap[r.code];
          return `
            <tr class="clickable-row" data-code="${r.code}">
              <td>${r.code}</td>
              <td class="teacher-col">${teacher}</td>
              <td>${r.count}</td>
              <td class="score-cell">${r.avg}</td>
              <td><span class="badge ${lvl.cls}">${lvl.label}</span>${rank ? `<span class="rank-badge r${rank}">${rankMedal[rank]} อันดับ ${rank}</span>` : ''}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    </div>
  `;

  tableEl.querySelectorAll('tr.clickable-row').forEach(row => {
    row.addEventListener('click', () => {
      const code = row.dataset.code;
      const r = rows.find(x => x.code === code);
      if (!r || !r.recs) return;
      showRecordDetailByDate(`รายละเอียดคะแนน ห้อง ${code}`, r.recs);
    });
  });

  // สรุปหัวข้อที่ถูกหักคะแนนของแต่ละห้อง (รวมทั้งสัปดาห์)
  const issueRooms = rows
    .filter(r => r.recs && r.recs.length)
    .map(r => ({ code: r.code, items: summarizeDeductions(r.recs) }))
    .filter(r => r.items.length > 0)
    .sort((a, b) => {
      const sumA = a.items.reduce((s, i) => s + i.total, 0);
      const sumB = b.items.reduce((s, i) => s + i.total, 0);
      return sumB - sumA;
    });

  if (issueRooms.length) {
    issuesContainer.style.display = 'block';
    issuesList.innerHTML = issueRooms.map(r => {
      const teacher = teacherNamesFor(r.code);
      return `
        <div class="issue-room-block">
          <div class="issue-room-head">
            <span class="issue-room-name">${r.code}</span>
            ${teacher ? `<span class="issue-room-teacher">${teacher}</span>` : ''}
          </div>
          <div class="issue-tags">
            ${r.items.map(i => `<span class="issue-tag">${i.icon} ${i.label} <b>-${i.total}</b></span>`).join('')}
          </div>
        </div>
      `;
    }).join('');
  } else {
    issuesContainer.style.display = 'none';
  }
}

function updateHeroDate() {
  const el = document.getElementById('hero-date');
  if (!el) return;
  try {
    const formatter = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    el.textContent = '📅 ' + formatter.format(new Date());
  } catch (e) {
    el.textContent = '';
  }
}

// ==========================================================================
// เริ่มต้นแอป
// ==========================================================================
initStorage();
buildGradeOptions();
buildCriteria();
document.getElementById('date').value = new Date().toISOString().slice(0,10);
document.getElementById('daily-date').value = new Date().toISOString().slice(0,10);
updateScore();
updateTeacherHint();
updateHeroDate();
showPage('page-landing');
