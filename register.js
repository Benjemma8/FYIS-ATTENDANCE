// Registration page logic
const Register = (function(){
  let video, canvas, stream;
  let samples = []; // base64 images
  let descriptors = []; // Float32Array arrays
  const sampleLimit = 5;

  async function init(){
    video = document.getElementById('regVideo');
    canvas = document.getElementById('regCanvas');
    document.getElementById('captureBtn').addEventListener('click', captureSample);
    document.getElementById('saveBtn').addEventListener('click', saveStaff);
    await startCamera();
    renderSamples();
  }

  async function startCamera(){
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      video.srcObject = stream;
      await video.play();
    } catch (err) {
      alert('Camera access denied or not available.');
    }
  }

  async function captureSample(){
    if (!video) return;
    // draw to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // detect descriptor
    const descriptor = await FaceAPI.getDescriptorFromCanvas(canvas);
    if (!descriptor) {
      alert('No face detected. Try again.');
      return;
    }
    // save base64 sample
    const b64 = canvas.toDataURL('image/jpeg', 0.9);
    samples.push(b64);
    descriptors.push(Array.from(descriptor)); // store plain array for IndexedDB
    renderSamples();

    if (samples.length >= sampleLimit) document.getElementById('captureBtn').disabled = true;
    document.getElementById('saveBtn').disabled = false;
  }

  function renderSamples(){
    const box = document.getElementById('samples');
    box.innerHTML = samples.map((s, i) => `<div><img src="${s}"><div class="small muted">#${i+1}</div></div>`).join('');
  }

  function genStaffCode(){
    const now = new Date();
    const year = now.getFullYear();
    const prefix = 'FAY';
    const stamp = String(Date.now()).slice(-5);
    return `${prefix}-${year}-${stamp}`;
  }

  async function saveStaff(){
    const name = document.getElementById('name').value.trim();
    const role = document.getElementById('role').value.trim() || '';
    if (!name) { alert('Enter name'); return; }
    if (!samples.length) { alert('Capture at least 1 sample'); return; }

    const staffCode = genStaffCode();
    const staff = {
      staffCode,
      name,
      role,
      descriptors, // array of arrays
      images: samples,
      dateRegistered: new Date().toISOString()
    };

    try {
      await DB.addStaff(staff);
      alert(`Staff saved: ${name} — ${staffCode}`);
      // clear
      samples = []; descriptors = [];
      renderSamples();
      document.getElementById('saveBtn').disabled = true;
      document.getElementById('name').value = '';
      document.getElementById('role').value = '';
    } catch (err) {
      console.error(err);
      alert('Failed to save staff.');
    }
  }

  return { init };
})();
