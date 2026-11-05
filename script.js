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

const state = { selections: {}, severityLevel: null, severityPhoto: null, editingKey: null, editingSavedAt: null };

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

// ==========================================================================
// คิวสำรอง กันข้อมูลหายตอนเน็ตหลุดขณะบันทึก
// ==========================================================================
const PENDING_KEY = 'pending-queue-v1';

function getPendingQueue() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch (e) { return []; }
}
function setPendingQueue(q) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(q)); } catch (e) {}
}

async function safeStorageSet(key, value) {
  try {
    const res = await storage.set(key, value);
    if (!res) throw new Error('save failed');
    return { ok: true };
  } catch (e) {
    const q = getPendingQueue();
    q.push({ key, value, queuedAt: Date.now() });
    setPendingQueue(q);
    updatePendingBadge();
    return { ok: false, queued: true };
  }
}

async function flushPendingQueue() {
  const q = getPendingQueue();
  if (!q.length || !USE_FIREBASE) return;
  const remaining = [];
  let succeeded = 0;
  for (const item of q) {
    try {
      const res = await storage.set(item.key, item.value);
      if (!res) throw new Error('fail');
      succeeded++;
    } catch (e) {
      remaining.push(item);
    }
  }
  setPendingQueue(remaining);
  updatePendingBadge();
  if (succeeded > 0) {
    if (document.getElementById('epanel-mine') && document.getElementById('epanel-mine').style.display !== 'none') loadHistory();
  }
}

function updatePendingBadge() {
  const q = getPendingQueue();
  const badge = document.getElementById('pending-badge');
  if (!badge) return;
  if (q.length > 0) {
    badge.style.display = 'inline-flex';
    badge.textContent = `⏳ รอส่งขึ้นฐานข้อมูล ${q.length} รายการ`;
  } else {
    badge.style.display = 'none';
  }
}

window.addEventListener('online', flushPendingQueue);
setInterval(flushPendingQueue, 30000);

function renderConnBadges() {
  const html = USE_FIREBASE
    ? `<span class="conn-badge online"><span class="conn-dot online"></span>เชื่อมต่อฐานข้อมูลกลาง</span>`
    : `<span class="conn-badge offline"><span class="conn-dot"></span>โหมดออฟไลน์ (เก็บเฉพาะเครื่องนี้)</span>`;
  ['conn-badge-viewer', 'conn-badge-entry'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
  updateHeroStatusLine();
}

let lastKnownUpdateTime = null;

function updateHeroStatusLine(recordsForTime) {
  const el = document.getElementById('hero-status-line');
  if (!el) return;
  const statusHtml = USE_FIREBASE
    ? `<span><span class="hs-dot"></span>ระบบออนไลน์</span>`
    : `<span><span class="hs-dot offline"></span>โหมดออฟไลน์</span>`;
  let timeText = 'กำลังโหลด...';
  if (recordsForTime) {
    const latest = recordsForTime.reduce((max, r) => Math.max(max, r.savedAt || 0), 0);
    lastKnownUpdateTime = latest || null;
  }
  if (lastKnownUpdateTime) {
    const d = new Date(lastKnownUpdateTime);
    const dateText = d.toLocaleDateString('th-TH-u-ca-buddhist', { day: 'numeric', month: 'short' });
    const timePart = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    timeText = `อัปเดตล่าสุด วันที่ ${dateText} เวลา ${timePart} น.`;
  } else if (recordsForTime) {
    timeText = 'ยังไม่มีข้อมูล';
  }
  el.innerHTML = `${statusHtml}<span>${timeText}</span>`;
}

// ==========================================================================
// ยูทิลิตี้ทั่วไป
// ==========================================================================
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function showMsg(el, text, type) {
  el.innerHTML = `<div class="msg ${type}">${text}</div>`;
  if (type === 'ok') setTimeout(() => { el.innerHTML = ''; }, 3500);
}

function showPage(id) {
  ['page-landing','page-login','page-viewer','page-entry'].forEach(p => {
    document.getElementById(p).style.display = (p === id) ? 'block' : 'none';
  });
  if (id === 'page-landing') { loadLandingSummary(); loadLandingRoster(); }
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

// ---------------- เสียง/สั่น ตอนบันทึกสำเร็จ ----------------
function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}

function playTone(freqStart, freqEnd, duration, volume) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch (e) {}
}

function playSuccessFeedback() {
  vibrate(60);
  playTone(880, 1320, 0.22, 0.15);
}

function playQueuedFeedback() {
  vibrate([40, 60, 40]);
  playTone(660, 520, 0.28, 0.12);
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
            <div class="mb-sub">${esc(record.severity.remark)}</div>
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
        ${record.date} ${record.inspector ? '&middot; ผู้ตรวจ: ' + esc(record.inspector) : ''}${record.substitute ? ' <span class="sub-badge">แทน' + (record.substituteFor && record.substituteFor.length ? ' ' + record.substituteFor.map(esc).join(', ') : '') + '</span>' : ''}
      </div>
      ${buildBreakdownRowsHtml(record)}
      <div class="modal-total-line">
        <span>คะแนนรวม</span>
        <span style="color:${scoreColor(record.total)}">${record.total}</span>
      </div>
    </div>
  `;
}

// โมดัลรายละเอียดห้อง: กราฟคะแนนย้อนหลังทั้งหมด + เลือกวันที่ดูรายละเอียดการหักคะแนน
async function openRoomDetailModal(code, contextRecords, contextLabel) {
  openModal(`<div class="empty">กำลังโหลด...</div>`);
  const allRecords = await loadAllRecords();
  const roomHistory = allRecords
    .filter(r => `${r.grade}/${r.room}` === code)
    .sort((a, b) => a.savedAt - b.savedAt);

  const byDate = {};
  contextRecords.forEach(r => { (byDate[r.date] = byDate[r.date] || []).push(r); });
  const dates = Object.keys(byDate).sort().reverse();
  let selectedDate = dates[0];
  let activeTab = 'daily';
  const teacher = teacherNamesFor(code);

  function renderDailyTab() {
    const pills = dates.map(d => `<button type="button" class="date-pill ${d === selectedDate ? 'active' : ''}" data-date="${d}">${d}</button>`).join('');
    const recs = byDate[selectedDate];
    return `
      <div class="date-pill-row">${pills}</div>
      ${recs.map(buildRecordBlockHtml).join('')}
    `;
  }

  function renderAnalysisTab() {
    if (roomHistory.length < 2) {
      return `<div class="empty">ข้อมูลยังไม่พอสำหรับวิเคราะห์ (ต้องมีอย่างน้อย 2 ครั้ง)</div>`;
    }
    const totals = roomHistory.map(r => r.total);
    const avgAll = Math.round(totals.reduce((a,b)=>a+b,0) / totals.length);
    const maxScore = Math.max(...totals);
    const minScore = Math.min(...totals);

    const mid = Math.ceil(roomHistory.length / 2);
    const firstHalf = totals.slice(0, mid);
    const secondHalf = totals.slice(mid);
    const firstAvg = firstHalf.reduce((a,b)=>a+b,0) / firstHalf.length;
    const secondAvg = secondHalf.length ? secondHalf.reduce((a,b)=>a+b,0) / secondHalf.length : firstAvg;
    const diff = Math.round(secondAvg - firstAvg);

    let trendCls = 'flat', trendIcon = '➖', trendText = 'คะแนนค่อนข้างคงที่';
    if (diff >= 4) { trendCls = 'up'; trendIcon = '📈'; trendText = `คะแนนมีแนวโน้มดีขึ้น (+${diff} คะแนนเทียบช่วงก่อนหน้า)`; }
    else if (diff <= -4) { trendCls = 'down'; trendIcon = '📉'; trendText = `คะแนนมีแนวโน้มแย่ลง (${diff} คะแนนเทียบช่วงก่อนหน้า)`; }

    const issues = summarizeDeductions(roomHistory).slice(0, 3);
    const recommendText = issues.length
      ? `ควรเน้นแก้ไขเรื่อง "${issues[0].label}" เป็นพิเศษ เพราะเป็นสาเหตุหลักที่ทำให้เสียคะแนนไป ${issues[0].total} คะแนนตลอดช่วงที่ผ่านมา`
      : 'ห้องนี้ไม่มีปัญหาเด่นชัด รักษามาตรฐานนี้ไว้ต่อไปนะ 👏';

    return `
      <div class="chart-wrap">
        <div class="chart-title">แนวโน้มคะแนนย้อนหลัง (${roomHistory.length} ครั้ง)</div>
        <canvas id="room-trend-chart" height="140"></canvas>
      </div>
      <div class="stat-grid">
        <div class="stat-box"><div class="sb-value" style="color:${scoreColor(avgAll)}">${avgAll}</div><div class="sb-label">คะแนนเฉลี่ยทั้งหมด</div></div>
        <div class="stat-box"><div class="sb-value" style="color:${scoreColor(maxScore)}">${maxScore}</div><div class="sb-label">คะแนนสูงสุด</div></div>
        <div class="stat-box"><div class="sb-value" style="color:${scoreColor(minScore)}">${minScore}</div><div class="sb-label">คะแนนต่ำสุด</div></div>
        <div class="stat-box"><div class="sb-value">${roomHistory.length}</div><div class="sb-label">จำนวนครั้งที่ตรวจ</div></div>
      </div>
      <div class="trend-banner ${trendCls}"><span class="tb-icon">${trendIcon}</span><span>${trendText}</span></div>
      ${issues.length ? `
        <div class="analysis-section-title">หัวข้อที่เป็นปัญหาบ่อยที่สุด</div>
        <div class="issue-tags" style="margin-bottom:12px;">
          ${issues.map(i => `<span class="issue-tag">${i.icon} ${i.label} <b>-${i.total}</b></span>`).join('')}
        </div>
      ` : ''}
      <div class="analysis-section-title">คำแนะนำ</div>
      <div class="recommend-box">💡 ${recommendText}</div>
    `;
  }

  function render() {
    const html = `
      <button class="modal-close-x" onclick="closeModal()">✕</button>
      <h2>ห้อง ${code}</h2>
      <div class="modal-sub">${teacher ? 'ครูประจำชั้น: ' + teacher + ' &middot; ' : ''}${contextLabel}</div>
      <div class="modal-subtabs">
        <button class="modal-subtab ${activeTab === 'daily' ? 'active' : ''}" data-tab="daily">ดูคะแนนแต่ละวัน</button>
        <button class="modal-subtab ${activeTab === 'analysis' ? 'active' : ''}" data-tab="analysis">บทวิเคราะห์</button>
      </div>
      ${activeTab === 'daily' ? renderDailyTab() : renderAnalysisTab()}
    `;
    openModal(html);

    document.querySelectorAll('.modal-subtab').forEach(btn => {
      btn.addEventListener('click', () => { activeTab = btn.dataset.tab; render(); });
    });

    if (activeTab === 'daily') {
      document.querySelectorAll('.date-pill').forEach(p => {
        p.addEventListener('click', () => { selectedDate = p.dataset.date; render(); });
      });
    } else if (activeTab === 'analysis' && roomHistory.length >= 2) {
      const canvas = document.getElementById('room-trend-chart');
      if (canvas) drawScoreChart(canvas, roomHistory);
    }
  }
  render();
}

function drawScoreChart(canvas, records) {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.parentElement.clientWidth;
  const cssHeight = 140;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const padL = 30, padR = 10, padT = 10, padB = 20;
  const plotW = cssWidth - padL - padR;
  const plotH = cssHeight - padT - padB;

  const totals = records.map(r => r.total);
  const dataMin = Math.min(0, ...totals);
  const min = Math.floor((dataMin - 5) / 10) * 10;
  const max = 100;
  const range = max - min;

  const xFor = (i) => padL + (records.length === 1 ? plotW / 2 : (i / (records.length - 1)) * plotW);
  const yFor = (v) => padT + plotH - ((v - min) / range) * plotH;

  ctx.strokeStyle = '#dfe9f2';
  ctx.lineWidth = 1;
  ctx.font = '10px Sarabun, sans-serif';
  ctx.fillStyle = '#6c7f8e';
  [min, max, 0].forEach(v => {
    if (v < min || v > max) return;
    const y = yFor(v);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillText(String(v), 2, y + 3);
  });

  const gradient = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  gradient.addColorStop(0, 'rgba(20,121,201,0.22)');
  gradient.addColorStop(1, 'rgba(20,121,201,0.02)');
  ctx.beginPath();
  records.forEach((r, i) => {
    const x = xFor(i), y = yFor(r.total);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.lineTo(xFor(records.length - 1), yFor(min));
  ctx.lineTo(xFor(0), yFor(min));
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#1479c9';
  ctx.lineWidth = 2;
  records.forEach((r, i) => {
    const x = xFor(i), y = yFor(r.total);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  records.forEach((r, i) => {
    const x = xFor(i), y = yFor(r.total);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = scoreColor(r.total);
    ctx.fill();
  });

  ctx.fillStyle = '#6c7f8e';
  const fmt = (d) => { const [y,m,day] = d.split('-'); return `${day}/${m}`; };
  ctx.fillText(fmt(records[0].date), padL, cssHeight - 4);
  ctx.textAlign = 'right';
  ctx.fillText(fmt(records[records.length - 1].date), padL + plotW, cssHeight - 4);
  ctx.textAlign = 'left';
}

// ==========================================================================
// การนำทางหน้า
// ==========================================================================
let session = null; // { role: 'admin' | 'inspector', id, name }

document.getElementById('btn-go-viewer').addEventListener('click', () => {
  showPage('page-viewer');
  loadDaily();
  loadWeekly();
  loadMonthly();
});
document.getElementById('viewer-back').addEventListener('click', () => {
  showPage(session ? 'page-entry' : 'page-landing');
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

// ==========================================================================
// ระบบบัญชีผู้ใช้ (ผู้ดูแล + ผู้ตรวจ)
// ==========================================================================
const ADMIN_HASH_KEY = 'admin-pw-hash';
const INSPECTOR_PREFIX = 'inspector:';
const SESSION_KEY = 'cr-session';

async function hashPassword(pw) {
  const text = 'classroomrecap:' + pw;
  try {
    if (window.crypto && crypto.subtle) {
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return 'f' + (h >>> 0).toString(16);
}

// อ่านค่า: ไม่พบ = null, ปัญหาอื่น (เช่น เน็ตหลุด) = โยน error
async function getVal(key) {
  try {
    const r = await storage.get(key);
    return r ? r.value : null;
  } catch (e) {
    if (e && e.message === 'not found') return null;
    throw e;
  }
}

async function getAdminHash() {
  const stored = await getVal(ADMIN_HASH_KEY);
  if (stored) return stored;
  // รหัสเดิมที่เคยตั้งไว้ (เก็บแบบไม่เข้ารหัส) → แปลงเป็นแบบเข้ารหัสอัตโนมัติ
  const legacy = (await getVal(PW_KEY)) || DEFAULT_PASSWORD;
  const h = await hashPassword(legacy);
  try {
    await storage.set(ADMIN_HASH_KEY, h);
    await storage.delete(PW_KEY).catch(() => {});
  } catch (e) {}
  return h;
}

async function listInspectors() {
  const res = await storage.list(INSPECTOR_PREFIX);
  const out = [];
  for (const k of (res ? res.keys : [])) {
    try {
      const v = await getVal(k);
      if (v) out.push(JSON.parse(v));
    } catch (e) {}
  }
  out.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return out;
}

// ล็อกอินด้วยรหัสผ่านอย่างเดียว: ตรงกับผู้ดูแล หรือผู้ตรวจคนใดคนหนึ่ง
async function authenticate(pw) {
  const h = await hashPassword(pw);
  if (h === await getAdminHash()) return { role: 'admin', id: 'admin', name: 'ผู้ดูแลระบบ' };
  const m = (await listInspectors()).find(i => i.hash === h);
  return m ? { role: 'inspector', id: m.id, name: m.name } : null;
}

function enterEntryPage() {
  document.getElementById('user-chip').textContent = (session.role === 'admin' ? '🛡️ ' : '👤 ') + session.name;
  document.getElementById('inspector-chip').innerHTML =
    `<span class="ic-label">ผู้ตรวจ</span><b>${esc(session.name)}</b><span class="ic-note">บันทึกชื่ออัตโนมัติ</span>`;
  document.getElementById('tab-admin').style.display = session.role === 'admin' ? '' : 'none';
  showPage('page-entry');
  showEntryTab('form');
  updateDutyToday();
}

// ---------------- ตารางเวรผู้ตรวจ (กำหนดเอง จันทร์-ศุกร์) ----------------
const ROSTER_KEY = 'duty-roster';
const DAY_NAMES = { 1: 'จันทร์', 2: 'อังคาร', 3: 'พุธ', 4: 'พฤหัสบดี', 5: 'ศุกร์' };

async function loadRoster() {
  try {
    const v = await getVal(ROSTER_KEY);
    return v ? JSON.parse(v) : {};
  } catch (e) { return {}; }
}

function rosterNames(roster, day, inspectors) {
  const ids = roster[day] || [];
  return inspectors.filter(i => ids.includes(i.id)).map(i => i.name);
}

function rosterTableHtml(roster, inspectors, today) {
  return `<div class="table-scroll"><table class="roster-table"><tbody>${[1,2,3,4,5].map(d => {
    const n = rosterNames(roster, d, inspectors);
    return `<tr${d === today ? ' class="today-row"' : ''}>
      <td class="rt-day">${DAY_NAMES[d]}${d === today ? ' <span class="today-tag">วันนี้</span>' : ''}</td>
      <td>${n.length ? n.map(esc).join(', ') : '<span class="hr-none">-</span>'}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

async function loadLandingRoster() {
  const card = document.getElementById('landing-roster-card');
  if (!card) return;
  try {
    const [inspectors, roster] = await Promise.all([listInspectors(), loadRoster()]);
    const any = [1,2,3,4,5].some(d => rosterNames(roster, d, inspectors).length);
    if (!any) { card.style.display = 'none'; return; }
    document.getElementById('landing-roster-body').innerHTML = rosterTableHtml(roster, inspectors, new Date().getDay());
    card.style.display = '';
  } catch (e) { card.style.display = 'none'; }
}

// วันนั้นมีเวรกำหนดไว้ และผู้ตรวจคนนี้ไม่ได้อยู่เวร → ถือว่าตรวจแทน
function dutyInfoFor(dateStr, roster, inspectors, user) {
  const day = new Date(dateStr + 'T00:00:00').getDay();
  if (day < 1 || day > 5) return { substitute: false, onDuty: [] };
  const onDuty = rosterNames(roster, day, inspectors);
  const ids = roster[day] || [];
  const substitute = !!user && user.role === 'inspector' && onDuty.length > 0 && !ids.includes(user.id);
  return { substitute, onDuty };
}

async function updateDutyToday() {
  const box = document.getElementById('duty-today');
  if (!box) return;
  const day = new Date().getDay();
  if (day < 1 || day > 5) {
    box.innerHTML = '<span>📅 วันนี้เป็นวันหยุด ไม่มีเวรตรวจ</span>';
    return;
  }
  let inspectors = [], roster = {};
  try { [inspectors, roster] = await Promise.all([listInspectors(), loadRoster()]); } catch (e) {}
  const names = rosterNames(roster, day, inspectors);
  const info = dutyInfoFor(new Date().toISOString().slice(0, 10), roster, inspectors, session);
  box.innerHTML = `<span>📅 <b>เวรวัน${DAY_NAMES[day]}:</b> ${names.length ? names.map(esc).join(', ') : 'ยังไม่ได้กำหนดเวร'}
    ${info.substitute ? '<br><small class="sub-note">วันนี้คุณไม่ได้อยู่เวร ตรวจแทนได้ ระบบจะบันทึกว่า "แทน"</small>' : ''}</span>
    <button class="ghost" id="duty-week-btn">ดูทั้งสัปดาห์</button>`;
  document.getElementById('duty-week-btn').addEventListener('click', () => {
    openModal(`
      <button class="modal-close-x" onclick="closeModal()">✕</button>
      <h2>ตารางเวรผู้ตรวจ</h2>
      ${rosterTableHtml(roster, inspectors, day)}
      <button class="primary" style="width:100%;margin-top:14px;" onclick="closeModal()">ปิด</button>`);
  });
}

function renderRosterEditor(inspectors, roster) {
  const box = document.getElementById('roster-editor');
  if (!inspectors.length) {
    box.innerHTML = '<div class="empty">เพิ่มบัญชีผู้ตรวจก่อน แล้วค่อยจัดเวร</div>';
    return;
  }
  box.innerHTML = [1,2,3,4,5].map(d => `
    <div class="roster-day">
      <div class="roster-day-name">${DAY_NAMES[d]}</div>
      <div class="roster-chips">
        ${inspectors.map(i => `
          <label class="roster-chip">
            <input type="checkbox" data-day="${d}" value="${esc(i.id)}" ${(roster[d] || []).includes(i.id) ? 'checked' : ''}>
            <span>${esc(i.name)}</span>
          </label>`).join('')}
      </div>
    </div>`).join('');
}

document.getElementById('roster-save').addEventListener('click', async () => {
  const msg = document.getElementById('roster-msg');
  const roster = {};
  [1,2,3,4,5].forEach(d => {
    roster[d] = Array.from(document.querySelectorAll(`#roster-editor input[data-day="${d}"]:checked`)).map(i => i.value);
  });
  try {
    await storage.set(ROSTER_KEY, JSON.stringify(roster));
    showMsg(msg, 'บันทึกตารางเวรเรียบร้อย', 'ok');
    updateDutyToday();
  } catch (e) { showMsg(msg, 'บันทึกไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 'err'); }
});

function canModifyRecord(r) {
  return !!session && (session.role === 'admin' || (r.inspectorId && r.inspectorId === session.id));
}

let loginFails = 0, loginLockUntil = 0;
async function doLogin() {
  const msgEl = document.getElementById('login-msg');
  const entered = document.getElementById('login-password').value;
  if (!entered) { showMsg(msgEl, 'กรุณากรอกรหัสผ่าน', 'err'); return; }
  const wait = Math.ceil((loginLockUntil - Date.now()) / 1000);
  if (wait > 0) { showMsg(msgEl, `ลองผิดหลายครั้ง กรุณารออีก ${wait} วินาที`, 'err'); return; }
  const btn = document.getElementById('login-submit');
  btn.disabled = true; btn.textContent = 'กำลังตรวจสอบ...';
  try {
    const user = await authenticate(entered);
    if (user) {
      loginFails = 0;
      session = user;
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (e) {}
      document.getElementById('login-password').value = '';
      enterEntryPage();
    } else {
      loginFails++;
      if (loginFails >= 5) { loginLockUntil = Date.now() + 30000; loginFails = 0; }
      showMsg(msgEl, 'รหัสผ่านไม่ถูกต้อง', 'err');
    }
  } catch (e) {
    showMsg(msgEl, 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 'err');
  }
  btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ';
}
document.getElementById('login-submit').addEventListener('click', doLogin);
document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

function logout() {
  session = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  showPage('page-landing');
}
document.getElementById('entry-logout').addEventListener('click', logout);

async function restoreSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.role === 'inspector') {
      const v = await getVal(INSPECTOR_PREFIX + s.id);
      if (!v) { sessionStorage.removeItem(SESSION_KEY); return; }
      s.name = JSON.parse(v).name;
    } else if (s.role !== 'admin') return;
    session = s;
    enterEntryPage();
  } catch (e) {}
}

// ---------------- หน้าจัดการผู้ตรวจ (เฉพาะผู้ดูแล) ----------------
function validNewPassword(pw) {
  if (!pw || pw.length < 4) return 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร';
  return null;
}

async function passwordInUse(pw, ignoreId) {
  const h = await hashPassword(pw);
  if (h === await getAdminHash()) return true;
  return (await listInspectors()).some(i => i.hash === h && i.id !== ignoreId);
}

async function renderAdminPanel() {
  const box = document.getElementById('ins-list');
  box.innerHTML = '<div class="empty">กำลังโหลด...</div>';
  let list;
  try { list = await listInspectors(); }
  catch (e) { box.innerHTML = '<div class="empty">โหลดข้อมูลไม่สำเร็จ</div>'; return; }
  loadRoster().then(r => renderRosterEditor(list, r));
  if (!list.length) { box.innerHTML = '<div class="empty">ยังไม่มีบัญชีผู้ตรวจ เพิ่มได้จากด้านบน</div>'; return; }
  box.innerHTML = `
    <div class="table-scroll"><table>
      <thead><tr><th>ชื่อผู้ตรวจ</th><th>รหัสผ่าน</th><th></th></tr></thead>
      <tbody>${list.map(i => `
        <tr>
          <td><b>${esc(i.name)}</b><div class="ins-date">สร้างเมื่อ ${i.createdAt ? new Date(i.createdAt).toLocaleDateString('th-TH') : '-'}</div></td>
          <td>${i.pw
            ? `<span class="pw-cell"><code class="pw-text" data-pw="${esc(i.pw)}">••••••</code><button class="ghost pw-peek" data-id="${esc(i.id)}" title="แสดง/ซ่อนรหัส">👁</button></span>`
            : '<span class="hr-none">ดูไม่ได้<br>ตั้งรหัสใหม่</span>'}</td>
          <td style="white-space:nowrap;">
            <button class="ghost" data-act="reset" data-id="${esc(i.id)}">เปลี่ยนรหัส</button>
            <button class="ghost" data-act="del" data-id="${esc(i.id)}">ลบ</button>
          </td>
        </tr>`).join('')}
      </tbody></table></div>`;
  box.querySelectorAll('.pw-peek').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.parentElement.querySelector('.pw-text');
      const shown = code.dataset.shown === '1';
      code.textContent = shown ? '••••••' : code.dataset.pw;
      code.dataset.shown = shown ? '0' : '1';
      btn.textContent = shown ? '👁' : '🙈';
    });
  });
  box.querySelectorAll('button[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ins = list.find(x => x.id === btn.dataset.id);
      if (!ins) return;
      if (btn.dataset.act === 'del') confirmDeleteInspector(ins);
      else openResetInspectorModal(ins);
    });
  });
}

function confirmDeleteInspector(ins) {
  openModal(`
    <button class="modal-close-x" onclick="closeModal()">✕</button>
    <h2>ลบบัญชี "${esc(ins.name)}" ?</h2>
    <div class="modal-sub">ผู้ตรวจคนนี้จะเข้าระบบไม่ได้อีก ส่วนผลตรวจที่เคยบันทึกไว้ยังอยู่เหมือนเดิม</div>
    <div class="modal-actions">
      <button class="ghost" style="flex:1;" onclick="closeModal()">ยกเลิก</button>
      <button class="primary" id="del-ins-ok" style="flex:1;background:var(--danger);">ลบบัญชี</button>
    </div>`);
  document.getElementById('del-ins-ok').addEventListener('click', async () => {
    try { await storage.delete(INSPECTOR_PREFIX + ins.id); } catch (e) {}
    closeModal();
    renderAdminPanel();
  });
}

function openResetInspectorModal(ins) {
  openModal(`
    <button class="modal-close-x" onclick="closeModal()">✕</button>
    <h2>เปลี่ยนรหัสผ่านของ "${esc(ins.name)}"</h2>
    <label style="margin-top:10px;">รหัสผ่านใหม่</label>
    <input type="text" id="reset-pw-input" autocomplete="off" placeholder="อย่างน้อย 4 ตัวอักษร">
    <div id="reset-msg" style="margin-top:10px;"></div>
    <div class="modal-actions">
      <button class="ghost" style="flex:1;" onclick="closeModal()">ยกเลิก</button>
      <button class="primary" id="reset-ok" style="flex:1;">บันทึก</button>
    </div>`);
  document.getElementById('reset-ok').addEventListener('click', async () => {
    const msg = document.getElementById('reset-msg');
    const pw = document.getElementById('reset-pw-input').value;
    const bad = validNewPassword(pw);
    if (bad) { showMsg(msg, bad, 'err'); return; }
    try {
      if (await passwordInUse(pw, ins.id)) { showMsg(msg, 'รหัสผ่านนี้มีคนใช้อยู่แล้ว ลองรหัสอื่น', 'err'); return; }
      await storage.set(INSPECTOR_PREFIX + ins.id, JSON.stringify({ ...ins, hash: await hashPassword(pw), pw }));
      closeModal();
      renderAdminPanel();
    } catch (e) { showMsg(msg, 'บันทึกไม่สำเร็จ กรุณาลองใหม่', 'err'); }
  });
}

document.getElementById('ins-add').addEventListener('click', async () => {
  const msg = document.getElementById('ins-msg');
  const name = document.getElementById('ins-name').value.trim();
  const pw = document.getElementById('ins-pw').value;
  if (!name) { showMsg(msg, 'กรุณากรอกชื่อผู้ตรวจ', 'err'); return; }
  const bad = validNewPassword(pw);
  if (bad) { showMsg(msg, bad, 'err'); return; }
  try {
    const list = await listInspectors();
    if (list.some(i => i.name.toLowerCase() === name.toLowerCase())) { showMsg(msg, 'มีชื่อนี้ในระบบแล้ว', 'err'); return; }
    if (await passwordInUse(pw)) { showMsg(msg, 'รหัสผ่านนี้มีคนใช้อยู่แล้ว ลองรหัสอื่น', 'err'); return; }
    const id = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await storage.set(INSPECTOR_PREFIX + id, JSON.stringify({ id, name, hash: await hashPassword(pw), pw, createdAt: Date.now() }));
    document.getElementById('ins-name').value = '';
    document.getElementById('ins-pw').value = '';
    showMsg(msg, `เพิ่มบัญชี "${esc(name)}" เรียบร้อย`, 'ok');
    renderAdminPanel();
  } catch (e) { showMsg(msg, 'บันทึกไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 'err'); }
});

document.getElementById('pw-submit').addEventListener('click', async () => {
  const cur = document.getElementById('pw-current').value;
  const next = document.getElementById('pw-new').value;
  const msgEl = document.getElementById('pw-msg');
  try {
    if (await hashPassword(cur) !== await getAdminHash()) { showMsg(msgEl, 'รหัสผ่านปัจจุบันไม่ถูกต้อง', 'err'); return; }
    const bad = validNewPassword(next);
    if (bad) { showMsg(msgEl, bad, 'err'); return; }
    const h = await hashPassword(next);
    if ((await listInspectors()).some(i => i.hash === h)) { showMsg(msgEl, 'รหัสนี้ซ้ำกับผู้ตรวจบางคน ลองรหัสอื่น', 'err'); return; }
    await storage.set(ADMIN_HASH_KEY, h);
    showMsg(msgEl, 'เปลี่ยนรหัสผ่านเรียบร้อย', 'ok');
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value = '';
  } catch (e) {
    showMsg(msgEl, 'บันทึกไม่สำเร็จ กรุณาลองใหม่', 'err');
  }
});

document.getElementById('entry-check-scores').addEventListener('click', () => {
  showPage('page-viewer');
  loadDaily();
  loadWeekly();
  loadMonthly();
});

document.querySelectorAll('.subtab[data-vtab]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.subtab[data-vtab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('vpanel-daily').style.display = tab.dataset.vtab === 'daily' ? 'block' : 'none';
    document.getElementById('vpanel-weekly').style.display = tab.dataset.vtab === 'weekly' ? 'block' : 'none';
    document.getElementById('vpanel-monthly').style.display = tab.dataset.vtab === 'monthly' ? 'block' : 'none';
  });
});

function showEntryTab(tab) {
  document.querySelectorAll('.subtab[data-etab]').forEach(t => t.classList.toggle('active', t.dataset.etab === tab));
  document.getElementById('epanel-form').style.display = tab === 'form' ? 'block' : 'none';
  document.getElementById('epanel-mine').style.display = tab === 'mine' ? 'block' : 'none';
  document.getElementById('epanel-admin').style.display = tab === 'admin' ? 'block' : 'none';
  if (tab === 'mine') loadHistory();
  if (tab === 'admin') renderAdminPanel();
  if (tab === 'form') updateUntestedReminder();
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

async function updateUntestedReminder() {
  const el = document.getElementById('untested-reminder');
  if (!el) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date(todayStr + 'T00:00:00').getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    el.style.display = 'none';
    return;
  }
  const records = await loadAllRecords();
  const testedToday = new Set(records.filter(r => r.date === todayStr).map(r => `${r.grade}/${r.room}`));
  const untested = ROOM_CODES.filter(code => !testedToday.has(code));
  if (!untested.length) {
    el.className = 'untested-reminder done';
    el.textContent = '🎉 วันนี้ตรวจครบทุกห้องแล้ว เยี่ยมมาก!';
    el.style.display = 'block';
  } else {
    el.className = 'untested-reminder';
    el.textContent = `📋 วันนี้ยังไม่ได้ตรวจ ${untested.length} ห้อง: ${untested.join(', ')}`;
    el.style.display = 'block';
  }
}

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
  const doneCount = CRITERIA.filter(c => state.selections[c.key]).length;
  const progEl = document.getElementById('score-progress');
  if (progEl) progEl.textContent = `คะแนนรวม · เลือกแล้ว ${doneCount}/${CRITERIA.length} หัวข้อ`;
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
  state.editingKey = null;
  state.editingSavedAt = null;
  state.editingInspector = null;
  state.editingInspectorId = null;
  state.editingSub = false;
  state.editingSubFor = [];
  document.getElementById('grade').disabled = false;
  document.getElementById('room').disabled = false;
  document.getElementById('edit-banner').style.display = 'none';
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
    msgArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const sevEnabled = document.getElementById('severity-enable').checked;
  const remark = document.getElementById('severity-remark').value.trim();
  if (sevEnabled && (!remark || !state.severityLevel)) {
    showMsg(msgArea, 'กรณีพิเศษต้องกรอกหมายเหตุและเลือกระดับความรุนแรงให้ครบ', 'err');
    return;
  }
  const isEditing = !!state.editingKey;
  const grade = document.getElementById('grade').value;
  const room = document.getElementById('room').value;
  const date = document.getElementById('date').value || new Date().toISOString().slice(0,10);
  if (!session) { showMsg(msgArea, 'หมดเวลาการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่', 'err'); return; }
  const inspector = isEditing ? (state.editingInspector || '') : session.name;
  const inspectorId = isEditing ? (state.editingInspectorId || null) : session.id;
  let substitute = isEditing ? !!state.editingSub : false;
  let substituteFor = isEditing ? (state.editingSubFor || []) : [];
  if (!isEditing) {
    try {
      const [insps, roster] = await Promise.all([listInspectors(), loadRoster()]);
      const info = dutyInfoFor(date, roster, insps, session);
      substitute = info.substitute;
      substituteFor = info.substitute ? info.onDuty : [];
    } catch (e) {}
  }
  const total = updateScore();
  const record = {
    grade, room, date, inspector, inspectorId, substitute, substituteFor,
    selections: { ...state.selections },
    severity: sevEnabled ? { level: state.severityLevel, remark, photo: state.severityPhoto || null } : null,
    total,
    savedAt: isEditing ? state.editingSavedAt : Date.now()
  };
  if (isEditing) { record.editedAt = Date.now(); record.editedBy = session.name; }

  // แสดงหน้ายืนยันก่อนบันทึกจริง
  const confirmHtml = `
    <button class="modal-close-x" onclick="closeModal()">✕</button>
    <h2>${isEditing ? 'ยืนยันการแก้ไข?' : 'ยืนยันการบันทึก?'}</h2>
    <div class="modal-sub">ห้อง ${grade}/${room} &middot; วันที่ ${date}${inspector ? ' &middot; ผู้ตรวจ: ' + esc(inspector) : ''}</div>
    ${substitute ? `<div class="sub-confirm">⚠️ คุณไม่ได้อยู่เวรวันนี้ (เวร: ${substituteFor.map(esc).join(', ')}) ระบบจะบันทึกว่า <b>ตรวจแทน</b></div>` : ''}
    ${buildBreakdownRowsHtml(record)}
    <div class="modal-total-line">
      <span>คะแนนรวม</span>
      <span style="color:${scoreColor(total)}">${total}</span>
    </div>
    <div class="modal-actions">
      <button class="ghost" id="modal-edit-more" style="flex:1;">แก้ไขต่อ</button>
      <button class="primary" id="modal-confirm-save" style="flex:1;">${isEditing ? 'ยืนยันการแก้ไข' : 'ยืนยันบันทึก'}</button>
    </div>
  `;
  openModal(confirmHtml);

  document.getElementById('modal-edit-more').addEventListener('click', closeModal);
  document.getElementById('modal-confirm-save').addEventListener('click', async () => {
    const key = isEditing ? state.editingKey : `eval:${grade}-${room}:${record.savedAt}`;
    const confirmBtn = document.getElementById('modal-confirm-save');
    confirmBtn.textContent = 'กำลังบันทึก...';
    confirmBtn.disabled = true;
    const result = await safeStorageSet(key, JSON.stringify(record));
    if (result.ok) {
      playSuccessFeedback();
      openModal(`
        <div class="success-check">✓</div>
        <div class="success-title">${isEditing ? 'แก้ไขสำเร็จ' : 'ยืนยันสำเร็จ'}</div>
        <div class="success-sub">${isEditing ? 'อัปเดต' : 'บันทึก'}ผลการตรวจห้อง ${grade}/${room} เรียบร้อยแล้ว (คะแนน ${total})</div>
        <button class="primary" style="width:100%;" onclick="closeModal()">ตกลง</button>
      `);
      const wasEditing = isEditing;
      resetFormAfterSave();
      updateUntestedReminder();
      if (wasEditing) showEntryTab('mine');
    } else if (result.queued) {
      playQueuedFeedback();
      openModal(`
        <div class="success-check" style="background:var(--accent-light); color:#a06800;">⏳</div>
        <div class="success-title">บันทึกไว้ในเครื่องแล้ว</div>
        <div class="success-sub">ตอนนี้เชื่อมต่ออินเทอร์เน็ตไม่ได้ ระบบเก็บข้อมูลห้อง ${grade}/${room} ไว้ในเครื่องนี้ก่อน จะส่งขึ้นฐานข้อมูลกลางให้อัตโนมัติทันทีที่เน็ตกลับมา (ห้ามล้างข้อมูลเบราว์เซอร์ก่อนเน็ตกลับมา)</div>
        <button class="primary" style="width:100%;" onclick="closeModal()">เข้าใจแล้ว</button>
      `);
      const wasEditing = isEditing;
      resetFormAfterSave();
      updateUntestedReminder();
      if (wasEditing) showEntryTab('mine');
    } else {
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

async function loadLandingSummary() {
  const card = document.getElementById('landing-summary-card');
  const listEl = document.getElementById('landing-rank-list');
  const records = await loadAllRecords();
  updateHeroStatusLine(records);

  if (!records.length) {
    card.style.display = 'none';
    return;
  }

  const todayKey = getISOWeekInfo(new Date().toISOString().slice(0, 10)).key;
  const roomTotals = {};
  records.forEach(r => {
    if (getISOWeekInfo(r.date).key !== todayKey) return;
    const code = `${r.grade}/${r.room}`;
    if (!roomTotals[code]) roomTotals[code] = [];
    roomTotals[code].push(r.total);
  });
  const ranked = Object.keys(roomTotals)
    .map(code => ({ code, avg: Math.round(roomTotals[code].reduce((a,b)=>a+b,0) / roomTotals[code].length) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);

  if (!ranked.length) {
    card.style.display = 'none';
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  card.style.display = 'block';
  listEl.innerHTML = ranked.map((r, i) => `
    <div class="rank-row">
      <div class="rr-left">
        <span class="rr-medal">${medals[i]}</span>
        <div>
          <div class="rr-room">${r.code}</div>
          <div class="rr-teacher">${teacherNamesFor(r.code)}</div>
        </div>
      </div>
      <div class="rr-score" style="color:${scoreColor(r.avg)}">${r.avg}</div>
    </div>
  `).join('');
}

let historyRecordsCache = [];
async function loadHistory() {
  const container = document.getElementById('history-container');
  container.innerHTML = '<div class="empty">กำลังโหลด...</div>';
  const records = await loadAllRecords();
  historyRecordsCache = records;
  document.getElementById('history-search').value = '';
  document.getElementById('history-date').value = '';
  renderHistoryTable(records);
}

function formatThaiDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

function renderHistoryTable(records, expandAll) {
  const container = document.getElementById('history-container');
  if (!historyRecordsCache.length) {
    container.innerHTML = '<div class="empty">ยังไม่มีข้อมูลการตรวจ</div>';
    return;
  }
  if (!records.length) {
    container.innerHTML = '<div class="empty">ไม่พบข้อมูลที่ค้นหา</div>';
    return;
  }
  const byDate = {};
  records.forEach(r => { (byDate[r.date] = byDate[r.date] || []).push(r); });
  const dates = Object.keys(byDate).sort().reverse();
  const roomIdx = r => ROOM_CODES.indexOf(`${r.grade}/${r.room}`);

  container.innerHTML = dates.map((date, idx) => {
    const recs = byDate[date].slice().sort((a, b) => roomIdx(a) - roomIdx(b));
    const avg = Math.round(recs.reduce((t, r) => t + r.total, 0) / recs.length);
    return `
    <details class="hist-day" ${(expandAll || idx < 2) ? 'open' : ''}>
      <summary>
        <span class="hd-date">${formatThaiDate(date)}</span>
        <span class="hd-meta">${recs.length} ห้อง · เฉลี่ย <b style="color:${scoreColor(avg)}">${avg}</b></span>
      </summary>
      <div class="hist-rows">
        ${recs.map(r => `
          <div class="hist-row">
            <div class="hr-room">${r.grade}/${r.room}</div>
            <div class="hr-insp">${r.inspector ? '👤 ' + esc(r.inspector) : '<span class="hr-none">ไม่ระบุผู้ตรวจ</span>'}${r.substitute ? ` <span class="sub-badge" title="แทนเวร: ${esc((r.substituteFor || []).join(', '))}">แทน</span>` : ''}</div>
            <div class="hr-score" style="color:${scoreColor(r.total)}">${r.total}</div>
            <div class="hr-actions">
              ${canModifyRecord(r) ? `
              <button class="ghost" data-action="edit" data-key="${esc(r.key)}">แก้ไข</button>
              <button class="ghost" data-action="delete" data-key="${esc(r.key)}">ลบ</button>` : '<span class="lock-note">🔒</span>'}
            </div>
          </div>`).join('')}
      </div>
    </details>`;
  }).join('');

  container.querySelectorAll('button[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rec = historyRecordsCache.find(r => r.key === btn.dataset.key);
      if (!rec || !canModifyRecord(rec)) return;
      openModal(`
        <button class="modal-close-x" onclick="closeModal()">✕</button>
        <h2>ลบผลตรวจนี้?</h2>
        <div class="modal-sub">ห้อง ${rec.grade}/${rec.room} &middot; วันที่ ${rec.date} &middot; คะแนน ${rec.total}</div>
        <div class="modal-actions">
          <button class="ghost" style="flex:1;" onclick="closeModal()">ยกเลิก</button>
          <button class="primary" id="del-rec-ok" style="flex:1;background:var(--danger);">ลบ</button>
        </div>`);
      document.getElementById('del-rec-ok').addEventListener('click', async () => {
        try { await storage.delete(rec.key); } catch (e) {}
        closeModal();
        loadHistory();
      });
    });
  });
  container.querySelectorAll('button[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const record = historyRecordsCache.find(r => r.key === btn.dataset.key);
      if (record && canModifyRecord(record)) startEditRecord(record);
    });
  });
}

function applyHistoryFilter() {
  const q = document.getElementById('history-search').value.trim().toLowerCase();
  const date = document.getElementById('history-date').value;
  const filtered = historyRecordsCache.filter(r =>
    (!date || r.date === date) &&
    (!q || (r.inspector || '').toLowerCase().includes(q) || `${r.grade}/${r.room}`.toLowerCase().includes(q)));
  renderHistoryTable(filtered, !!(q || date));
}
document.getElementById('history-search').addEventListener('input', applyHistoryFilter);
document.getElementById('history-date').addEventListener('change', applyHistoryFilter);
document.getElementById('history-clear').addEventListener('click', () => {
  document.getElementById('history-search').value = '';
  document.getElementById('history-date').value = '';
  applyHistoryFilter();
});

// ---------------- แก้ไขข้อมูลที่เคยบันทึกไว้ ----------------
function startEditRecord(record) {
  state.editingKey = record.key;
  state.editingSavedAt = record.savedAt;
  state.selections = { ...record.selections };
  state.severityLevel = record.severity ? record.severity.level : null;
  state.severityPhoto = record.severity ? (record.severity.photo || null) : null;

  document.getElementById('grade').value = record.grade;
  document.getElementById('grade').disabled = true;
  document.getElementById('room').value = record.room;
  document.getElementById('room').disabled = true;
  document.getElementById('date').value = record.date;
  state.editingInspector = record.inspector || '';
  state.editingSub = !!record.substitute;
  state.editingSubFor = record.substituteFor || [];
  state.editingInspectorId = record.inspectorId || null;
  updateTeacherHint();

  document.querySelectorAll('#criteria-container .level-opt').forEach(opt => {
    const key = opt.dataset.key;
    const level = parseInt(opt.dataset.level);
    const isSelected = state.selections[key] === level;
    opt.classList.toggle('selected', isSelected);
    opt.querySelector('input').checked = isSelected;
  });

  const sevEnable = document.getElementById('severity-enable');
  const sevFields = document.getElementById('severity-fields');
  if (record.severity) {
    sevEnable.checked = true;
    sevFields.style.display = 'block';
    document.getElementById('severity-remark').value = record.severity.remark || '';
    document.querySelectorAll('#severity-levels .level-opt').forEach(opt => {
      const isSelected = parseInt(opt.dataset.level) === state.severityLevel;
      opt.classList.toggle('selected', isSelected);
      opt.querySelector('input').checked = isSelected;
    });
  } else {
    sevEnable.checked = false;
    sevFields.style.display = 'none';
    document.getElementById('severity-remark').value = '';
    document.querySelectorAll('#severity-levels .level-opt').forEach(o => o.classList.remove('selected'));
  }
  renderPhotoPreview();

  const banner = document.getElementById('edit-banner');
  document.getElementById('edit-banner-text').textContent = `✏️ กำลังแก้ไขข้อมูล ห้อง ${record.grade}/${record.room} วันที่ ${record.date}`;
  banner.style.display = 'flex';

  updateScore();
  showEntryTab('form');
}

function cancelEditRecord() {
  state.editingKey = null;
  state.editingSavedAt = null;
  document.getElementById('grade').disabled = false;
  document.getElementById('room').disabled = false;
  document.getElementById('edit-banner').style.display = 'none';
  resetFormAfterSave();
}
document.getElementById('edit-cancel-btn').addEventListener('click', cancelEditRecord);

document.getElementById('entry-view-criteria').addEventListener('click', showCriteriaInfoModal);
document.getElementById('btn-view-criteria-landing').addEventListener('click', showCriteriaInfoModal);

function showCriteriaInfoModal() {
  const criteriaRows = CRITERIA.map(c => `
    <div class="crit-info-block">
      <div class="crit-info-head">${c.icon} ${c.label}</div>
      <div class="crit-info-levels">
        ${c.levels.map((lv, i) => `
          <div class="crit-info-row">
            <span>ระดับ ${i + 1} - ${lv}</span>
            <b>${c.pts[i] === 0 ? '0' : '-' + c.pts[i]}</b>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  const severityRows = SEVERITY.map(s => `
    <div class="crit-info-row">
      <span>${s.label}</span>
      <b>-${s.pts}</b>
    </div>
  `).join('');

  const html = `
    <button class="modal-close-x" onclick="closeModal()">✕</button>
    <h2>ℹ️ เกณฑ์การให้คะแนน</h2>
    <div class="modal-sub">คะแนนเต็ม 100 คะแนนต่อห้อง หักตามระดับในแต่ละหัวข้อ</div>
    ${criteriaRows}
    <div class="crit-info-block">
      <div class="crit-info-head">⚠️ กรณีพิเศษ (ความเสียหายรุนแรง เช่น โต๊ะหัก)</div>
      <div class="crit-info-levels">${severityRows}</div>
      <div class="crit-info-note">ต้องกรอกหมายเหตุก่อนถึงจะเลือกระดับความรุนแรงได้ คะแนนอาจติดลบได้หากหักสะสมเกิน 100</div>
    </div>
    <div class="crit-info-block">
      <div class="crit-info-head">🏅 เกณฑ์ระดับรายสัปดาห์ (จากคะแนนเฉลี่ย)</div>
      <div class="crit-info-levels">
        <div class="crit-info-row"><span>90 ขึ้นไป</span><b class="lvl-excellent">ผ่านเกณฑ์ดีเยี่ยม</b></div>
        <div class="crit-info-row"><span>75 - 89</span><b class="lvl-pass">ผ่านเกณฑ์</b></div>
        <div class="crit-info-row"><span>50 - 74</span><b class="lvl-improve">ควรปรับปรุง</b></div>
        <div class="crit-info-row"><span>ต่ำกว่า 50</span><b class="lvl-urgent">ต้องปรับปรุงโดยด่วน</b></div>
      </div>
    </div>
  `;
  openModal(html);
}

// ==========================================================================
// ภาพรวมรายวัน (สาธารณะ)
// ==========================================================================
document.getElementById('daily-date').addEventListener('change', loadDaily);

document.getElementById('daily-prev-day').addEventListener('click', () => {
  const input = document.getElementById('daily-date');
  const d = new Date((input.value || new Date().toISOString().slice(0,10)) + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  input.value = d.toISOString().slice(0, 10);
  loadDaily();
});
document.getElementById('daily-next-day').addEventListener('click', () => {
  const input = document.getElementById('daily-date');
  const d = new Date((input.value || new Date().toISOString().slice(0,10)) + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  input.value = d.toISOString().slice(0, 10);
  loadDaily();
});

async function loadDaily() {
  const dateInput = document.getElementById('daily-date');
  if (!dateInput.value) dateInput.value = new Date().toISOString().slice(0,10);
  const targetDate = dateInput.value;
  const container = document.getElementById('daily-grid-container');
  container.innerHTML = '<div class="empty">กำลังโหลด...</div>';

  const dayOfWeek = new Date(targetDate + 'T00:00:00').getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    container.innerHTML = '<div class="empty">🎉 วันหยุดสุดสัปดาห์ ไม่มีการตรวจในวันนี้</div>';
    return;
  }

  const records = await loadAllRecords();
  const dayRecords = records.filter(r => r.date === targetDate);
  if (!dayRecords.length) {
    container.innerHTML = '<div class="empty">📭 ไม่มีข้อมูลสำหรับวันนี้</div>';
    return;
  }

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
    const inspNames = recs ? [...new Set(recs.map(r => r.inspector ? r.inspector + (r.substitute ? ' (แทน)' : '') : '').filter(Boolean))].map(esc).join(', ') : '';
    return `
      <div class="room-chip ${recs ? 'clickable' : ''} ${hlClass}" data-code="${code}">
        <div class="rname">${code}</div>
        ${teacher ? `<div class="rteacher">${teacher}</div>` : ''}
        <div class="rscore" style="color:${color}">${avg === null ? '-' : avg}</div>
        <div class="rdate">${avg === null ? 'ไม่มีการตรวจ' : (recs.length > 1 ? recs.length + ' ครั้ง' : '1 ครั้ง')}</div>
        ${inspNames ? `<div class="rinsp">👤 ${inspNames}</div>` : ''}
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
      openRoomDetailModal(code, recs, `วันที่ ${targetDate} &middot; ตรวจทั้งหมด ${recs.length} ครั้ง`);
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
              <td>${r.code}<div class="row-hint">กดเพื่อดูรายละเอียด</div></td>
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
      openRoomDetailModal(code, r.recs, `${group.label} &middot; ตรวจทั้งหมด ${r.recs.length} ครั้ง`);
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

function getMonthInfo(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const label = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { year: 'numeric', month: 'long' }).format(d);
  return { key, label };
}

let monthlyGroupsCache = {};

async function loadMonthly() {
  const records = await loadAllRecords();
  const groups = {};
  records.forEach(r => {
    const info = getMonthInfo(r.date);
    if (!groups[info.key]) groups[info.key] = { label: info.label, rooms: {} };
    const code = `${r.grade}/${r.room}`;
    if (!groups[info.key].rooms[code]) groups[info.key].rooms[code] = [];
    groups[info.key].rooms[code].push(r);
  });
  monthlyGroupsCache = groups;
  const monthSelect = document.getElementById('month-select');
  const keys = Object.keys(groups).sort().reverse();
  const prevSelected = monthSelect.value;
  if (!keys.length) {
    monthSelect.innerHTML = '<option value="">ยังไม่มีข้อมูล</option>';
    renderMonthly(null);
    return;
  }
  monthSelect.innerHTML = keys.map(k => `<option value="${k}">${groups[k].label}</option>`).join('');
  monthSelect.value = keys.includes(prevSelected) ? prevSelected : keys[0];
  renderMonthly(monthSelect.value);
}
document.getElementById('month-select').addEventListener('change', (e) => renderMonthly(e.target.value));

function renderMonthly(monthKey) {
  const legendEl = document.getElementById('monthly-legend');
  const tableEl = document.getElementById('monthly-table-container');
  const issuesContainer = document.getElementById('monthly-issues-container');
  const issuesList = document.getElementById('monthly-issues-list');
  if (!monthKey || !monthlyGroupsCache[monthKey]) {
    legendEl.innerHTML = '';
    tableEl.innerHTML = '<div class="empty">ยังไม่มีข้อมูลการตรวจในเดือนนี้</div>';
    issuesContainer.style.display = 'none';
    return;
  }
  const group = monthlyGroupsCache[monthKey];
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
              <td>${r.code}<div class="row-hint">กดเพื่อดูรายละเอียด</div></td>
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
      openRoomDetailModal(code, r.recs, `${group.label} &middot; ตรวจทั้งหมด ${r.recs.length} ครั้ง`);
    });
  });

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

// ---------------- ส่งออกข้อมูลเป็น CSV ----------------
function csvEscape(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

document.getElementById('export-csv-btn').addEventListener('click', async () => {
  const btn = document.getElementById('export-csv-btn');
  const originalText = btn.textContent;
  btn.textContent = 'กำลังเตรียมไฟล์...';
  btn.disabled = true;
  try {
    const records = (await loadAllRecords()).slice().sort((a, b) => a.savedAt - b.savedAt);
    const headers = ['วันที่', 'ห้อง', 'ครูประจำชั้น', 'ผู้ตรวจ', 'ตรวจแทน', ...CRITERIA.map(c => c.label), 'กรณีพิเศษ', 'คะแนนรวม'];
    const rows = records.map(r => {
      const code = `${r.grade}/${r.room}`;
      const critVals = CRITERIA.map(c => {
        const lvl = r.selections && r.selections[c.key];
        return lvl ? `ระดับ ${lvl}` : '';
      });
      let sevVal = '';
      if (r.severity) {
        const sev = SEVERITY.find(s => s.value === r.severity.level);
        sevVal = (sev ? sev.label : '') + (r.severity.remark ? ' - ' + r.severity.remark : '');
      }
      return [r.date, code, teacherNamesFor(code), r.inspector || '', r.substitute ? 'แทน ' + (r.substituteFor || []).join('/') : '', ...critVals, sevVal, r.total];
    });
    const csvContent = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classroom-cleanliness-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    showMsg(document.getElementById('history-container'), 'ส่งออกไฟล์ไม่สำเร็จ กรุณาลองใหม่', 'err');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// ==========================================================================
// โหมดมืด (Dark mode)
// ==========================================================================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  try { localStorage.setItem('theme-pref', theme); } catch (e) {}
}
document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});
applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

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
updatePendingBadge();
flushPendingQueue();
showPage('page-landing');
restoreSession();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
