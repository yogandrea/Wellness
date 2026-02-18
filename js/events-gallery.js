// ===============================
// CONFIGURE THIS
// ===============================
const username = "yogandrea";
const repo = "Wellness";
const folder = "media/Events";

// GitHub API
const apiURL = `https://api.github.com/repos/${username}/${repo}/contents/${folder}`;

let images = [];
let currentIndex = 0;

// ===============================
// LOAD IMAGES FROM GITHUB
// ===============================
async function loadImages() {
    const response = await fetch(apiURL);
    const data = await response.json();

    // Filter JPG only
    images = data
        .filter(file => file.name.toLowerCase().endsWith(".jpg"))
        .sort((a, b) => new Date(b.git_url) - new Date(a.git_url)); // newest first

    if (images.length === 0) return;

    // Latest event
    document.getElementById("latest-event").innerHTML =
        `<img src="${images[0].download_url}" class="latest-img">`;

    showImage(0);
}

// ===============================
// SHOW IMAGE
// ===============================
function showImage(index) {
    const img = document.getElementById("galleryImage");
    img.src = images[index].download_url;
}

// ===============================
// NAVIGATION
// ===============================
document.getElementById("prevBtn").onclick = () => {
    currentIndex--;
    if (currentIndex < 0) currentIndex = images.length - 1;
    showImage(currentIndex);
};

document.getElementById("nextBtn").onclick = () => {
    currentIndex++;
    if (currentIndex >= images.length) currentIndex = 0;
    showImage(currentIndex);
};

// Load when page ready
loadImages();
