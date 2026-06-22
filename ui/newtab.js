// Initialize WebChannel
let backend = null;

document.addEventListener("DOMContentLoaded", () => {
    // Setup modal elements
    const customizeBtn = document.getElementById("customize-btn");
    const modal = document.getElementById("custom-modal");
    const closeModal = document.getElementById("close-modal");
    const btnSelectWp = document.getElementById("btn-select-wp");
    const btnRemoveWp = document.getElementById("btn-remove-wp");
    const opacitySlider = document.getElementById("opacity-slider");
    const opacityVal = document.getElementById("opacity-val");

    customizeBtn.addEventListener("click", () => {
        modal.classList.add("show");
    });

    closeModal.addEventListener("click", () => {
        modal.classList.remove("show");
    });

    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.classList.remove("show");
        }
    });

    // QWebChannel initialization
    if (typeof qt !== "undefined") {
        new QWebChannel(qt.webChannelTransport, function (channel) {
            backend = channel.objects.backend;
            console.log("QWebChannel initialized on New Tab Page");
            
            // Query current settings
            backend.getSettings((settingsStr) => {
                const settings = JSON.parse(settingsStr);
                const opacity = Math.round(settings.wallpaper_opacity * 100);
                opacitySlider.value = opacity;
                opacityVal.innerText = `${opacity}%`;
            });

            // Load shortcuts
            loadShortcuts();
        });
    } else {
        console.warn("qt is undefined, running in standalone browser mode");
        loadMockShortcuts();
    }

    // Wallpaper action handlers
    btnSelectWp.addEventListener("click", () => {
        if (backend) {
            backend.selectWallpaper();
        }
    });

    btnRemoveWp.addEventListener("click", () => {
        if (backend) {
            backend.removeWallpaper();
        }
    });

    opacitySlider.addEventListener("input", (e) => {
        const val = e.target.value;
        opacityVal.innerText = `${val}%`;
        if (backend) {
            backend.setWallpaperOpacity(val / 100);
        }
    });
});

// Navigate to internal browser links
function navigateInternal(url) {
    if (backend) {
        // Find which tab this page belongs to
        backend.navigateCurrentTab(url);
    } else {
        window.location.href = url;
    }
}

// Function to load actual shortcuts
function loadShortcuts() {
    if (!backend) return;
    backend.getBookmarks((bookmarksStr) => {
        const bookmarks = JSON.parse(bookmarksStr);
        const grid = document.getElementById("shortcuts-grid");
        grid.innerHTML = "";

        // Default useful shortcuts if bookmarks are empty
        const defaultShortcuts = [
            { name: "Google", url: "https://www.google.com", icon: "G" },
            { name: "YouTube", url: "https://www.youtube.com", icon: "Y" },
            { name: "GitHub", url: "https://www.github.com", icon: "Git" },
            { name: "Wikipedia", url: "https://www.wikipedia.org", icon: "W" }
        ];

        const list = bookmarks.length > 0 ? bookmarks.slice(0, 8) : defaultShortcuts;

        list.forEach(item => {
            const el = document.createElement("a");
            el.className = "shortcut-item";
            el.href = item.url;
            el.addEventListener("click", (e) => {
                e.preventDefault();
                if (backend) {
                    backend.navigateCurrentTab(item.url);
                } else {
                    window.location.href = item.url;
                }
            });

            const initial = item.name.substring(0, 2);
            el.innerHTML = `
                <div class="shortcut-icon">${item.icon || initial}</div>
                <div class="shortcut-name">${item.name}</div>
            `;
            grid.appendChild(el);
        });
    });
}

function loadMockShortcuts() {
    const grid = document.getElementById("shortcuts-grid");
    const defaultShortcuts = [
        { name: "Google", url: "https://www.google.com", icon: "G" },
        { name: "YouTube", url: "https://www.youtube.com", icon: "Y" },
        { name: "GitHub", url: "https://www.github.com", icon: "Git" },
        { name: "Wikipedia", url: "https://www.wikipedia.org", icon: "W" }
    ];
    grid.innerHTML = "";
    defaultShortcuts.forEach(item => {
        const el = document.createElement("a");
        el.className = "shortcut-item";
        el.href = item.url;
        el.innerHTML = `
            <div class="shortcut-icon">${item.icon}</div>
            <div class="shortcut-name">${item.name}</div>
        `;
        grid.appendChild(el);
    });
}
