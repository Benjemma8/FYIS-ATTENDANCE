const Attendance = (function(){
  const video = document.getElementById('video');
  const overlay = document.getElementById('overlay');
  const statusBox = document.getElementById('statusBox');
  const successOverlay = document.getElementById('successOverlay');
  const successText = document.getElementById('successText');
  const successSub = document.getElementById('successSub');
  const tick = document.getElementById('tickSound');

  let stream = null;
  let running = false;
  let staffCache = []; // list of staff with descriptors

  async function init(){
    statusBox.textContent = 'Loading models...';
    await DB.open();
    await FaceAPI.loadModels();
    staffCache = await DB.getAllStaff(); // each staff should have .descriptors (array of arrays)
    statusBox.textContent = `Models loaded. ${staffCache.length} staff registered. Starting camera...`;
    await startCamera();
    startRecognitionLoop();
  }

  async function startCamera(){
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      video.srcObject = stream;
      await video.play();
      // set overlay size
      overlay.width = video.videoWidth || 480;
      overlay.height = video.videoHeight || 360;
      statusBox.textContent = 'Camera started. Stand in front of camera.';
      running = true;
    } catch (err){
      console.error('Camera start failed', err);
      statusBox.textContent = 'Cannot access camera. Check permissions.';
      running = false;
    }
  }

  let busy = false;
  async function startRecognitionLoop(){
    const ctx = overlay.getContext('2d');
    while (true){
      if (!running) { await wait(500); continue; }
      // draw minimal preview rectangle
      ctx.clearRect(0,0,overlay.width,overlay.height);
      // try capture and recognize (throttle to ~1.2s)
      if (!busy){
        busy = true;
        try {
          ctx.drawImage(video, 0, 0, overlay.width, overlay.height);
          const descriptor = await FaceAPI.descriptorFromCanvas(overlay);
          if (descriptor){
            statusBox.textContent = 'Face detected. Checking...';
            const match = FaceAPI.findMatch(descriptor, staffCache, 0.62);
            if (match){
              // found staff
              await handleMatch(match.staff);
            } else {
              statusBox.textContent = 'Face not recognized. Please register.';
            }
          } else {
            statusBox.textContent = 'No face detected. Adjust position.';
          }
        } catch (err){
          console.error(err);
        } finally {
          // small delay before next attempt
          await wait(1200);
          busy = false;
        }
      }
      await wait(300);
    }
  }

  async function handleMatch(staff){
    const now = new Date();
    const date = now.toISOString().slice(0,10);
    const time = now.toTimeString().slice(0,8);
    // prevent duplicate for same day
    const already = await DB.hasAttendanceToday(staff.staffCode, date);
    if (already){
      statusBox.textContent = `${staff.name} already marked today.`;
      showSuccess(`${staff.name}`, `${time} — Already marked`);
      return;
    }
    // snapshot
    const snap = captureSnapshot();
    // compute status (resumption default 08:00) stored in localStorage or default
    const resumption = localStorage.getItem('fayis_resumption') || '08:00';
    const status = computeStatus(time.slice(0,5), resumption);
    // store attendance
    const entry = { staffCode: staff.staffCode, name: staff.name, date, time, snapshot: snap, status, timestamp: now.toISOString() };
    await DB.addAttendance(entry);
    statusBox.textContent = `Attendance recorded: ${staff.name} — ${time}`;
    showSuccess(`${staff.name}`, `${time} — ${status}`);
    // update cache (not required)
  }

  function captureSnapshot(){
    const c = document.createElement('canvas');
    c.width = overlay.width; c.height = overlay.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(video, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  }

  function showSuccess(name, sub){
    successText.textContent = `GOOD MORNING ${name.toUpperCase()}`;
    successSub.textContent = sub;
    successOverlay.style.display = 'flex';
    successOverlay.setAttribute('aria-hidden','false');
    // play sound if available
    try { tick.currentTime = 0; tick.play(); } catch(e){}
    setTimeout(()=> {
      successOverlay.style.display = 'none';
      successOverlay.setAttribute('aria-hidden','true');
    }, 2000);
  }

  function computeStatus(timeHHMM, resumption){
    if (timeHHMM < resumption) return 'Early';
    const diff = minutesDiff(timeHHMM, resumption);
    if (diff <= 15 && diff >= 0) return 'OnTime';
    return 'Late';
  }
  function minutesDiff(a,b){
    const [ah,am] = a.split(':').map(Number);
    const [bh,bm] = b.split(':').map(Number);
    return (ah*60+am) - (bh*60+bm);
  }

  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

  // attach init to window so index.html can call it after scripts loaded
  window.AttendanceInit = init;
  // auto-run when page loads and scripts are ready
  window.addEventListener('load', ()=> {
    // Slight delay to ensure face-api is ready
    (async ()=> {
      try {
        await DB.open();
        await FaceAPI.loadModels();
        await AttendanceInit();
      } catch(e){
        console.error('Startup error', e);
        statusBox.textContent = 'Startup failed. Check models or camera.';
      }
    })();
  });
  return { };
})();
