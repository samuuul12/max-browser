let backend = null;

document.addEventListener("DOMContentLoaded", () => {
    setupTabSwitching();
    initWebChannel();
});

function setupTabSwitching() {
    const sidebarItems = document.querySelectorAll(".sidebar-item");
    const tabContents = document.querySelectorAll(".tab-content");

    sidebarItems.forEach(item => {
        item.addEventListener("click", () => {
            // Remove active from all sidebar items
            sidebarItems.forEach(i => i.classList.remove("active"));
            // Add active to clicked item
            item.classList.add("active");

            // Hide all tab contents
            tabContents.forEach(content => content.classList.remove("active"));
            // Show target tab content
            const targetTab = item.getAttribute("data-tab");
            document.getElementById(`tab-content-${targetTab}`).classList.add("active");
        });
    });
}

function initWebChannel() {
    const btnSelectWp = document.getElementById("btn-select-wp");
    const btnRemoveWp = document.getElementById("btn-remove-wp");
    const opacitySlider = document.getElementById("opacity-slider");
    const opacityVal = document.getElementById("opacity-val");
    const currentWpPath = document.getElementById("current-wp-path");
    const downloadPathText = document.getElementById("download-path-text");

    const homeRadios = document.getElementsByName("home-page-type");
    const customHomeUrl = document.getElementById("custom-home-url");
    const btnSaveHome = document.getElementById("btn-save-home");
    const searchEngineSelect = document.getElementById("search-engine-select");

    const btnClearHistory = document.getElementById("btn-clear-history");
    const btnClearBookmarks = document.getElementById("btn-clear-bookmarks");
    const btnClearCache = document.getElementById("btn-clear-cache");

    // Enable/disable home page input based on radio
    homeRadios.forEach(radio => {
        radio.addEventListener("change", () => {
            customHomeUrl.disabled = radio.value !== "custom";
        });
    });

    if (typeof qt !== "undefined") {
        new QWebChannel(qt.webChannelTransport, function (channel) {
            backend = channel.objects.backend;
            console.log("QWebChannel connected to Settings Page");

            // 1. Load Settings
            backend.getSettings((settingsStr) => {
                const settings = JSON.parse(settingsStr);
                
                // Wallpaper path
                if (settings.wallpaper_path) {
                    currentWpPath.innerText = settings.wallpaper_path;
                } else {
                    currentWpPath.innerText = "Nenhum wallpaper selecionado";
                }

                // Opacity
                const opacity = Math.round(settings.wallpaper_opacity * 100);
                opacitySlider.value = opacity;
                opacityVal.innerText = `${opacity}%`;

                // Search Engine
                if (settings.search_engine) {
                    searchEngineSelect.value = settings.search_engine;
                }

                // Home Page
                if (settings.home_page_type) {
                    const r = Array.from(homeRadios).find(rad => rad.value === settings.home_page_type);
                    if (r) {
                        r.checked = true;
                        customHomeUrl.disabled = r.value !== "custom";
                    }
                }
                if (settings.home_page_url) {
                    customHomeUrl.value = settings.home_page_url;
                }
            });

            // 2. Load Downloads Directory Path
            backend.getDownloadDirectory((dirPath) => {
                downloadPathText.innerText = dirPath;
            });

            // 3. Connect update listeners for wallpaper
            backend.wallpaperChanged.connect((path, opacity) => {
                currentWpPath.innerText = path || "Nenhum wallpaper selecionado";
                const opPct = Math.round(opacity * 100);
                opacitySlider.value = opPct;
                opacityVal.innerText = `${opPct}%`;
            });

            // Bind Wallpaper Actions
            btnSelectWp.addEventListener("click", () => {
                backend.selectWallpaper();
            });

            btnRemoveWp.addEventListener("click", () => {
                backend.removeWallpaper();
            });

            opacitySlider.addEventListener("input", (e) => {
                const val = e.target.value;
                opacityVal.innerText = `${val}%`;
                backend.setWallpaperOpacity(val / 100);
            });

            // Bind Home Page Save
            btnSaveHome.addEventListener("click", () => {
                const selectedType = Array.from(homeRadios).find(r => r.checked).value;
                let url = customHomeUrl.value.trim();
                
                if (selectedType === "custom" && url) {
                    if (!url.startsWith("http://") && !url.startsWith("https://")) {
                        url = "https://" + url;
                        customHomeUrl.value = url;
                    }
                }
                
                backend.setHomePage(selectedType, url);
                alert("Configuração de página inicial salva!");
            });

            // Bind Search Engine Selector
            searchEngineSelect.addEventListener("change", (e) => {
                backend.setSearchEngine(e.target.value);
            });

            // Bind Clear actions
            btnClearHistory.addEventListener("click", () => {
                if (confirm("Tem certeza que deseja limpar todo o histórico?")) {
                    backend.clearHistory();
                    alert("Histórico limpo!");
                }
            });

            btnClearBookmarks.addEventListener("click", () => {
                if (confirm("Tem certeza que deseja apagar todos os favoritos?")) {
                    backend.clearBookmarks();
                    alert("Favoritos apagados!");
                }
            });

            btnClearCache.addEventListener("click", () => {
                backend.clearBrowserCache();
                alert("Cache do navegador limpo!");
            });
        });
    } else {
        console.warn("Running in standalone browser mode - settings mock loaded");
        downloadPathText.innerText = "/home/usuario/Downloads";
    }
}
