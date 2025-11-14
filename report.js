// Builds monthly report and CSV export
const Report = (function(){
  async function init(){
    // populate month input default to current month
    const input = document.getElementById('month');
    const now = new Date();
    const val = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    input.value = val;

    // populate staff select
    const staff = await DB.getAllStaff();
    const sel = document.getElementById('staffSelect');
    staff.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.staffCode;
      opt.textContent = `${s.name} — ${s.staffCode}`;
      sel.appendChild(opt);
    });

    document.getElementById('genBtn').addEventListener('click', generate);
    document.getElementById('csvBtn').addEventListener('click', exportCSV);
  }

  let lastReport = null;

  async function generate(){
    const ym = document.getElementById('month').value; // YYYY-MM
    if (!ym) return alert('Select month');
    const staffCode = document.getElementById('staffSelect').value;
    const data = await DB.getAttendanceByMonth(ym);
    // filter by staff if chosen
    const filtered = staffCode ? data.filter(d => d.staffCode === staffCode) : data;
    // group by staff
    const grouped = {};
    filtered.forEach(r => {
      if (!grouped[r.staffCode]) grouped[r.staffCode] = { name: r.name, present: 0, late: 0, early: 0, records: [] };
      grouped[r.staffCode].present++;
      if (r.status === 'Late') grouped[r.staffCode].late++;
      if (r.status === 'Early') grouped[r.staffCode].early++;
      grouped[r.staffCode].records.push(r);
    });

    const out = Object.keys(grouped).map(k => ({ staffCode: k, name: grouped[k].name, present: grouped[k].present, late: grouped[k].late, early: grouped[k].early }));
    lastReport = { ym, rows: out, raw: filtered };

    const area = document.getElementById('reportArea');
    if (!out.length) { area.innerHTML = '<div class="muted">No records for selected month.</div>'; document.getElementById('csvBtn').disabled = true; return; }
    document.getElementById('csvBtn').disabled = false;
    area.innerHTML = out.map(r => `<div class="row"><div style="flex:1"><strong>${r.name}</strong> <span class="muted">(${r.staffCode})</span></div><div>Present: ${r.present}</div><div class="muted" style="margin-left:12px">Late: ${r.late}</div></div>`).join('');
  }

  function exportCSV(){
    if (!lastReport) return alert('Generate report first');
    const rows = lastReport.rows;
    const csv = [
      ['staffCode','name','present','late','early'].join(',')
    ].concat(rows.map(r => [r.staffCode, `"${r.name}"`, r.present, r.late, r.early].join(','))).join('\n');

    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance_${lastReport.ym}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  return { init, generate, exportCSV };
})();
