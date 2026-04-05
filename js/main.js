// ============================================================
// GLOBAL SAFE TIMER HANDLING (prevents blank screen freezes)
// ============================================================
let timeoutId = null;

function clearTimers() {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

// ============================================================
// Wait for DOM before doing anything
// ============================================================
document.addEventListener("DOMContentLoaded", function () {

  // ============================================================
  // ===== HOME PAGE PHOTO + VIDEO MONTAGE ======================
  // ============================================================
  const montageContainer = document.getElementById("montage-container");

  if (montageContainer) {
    console.log("[Montage] Container found — fetching media.json…");

    fetch("media/media.json")
      .then(res => {
        if (!res.ok) throw new Error("HTTP " + res.status + " — " + res.url);
        return res.json();
      })
      .then(mediaList => {
        console.log("[Montage] Loaded", mediaList.length, "items:", mediaList);

        if (!mediaList || mediaList.length === 0) {
          console.warn("[Montage] media.json is empty — nothing to show.");
          return;
        }

        let index = 0;

        function nextIndex() {
          index = (index + 1) % mediaList.length;
        }

        function playNext() {
          clearTimers();
          montageContainer.innerHTML = "";

          const item = mediaList[index];
          console.log("[Montage] Playing item", index, "→", item.src);

          // ---------- BACKGROUND (blurred fill) ----------
          const bg = document.createElement(item.type === "video" ? "video" : "img");
          bg.src = item.src;
          bg.className = "media-bg";

          if (item.type === "video") {
            bg.muted = true;
            bg.autoplay = true;
            bg.loop = true;
            bg.playsInline = true;
          }

          montageContainer.appendChild(bg);

          // ---------- MAIN MEDIA ----------
          const main = document.createElement(item.type === "video" ? "video" : "img");
          main.src = item.src;
          main.className = "media-main";

          if (item.type === "video") {
            main.muted = true;
            main.autoplay = true;
            main.playsInline = true;
            main.preload = "auto";

            main.onended = () => { nextIndex(); playNext(); };

            main.onerror = main.onstalled = () => {
              console.warn("[Montage] Video error/stall — skipping in 4s");
              timeoutId = setTimeout(() => { nextIndex(); playNext(); }, 4000);
            };

            main.oncanplay = () => {
              const p = main.play();
              if (p) {
                p.catch(() => {
                  console.warn("[Montage] Autoplay blocked — skipping in 4s");
                  timeoutId = setTimeout(() => { nextIndex(); playNext(); }, 4000);
                });
              }
            };

          } else {
            // image: show for 3.5 s then advance
            main.onerror = () => {
              console.warn("[Montage] Image failed to load:", item.src);
              timeoutId = setTimeout(() => { nextIndex(); playNext(); }, 1000);
            };
            timeoutId = setTimeout(() => { nextIndex(); playNext(); }, 3500);
          }

          montageContainer.appendChild(main);
        }

        playNext();
      })
      .catch(err => {
        console.error("[Montage] Failed to load media.json:", err.message);
        // Show a visible error inside the montage container so it's obvious
        montageContainer.innerHTML =
          `<div style="color:#fff;padding:20px;font-size:14px;">
             ⚠️ Montage unavailable: ${err.message}<br>
             Check that <code>media/media.json</code> exists in your repo.
           </div>`;
      });
  }

  // ============================================================
  // ===== SERVICES PAGE FORM MODAL =============================
  // ============================================================
  const servicesContainer = document.getElementById("servicesContainer");
  const modal   = document.getElementById("formModal");
  const frame   = document.getElementById("formFrame");
  const closeBtn = document.getElementById("closeForm");

  if (servicesContainer) {
    console.log("[Services] Container found — fetching forms.json…");

    fetch("media/forms.json")
      .then(res => {
        if (!res.ok) throw new Error("HTTP " + res.status + " — " + res.url);
        return res.json();
      })
      .then(forms => {
        console.log("[Services] Loaded", forms.length, "forms:", forms);

        if (!forms || forms.length === 0) {
          servicesContainer.innerHTML =
            `<p style="padding:20px;color:#888;">No services available yet.</p>`;
          return;
        }

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

        // Attach click handlers AFTER cards are in the DOM
        document.querySelectorAll(".open-form").forEach(btn => {
          btn.addEventListener("click", e => {
            const url = e.currentTarget.dataset.form;
            console.log("[Services] Opening form:", url);
            if (frame) frame.src = url;
            if (modal) {
              modal.style.display = "flex";
              document.body.classList.add("modal-open");
            }
          });
        });
      })
      .catch(err => {
        console.error("[Services] Failed to load forms.json:", err.message);
        servicesContainer.innerHTML =
          `<p style="padding:20px;color:red;">
             ⚠️ Could not load services: ${err.message}<br>
             Check that <code>media/forms.json</code> exists in your repo.
           </p>`;
      });
  }

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (modal)  modal.style.display = "none";
      if (frame)  frame.src = "";
      document.body.classList.remove("modal-open");
    });
  }

});
