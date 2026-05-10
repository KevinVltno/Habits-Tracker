const STORAGE_KEY = 'habits_monthly_v1';
let data = { habits: [], logs: {} };
let viewYear, viewMonth, chartYear, chartInst = null;
let currentView = 'today'; // 'today' | 'calendar'

function pad2(n) { return String(n).padStart(2, '0'); }
function dateKey(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function getDaysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
function getFirstDow(y, m) { let d = new Date(y, m - 1, 1).getDay(); return d === 0 ? 6 : d - 1; }

function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) data = JSON.parse(r); } catch(e) {}
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function addHabit() {
  const inp = document.getElementById('habit-input');
  const name = inp.value.trim();
  if (!name) return;
  data.habits.push({ id: Date.now().toString(), name });
  inp.value = '';
  saveData();
  render();
}

function toggleLog(habitId, dk) {
  const k = `${habitId}_${dk}`;
  data.logs[k] = !data.logs[k];
  saveData();
  render();
}

function deleteHabit(habitId) {
  if (!confirm('Hapus kebiasaan ini?')) return;
  data.habits = data.habits.filter(h => h.id !== habitId);
  Object.keys(data.logs).forEach(k => { if (k.startsWith(habitId + '_')) delete data.logs[k]; });
  saveData();
  render();
}

function getStreak(habitId) {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dk = d.toISOString().split('T')[0];
    if (data.logs[`${habitId}_${dk}`]) streak++;
    else break;
  }
  return streak;
}

function buildCalendar(habitId) {
  const today = new Date();
  const todayDk = todayStr();
  const y = viewYear, m = viewMonth;
  const days = getDaysInMonth(y, m);
  const firstDow = getFirstDow(y, m);
  const heads = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

  let html = '<div class="cal-grid">';
  heads.forEach(h => { html += `<div class="day-head">${h}</div>`; });
  for (let i = 0; i < firstDow; i++) html += `<div class="day-cell empty"></div>`;

  for (let d = 1; d <= days; d++) {
    const dk = dateKey(y, m, d);
    const done = !!data.logs[`${habitId}_${dk}`];
    const isToday = dk === todayDk;
    const isFuture = new Date(y, m - 1, d) > today && !isToday;
    let cls = 'day-cell';
    if (done) cls += ' done';
    if (isToday) cls += ' today-cell';
    if (isFuture) cls += ' future';
    const click = isFuture ? '' : ` onclick="toggleLog('${habitId}','${dk}')"`;
    html += `<div class="${cls}"${click}>${d}</div>`;
  }
  html += '</div>';
  return html;
}

/* ── TODAY VIEW ── */
function renderTodayView() {
  const todayDk = todayStr();
  const list = document.getElementById('today-list');
  list.innerHTML = '';

  if (!data.habits.length) {
    list.innerHTML = '<div class="empty-state">Belum ada kebiasaan. Tambahkan di atas.</div>';
    updateMarkAllBtn();
    return;
  }

  data.habits.forEach(h => {
    const done = !!data.logs[`${h.id}_${todayDk}`];
    const streak = getStreak(h.id);

    const item = document.createElement('div');
    item.className = 'today-item' + (done ? ' today-done' : '');
    item.innerHTML = `
      <button class="today-check-btn" onclick="toggleLog('${h.id}','${todayDk}')">
        <i class="ti ti-${done ? 'circle-check-filled' : 'circle'}"></i>
      </button>
      <span class="today-habit-name">${escHtml(h.name)}</span>
      <span class="today-streak"><i class="ti ti-flame"></i> ${streak}</span>
      <button class="del-btn" onclick="deleteHabit('${h.id}')" title="Hapus"><i class="ti ti-trash"></i></button>
    `;
    list.appendChild(item);
  });

  updateMarkAllBtn();
}

function updateMarkAllBtn() {
  const todayDk = todayStr();
  const allDone = data.habits.length > 0 && data.habits.every(h => !!data.logs[`${h.id}_${todayDk}`]);
  const btn = document.getElementById('btn-mark-all');
  if (!btn) return;
  btn.innerHTML = allDone
    ? '<i class="ti ti-checks"></i> Batal Semua'
    : '<i class="ti ti-checks"></i> Tandai Semua';
  btn.classList.toggle('mark-all-undone', allDone);
}

function markAllToday() {
  const todayDk = todayStr();
  const allDone = data.habits.every(h => !!data.logs[`${h.id}_${todayDk}`]);
  data.habits.forEach(h => {
    data.logs[`${h.id}_${todayDk}`] = !allDone;
  });
  saveData();
  render();
}

function switchView(v) {
  currentView = v;
  document.getElementById('today-view').style.display = v === 'today' ? '' : 'none';
  document.getElementById('calendar-view').style.display = v === 'calendar' ? '' : 'none';
  document.getElementById('btn-view-today').classList.toggle('active', v === 'today');
  document.getElementById('btn-view-calendar').classList.toggle('active', v === 'calendar');
  render();
}

/* ── MAIN RENDER ── */
function render() {
  const today = new Date();
  const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const BLN_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  document.getElementById('today-disp').textContent =
    `${HARI[today.getDay()]}, ${today.getDate()} ${BLN_SHORT[today.getMonth()]} ${today.getFullYear()}`;

  const calLabel = document.getElementById('cal-month-label');
  if (calLabel) calLabel.textContent = `${BULAN[viewMonth - 1]} ${viewYear}`;
  document.getElementById('year-label').textContent = String(chartYear);

  if (currentView === 'today') {
    renderTodayView();
  } else {
    const list = document.getElementById('habits-list');
    list.innerHTML = '';

    if (!data.habits.length) {
      list.innerHTML = '<div class="empty-state">Belum ada kebiasaan. Tambahkan di atas.</div>';
    }

    const y = viewYear, m = viewMonth;
    const days = getDaysInMonth(y, m);

    data.habits.forEach(h => {
      const streak = getStreak(h.id);
      let doneThisMonth = 0;
      for (let d = 1; d <= days; d++) {
        if (data.logs[`${h.id}_${dateKey(y, m, d)}`]) doneThisMonth++;
      }
      const todayInView = today.getFullYear() === y && (today.getMonth() + 1) === m ? today.getDate() : days;
      const pct = Math.round(doneThisMonth / Math.max(1, Math.min(todayInView, days)) * 100);

      const block = document.createElement('div');
      block.className = 'habit-block';
      block.innerHTML = `
        <div class="habit-header">
          <span class="habit-name">${escHtml(h.name)}</span>
          <span class="habit-meta"><i class="ti ti-flame" style="font-size:11px;vertical-align:-1px"></i> ${streak} hari</span>
          <span class="habit-meta">${doneThisMonth}/${days} hari</span>
          <button class="del-btn" onclick="deleteHabit('${h.id}')" title="Hapus"><i class="ti ti-trash"></i></button>
        </div>
        ${buildCalendar(h.id)}
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      `;
      list.appendChild(block);
    });
  }

  updateStats();
  updateChartSelect();
  updateChart();
}

function updateStats() {
  const y = viewYear, m = viewMonth;
  const days = getDaysInMonth(y, m);
  let totalDone = 0, maxStreak = 0, possible = 0;
  data.habits.forEach(h => {
    possible += days;
    for (let d = 1; d <= days; d++) {
      if (data.logs[`${h.id}_${dateKey(y, m, d)}`]) totalDone++;
    }
    const s = getStreak(h.id);
    if (s > maxStreak) maxStreak = s;
  });
  const rate = possible > 0 ? Math.round(totalDone / possible * 100) : 0;
  document.getElementById('stat-done').textContent = totalDone;
  document.getElementById('stat-streak').textContent = maxStreak;
  document.getElementById('stat-rate').textContent = rate + '%';
}

function updateChartSelect() {
  const sel = document.getElementById('chart-habit-select');
  const prev = sel.value;
  sel.innerHTML = '';
  if (!data.habits.length) {
    sel.innerHTML = '<option value="">— Belum ada kebiasaan —</option>';
    return;
  }
  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'Semua kebiasaan (total)';
  sel.appendChild(allOpt);
  data.habits.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h.id;
    opt.textContent = h.name;
    sel.appendChild(opt);
  });
  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  else sel.value = 'all';
}

function updateChart() {
  const BLN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const sel = document.getElementById('chart-habit-select');
  const selectedId = sel ? sel.value : 'all';
  const y = chartYear;

  const counts = [];
  for (let m = 1; m <= 12; m++) {
    const days = getDaysInMonth(y, m);
    let count = 0;
    if (selectedId === 'all') {
      data.habits.forEach(h => {
        for (let d = 1; d <= days; d++) {
          if (data.logs[`${h.id}_${dateKey(y, m, d)}`]) count++;
        }
      });
    } else {
      for (let d = 1; d <= days; d++) {
        if (data.logs[`${selectedId}_${dateKey(y, m, d)}`]) count++;
      }
    }
    counts.push(count);
  }

  const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#888780' : '#a0a09c';

  if (chartInst) { chartInst.destroy(); chartInst = null; }
  chartInst = new Chart(document.getElementById('chart-annual'), {
    type: 'bar',
    data: {
      labels: BLN,
      datasets: [{
        label: 'Hari selesai',
        data: counts,
        backgroundColor: counts.map((_, i) => {
          const now = new Date();
          return (y === now.getFullYear() && i === now.getMonth()) ? '#0F6E56' : '#1D9E75';
        }),
        borderRadius: 5,
        maxBarThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} hari selesai` } }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { size: 11 }, autoSkip: false, maxRotation: 0 }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 11 }, stepSize: 1, callback: v => Number.isInteger(v) ? v : '' },
          min: 0
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth() + 1;
  chartYear = now.getFullYear();

  loadData();
  render();

  document.getElementById('btn-tambah').addEventListener('click', addHabit);
  document.getElementById('habit-input').addEventListener('keydown', e => { if (e.key === 'Enter') addHabit(); });

  document.getElementById('btn-mark-all').addEventListener('click', markAllToday);

  document.getElementById('btn-view-today').addEventListener('click', () => switchView('today'));
  document.getElementById('btn-view-calendar').addEventListener('click', () => switchView('calendar'));

  document.getElementById('btn-prev').addEventListener('click', () => {
    viewMonth--; if (viewMonth < 1) { viewMonth = 12; viewYear--; } render();
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    viewMonth++; if (viewMonth > 12) { viewMonth = 1; viewYear++; } render();
  });

  document.getElementById('btn-year-prev').addEventListener('click', () => { chartYear--; updateChart(); document.getElementById('year-label').textContent = chartYear; });
  document.getElementById('btn-year-next').addEventListener('click', () => { chartYear++; updateChart(); document.getElementById('year-label').textContent = chartYear; });

  document.getElementById('chart-habit-select').addEventListener('change', updateChart);
});
