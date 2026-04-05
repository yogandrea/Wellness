// main.js — global site logic only
// NOTE: All calendar/booking code lives in index.html's <script type="module">.
//       Do NOT reference renderCalendar, currentMonthOffset, or supabase here.

// ── Montage / hero image carousel (if used) ──────────────────────────────────
const montageImages = [
  // Add your image paths here, e.g.:
  // "images/hero1.jpg",
  // "images/hero2.jpg",
];

function initMontage() {
  const container = document.getElementById("montage-container");
  if (!container || montageImages.length === 0) return;

  let index = 0;
  const img = document.createElement("img");
  img.src = montageImages[0];
  img.style.cssText = "width:100%;transition:opacity 0.6s;";
  container.appendChild(img);

  setInterval(() => {
    img.style.opacity = "0";
    setTimeout(() => {
      index = (index + 1) % montageImages.length;
      img.src = montageImages[index];
      img.style.opacity = "1";
    }, 600);
  }, 4000);
}

document.addEventListener("DOMContentLoaded", () => {
  initMontage();
});
