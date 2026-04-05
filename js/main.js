// ============================================================
// CONFIGURATION — update these if your repo details change
// ============================================================
const GITHUB_USER = "yogandrea";
const GITHUB_REPO = "Wellness";
const PHOTOS_PATH = "media/photos";
const VIDEOS_PATH = "media/videos";

// Supported file extensions
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const VIDEO_EXTS = [".mp4", ".webm", ".mov"];

// ============================================================
// HELPERS
// ============================================================
function isImage(name) { return IMAGE_EXTS.some(e => name.toLowerCase().endsWith(e)); }
function isVideo(name) { return VIDEO_EXTS.some(e => name.toLowerCase().endsWith(e)); }

async function fetchGitHubFolder(path) {
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;
  const res  = await fetch(url);
  if (!res.ok) {
    console.warn(`[GitHub] Could not read "${path}" (HTTP ${res.status})`);
    return [];
  }
  const files = await res.json();
  return Array.isArray(files) ? files : [];
}

// ============================================================
// TIMER SAFETY
// ============================================================
let timeoutId = null;
function clearTimers() {
  if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
}

// ============================================================
// Wait for DOM
// ============================================================
document.addEventListener("DOMContentLoaded", async function () {

  // ==========================================================
  // HOME PAGE MONTAGE
  // Auto-discovers every photo + video from GitHub — no JSON
  // file to maintain. Just drop files in media/photos or
  // media/videos and they appear automatically.
  // ==========================================================
  const montageContainer = document.getElementById("montage-container");

  if (montageContainer) {
    console.log("[Montage] Auto-discovering media from GitHub…");

    try {
      // Fetch both folders in parallel
      const [photoFiles, videoFiles] = await Promise.all([
        fetchGitHubFolder(PHOTOS_PATH),
        fetchGitHubFolder(VIDEOS_PATH)
      ]);

      // Filter to supported types and build unified media list
      const mediaList = [
        ...photoFiles
          .filter(f => isImage(f.name))
          .map(f => ({ type: "image", src: f.download_url, name: f.name })),
        ...videoFiles
          .filter(f => isVideo(f.name))
          .map(f => ({ type: "video", src: f.download_url, name: f.name }))
      ];

      // Shuffle so photos and videos are interspersed
      for (let i = mediaList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mediaList[i], mediaList[j]] = [mediaList[j], mediaList[i]];
      }

      console.log(`[Montage] Found ${mediaList.length} items ` +
        `(${photoFiles.filter(f=>isImage(f.name)).length} photos, ` +
        `${videoFiles.filter(f=>isVideo(f.name)).length} videos)`);

      if (mediaList.length === 0) {
        montageContainer.innerHTML =
          `<div style="color:#fff;padding:30px;text-align:center;">
             No media found in <code>${PHOTOS_PATH}</code> or <code>${VIDEOS_PATH}</code>.
           </div>`;
        return;
      }

      let index = 0;

      function playNext() {
        clearTimers();
        montageContainer.innerHTML = "";

        const item = mediaList[index];
        console.log(`[Montage] Showing ${index + 1}/${mediaList.length}: ${item.name}`);

        // ---- BLURRED BACKGROUND LAYER ----
        const bg = document.createElement(item.type === "video" ? "video" : "img");
        bg.src       = item.src;
        bg.className = "media-bg";
        if (item.type === "video") {
          bg.muted = bg.autoplay = bg.loop = bg.playsInline = true;
        }
        montageContainer.appendChild(bg);

        // ---- SHARP FOREGROUND LAYER ----
        const main   = document.createElement(item.type === "video" ? "video" : "img");
        main.src     = item.src;
        main.className = "media-main";

        if (item.type === "video") {
          main.muted       = true;
          main.autoplay    = true;
          main.playsInline = true;
          main.preload     = "auto";

          // Advance when video ends naturally
          main.onended = () => {
            index = (index + 1) % mediaList.length;
            playNext();
          };

          // Skip corrupted / stalled videos after 4 s
          main.onerror = main.onstalled = () => {
            console.warn("[Montage] Video stalled/error — skipping");
            timeoutId = setTimeout(() => {
              index = (index + 1) % mediaList.length;
              playNext();
            }, 4000);
          };

          // Trigger play (handles mobile autoplay restrictions)
          main.oncanplay = () => {
            const p = main.play();
            if (p) p.catch(() => {
              timeoutId = setTimeout(() => {
                index = (index + 1) % mediaList.length;
                playNext();
              }, 4000);
            });
          };

        } else {
          // Image — show for 3.5 s, skip faster if it fails to load
          main.onerror = () => {
            console.warn("[Montage] Image failed:", item.src);
            timeoutId = setTimeout(() => {
              index = (index + 1) % mediaList.length;
              playNext();
            }, 500);
          };
          timeoutId = setTimeout(() => {
            index = (index + 1) % mediaList.length;
            playNext();
          }, 3500);
        }

        montageContainer.appendChild(main);
      }

      playNext();

    } catch (err) {
      console.error("[Montage] Error:", err);
      montageContainer.innerHTML =
        `<div style="color:#fff;padding:30px;text-align:center;font-size:14px;">
           ⚠️ Could not load montage: ${err.message}
         </div>`;
    }
  }

  // ==========================================================
  // SERVICES PAGE — loads survey cards from media/forms.json
  // ==========================================================
  const servicesContainer = document.getElementById("servicesContainer");
  const modal    = document.getElementById("formModal");
  const frame    = document.getElementById("formFrame");
  const closeBtn = document.getElementById("closeForm");

  if (servicesContainer) {
    console.log("[Services] Loading forms.json…");

    try {
      const res = await fetch("media/forms.json");
      if (!res.ok) throw new Error(`HTTP ${res.status} — media/forms.json not found`);
      const forms = await res.json();

      console.log("[Services] Loaded", forms.length, "forms");

      if (!forms || forms.length === 0) {
        servicesContainer.innerHTML =
          `<p style="padding:20px;color:#888;">No services listed yet.</p>`;
      } else {
        forms.forEach(f => {
          const card = document.createElement("div");
          card.className = "service-card";
          card.innerHTML = `
            <h2>${f.title}</h2>
            <p>${f.description}</p>
            <button class="btn open-form" data-form="${f.formUrl}">Open Survey</button>
          `;
          servicesContainer.appendChild(card);
        });

        document.querySelectorAll(".open-form").forEach(btn => {
          btn.addEventListener("click", e => {
            const url = e.currentTarget.dataset.form;
            if (frame) frame.src = url;
            if (modal) {
              modal.style.display = "flex";
              document.body.classList.add("modal-open");
            }
          });
        });
      }

    } catch (err) {
      console.error("[Services]", err.message);
      servicesContainer.innerHTML =
        `<p style="padding:20px;color:#c00;">
           ⚠️ Could not load services: ${err.message}
         </p>`;
    }
  }

  // Close the form modal
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (modal) modal.style.display = "none";
      if (frame) frame.src = "";
      document.body.classList.remove("modal-open");
    });
  }

});
