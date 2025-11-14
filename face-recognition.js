// face-api wrapper using face-api.js (which uses tfjs under the hood).
// You MUST download the model files and put them in /models directory:
// - face_recognition_model-weights_manifest.json (+ shard files)
// - face_landmark_68_model-weights_manifest.json
// - tiny_face_detector_model-weights_manifest.json
// Download from https://github.com/justadudewhohacks/face-api.js-models or the face-api repo
//
// Usage: await FaceAPI.loadModels(); then FaceAPI.detectSingleDescriptorFromVideo(video)

const FaceAPI = (function(){
  async function loadModels(){
    // models must be in ./models
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models')
    ]);
    console.log('face-api models loaded');
  }

  async function getDescriptorFromImage(imgElement){
    const detection = await faceapi.detectSingleFace(imgElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    return detection ? detection.descriptor : null;
  }

  async function getDescriptorFromCanvas(canvas){
    const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    return detection ? detection.descriptor : null;
  }

  async function getDescriptorFromVideo(videoEl){
    const detection = await faceapi.detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    return detection ? detection.descriptor : null;
  }

  function euclideanDistance(a, b){
    let sum = 0;
    for (let i=0;i<a.length;i++){
      const d = a[i] - b[i];
      sum += d*d;
    }
    return Math.sqrt(sum);
  }

  function findBestMatch(descriptor, labeledDescriptors, threshold = 0.6){
    // labeledDescriptors = [{ staffCode, name, descriptors: [Float32Array...]}]
    let best = { label: null, distance: Infinity, staff: null };
    for (const staff of labeledDescriptors) {
      for (const d of staff.descriptors){
        const dist = euclideanDistance(d, descriptor);
        if (dist < best.distance) { best.distance = dist; best.label = staff.staffCode; best.staff = staff; }
      }
    }
    if (best.distance <= threshold) return best;
    return null;
  }

  return { loadModels, getDescriptorFromImage, getDescriptorFromVideo, findBestMatch, euclideanDistance, getDescriptorFromCanvas };
})();
