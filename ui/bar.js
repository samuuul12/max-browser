let backend = null;
let activeTabId = null;

document.addEventListener("DOMContentLoaded", () => {
    const backBtn = document.getElementById("back-btn");
    const forwardBtn = document.getElementById("forward-btn");
    const reloadBtn = document.getElementById("reload-btn");
    const homeBtn = document.getElementById("home-btn");
    const newTabBtn = document.getElementById("new-tab-btn");
    const addressInput = document.getElementById("address-input");
    const bookmarkBtn = document.getElementById("bookmark-btn");
    const settingsBtn = document.getElementById("settings-btn");

    // Initialize WebChannel
    if (typeof qt !== "undefined") {
        new QWebChannel(qt.webChannelTransport, function (channel) {
            backend = channel.objects.backend;
            console.log("QWebChannel connected to Top Bar");

            // Register event listeners for signals from Python
            backend.tabsUpdated.connect((tabsJson) => {
                const tabs = JSON.parse(tabsJson);
                renderTabs(tabs);
            });

            backend.activeTabChanged.connect((tabId, url, title, canGoBack, canGoForward, isBookmarked) => {
                activeTabId = tabId;
                updateAddressBar(url);
                updateNavigationButtons(canGoBack, canGoForward);
                updateBookmarkButton(isBookmarked);
                setActiveTabClass(tabId);
            });

            backend.tabLoadingProgress.connect((tabId, progress) => {
                // If we want a progress bar or loading spinner, handle it here.
                if (tabId === activeTabId) {
                    if (progress < 100) {
                        // loading
                        reloadBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`;
                        reloadBtn.title = "Parar";
                    } else {
                        // completed
                        reloadBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`;
                        reloadBtn.title = "Recarregar";
                    }
                }
            });

            // Signal initial startup check to backend
            backend.barReady();
        });
    }

    // Navigation action handlers
    backBtn.addEventListener("click", () => {
        if (backend && activeTabId) backend.navigate(activeTabId, "back");
    });

    forwardBtn.addEventListener("click", () => {
        if (backend && activeTabId) backend.navigate(activeTabId, "forward");
    });

    reloadBtn.addEventListener("click", () => {
        if (backend && activeTabId) {
            // If the icon is 'Stop' (X), stop loading. Otherwise, reload.
            const isStop = reloadBtn.title === "Parar";
            backend.navigate(activeTabId, isStop ? "stop" : "reload");
        }
    });

    homeBtn.addEventListener("click", () => {
        if (backend && activeTabId) backend.navigate(activeTabId, "home");
    });

    newTabBtn.addEventListener("click", () => {
        if (backend) backend.newTab();
    });

    // Address input handling
    addressInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            let url = addressInput.value.trim();
            if (url) {
                // If it doesn't look like a URL, and does not have a dot without spaces, pass it as raw search query
                if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("browser://")) {
                    if (url.includes(".") && !url.includes(" ")) {
                        url = "https://" + url;
                    }
                }
                if (backend && activeTabId) {
                    backend.loadUrl(activeTabId, url);
                    addressInput.blur();
                }
            }
        }
    });

    addressInput.addEventListener("focus", () => {
        // Select all text on click
        setTimeout(() => addressInput.select(), 50);
    });

    // Bookmark Toggle
    bookmarkBtn.addEventListener("click", () => {
        if (backend && activeTabId) {
            backend.toggleBookmark(activeTabId);
        }
    });

    // Settings Dropdown Menu (delegated to native PyQt6 QMenu)
    settingsBtn.addEventListener("click", () => {
        if (backend) {
            // Get screen coordinates of the button to position QMenu
            const rect = settingsBtn.getBoundingClientRect();
            // Pass global coordinates (relative to window)
            backend.showSettingsMenu(rect.left, rect.bottom);
        }
    });
});

// Render tabs in HTML
function renderTabs(tabs) {
    const list = document.getElementById("tabs-list");
    list.innerHTML = "";

    tabs.forEach(tab => {
        const el = document.createElement("div");
        el.className = "tab";
        el.id = `tab-${tab.id}`;
        if (tab.id === activeTabId) {
            el.classList.add("active");
        }

        const titleText = tab.title || "Carregando...";
        
        el.innerHTML = `
            <span class="tab-title" title="${titleText}">${titleText}</span>
            <span class="tab-close" title="Fechar guia">&times;</span>
        `;

        // Click to activate tab
        el.addEventListener("mousedown", (e) => {
            // Ignore if closing button is clicked
            if (e.target.classList.contains("tab-close")) return;
            if (backend) {
                backend.selectTab(tab.id);
            }
        });

        // Click close tab
        el.querySelector(".tab-close").addEventListener("click", (e) => {
            e.stopPropagation();
            if (backend) {
                backend.closeTab(tab.id);
            }
        });

        list.appendChild(el);
    });
}

function setActiveTabClass(tabId) {
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(t => {
        if (t.id === `tab-${tabId}`) {
            t.classList.add("active");
        } else {
            t.classList.remove("active");
        }
    });
}

function updateAddressBar(url) {
    const addressInput = document.getElementById("address-input");
    const lockIcon = document.getElementById("lock-icon");

    if (url.startsWith("file://") && url.includes("/ui/newtab.html")) {
        addressInput.value = "";
        lockIcon.className.baseVal = "lock-icon unsecure";
    } else if (url.startsWith("file://") && url.includes("/ui/")) {
        // Pretty print internal pages
        const filename = url.substring(url.lastIndexOf("/") + 1, url.indexOf(".html"));
        addressInput.value = `browser://${filename}`;
        lockIcon.className.baseVal = "lock-icon";
    } else {
        addressInput.value = url;
        // Check HTTPS vs HTTP for lock icon color
        if (url.startsWith("https://")) {
            lockIcon.className.baseVal = "lock-icon";
        } else {
            lockIcon.className.baseVal = "lock-icon unsecure";
        }
    }
}

function updateNavigationButtons(canGoBack, canGoForward) {
    document.getElementById("back-btn").disabled = !canGoBack;
    document.getElementById("forward-btn").disabled = !canGoForward;
}

function updateBookmarkButton(isBookmarked) {
    const btn = document.getElementById("bookmark-btn");
    if (isBookmarked) {
        btn.classList.add("active");
        btn.title = "Remover favorito";
    } else {
        btn.classList.remove("active");
        btn.title = "Favoritar esta página";
    }
}
