// Open admin login modal
document.getElementById("adminBtn").onclick = () => {
    document.getElementById("loginModal").style.display = "block";
};

// Close modal on outside click
window.onclick = (e) => {
    if (e.target === document.getElementById("loginModal")) {
        document.getElementById("loginModal").style.display = "none";
    }
};

// Admin login
document.getElementById("loginBtn").onclick = () => {
    const pass = document.getElementById("adminPass").value;
    if (pass === "admin123") {
        window.location.href = "dashboard.html";
    } else {
        alert("Wrong password");
    }
};

// CAMERA INITIALIZATION
async function startCamera() {
    const video = document.getElementById("video");

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" }
        });

        video.srcObject = stream;

    } catch (err) {
        console.log("Camera Error:", err);
        alert("Camera access blocked. Please allow permission.");
    }
}

window.onload = async () => {
    await startCamera();
};
