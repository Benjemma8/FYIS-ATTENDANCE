// Attendance capture + recognition
const Attendance = (function(){
  let video, canvas, stream;
  let running = false;

  async function init(){
    video = document.getElementById('liveVideo');
    canvas = document.getElementById('snapCanvas');
    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('captureNow').addEventListener('click', captureAndRecognize);
  }

  async function start(){
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      video.srcObject = stream;
      await video.play();
      running = true;
      document.getElementById('startBtn').disabled = true;
      document.getElementById('stopBtn').disabled = false;
      document.getElementById('captureNow').disabled = false;
      showMessage('Camera started');
    } catch (err) {
      alert('Cannot access camera');
    }
  }

  function stop(){
    if (stream) {
      stream.getTracks().forEach(t=>t.stop());
      video.srcObject = null;
    }
    running = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('captureNow').disabled = true;
    showMessage('Camera stopped');
  }

  async function captureAndRecognize(){
    if (!running) { alert('Start camera first'); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const descriptor = await FaceAPI.getDescriptorFromCanvas(canvas);
    if (!descriptor) {
      showMessage('No face detected. Try again.');
      return;
    }

    // build labeled descriptors from DB
    const staff = await DB.getAllStaff();
    if (!staff.length) { alert('No staff registered'); return; }
    const labeled = staff.map(s => ({ staffCode: s.staffCode, name: s.name, descriptors: s.descriptors }));
    const match = FaceAPI.findBestMatch(Array.from(descriptor), labeled, 0.6);
    const snap = canvas.toDataURL('image/jpeg', 0.9);
    const now = new Date();
    const date = now.toISOString().slice(0,10);
    const time = now.toTimeString().slice(0,8);
    if (match) {
      const staffObj = match.staff;
      // determine status: early/on-time/late using default resumption 08:00
      const resumption = localStorage.getItem('fayis_resumption') || '08:00';
      const status = computeStatus(time, resumption);
      const entry = { staffCode: staffObj.staffCode, name: staffObj.name, date, time, snapshot: snap, status, timestamp: now.toISOString() };
      await DB.addAttendance(entry);
      showResult(`Recognized: ${staffObj.name} (${staffObj.staffCode}) — ${status}`);
    } else {
      showResult('No match found');
    }

    // refresh dashboard ephemeral UI if open (no-op)
  }

  function computeStatus(timeStr, resumptionStr){
    // timeStr "HH:MM:SS" resumption "HH:MM"
    const t = timeStr.slice(0,5);
    if (t < resumptionStr) return 'Early';
    if (t === resumptionStr || (t > resumptionStr && minutesDiff(t, resumptionStr) <= 15)) return 'OnTime';
    return 'Late';
  }
  function minutesDiff(a, b){
    const [ah,am] = a.split(':').map(Number);
    const [bh,bm] = b.split(':').map(Number);
    return (ah*60+am) - (bh*60+bm);
  }

  function showMessage(msg){
    document.getElementById('resultBox').innerHTML = `<div class="result">${msg}</div>`;
  }
  function showResult(msg){
    document.getElementById('resultBox').innerHTML = `<div class="result"><strong>${msg}</strong></div>`;
  }

  return { init };
})();
