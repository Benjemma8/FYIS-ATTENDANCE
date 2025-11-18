const FaceAPI = (function(){
  let modelsLoaded = false;

  async function loadModels(){
    if (modelsLoaded) return;
    // models must be at /models
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]);
    modelsLoaded = true;
    console.log('face models loaded');
  }

  // returns descriptor Float32Array or null
  async function descriptorFromCanvas(canvas){
    const det = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    return det ? det.descriptor : null;
  }

  function euclideanDistance(a, b){
    let sum = 0;
    for (let i=0;i<a.length;i++){
      const d = a[i] - b[i];
      sum += d*d;
    }
    return Math.sqrt(sum);
  }

  // staffList: [{ staffCode, name, descriptors: [Array,...], images: [...] }]
  function findMatch(descriptor, staffList, threshold = 0.62){
    if (!descriptor || !staffList || !staffList.length) return null;
    let best = { staff: null, distance: Infinity };
    for (const s of staffList){
      if (!s.descriptors) continue;
      for (const d of s.descriptors){
        const dist = euclideanDistance(d, descriptor);
        if (dist < best.distance){ best.distance = dist; best.staff = s; }
      }
    }
    if (best.distance <= threshold) return { staff: best.staff, distance: best.distance };
    return null;
  }

  return { loadModels, descriptorFromCanvas, findMatch };
})();
