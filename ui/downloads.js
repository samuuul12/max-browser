let backend = null;
let allDownloads = [];

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search-input");

    // Connect to backend QWebChannel
    if (typeof qt !== "undefined") {
        new QWebChannel(qt.webChannelTransport, function (channel) {
            backend = channel.objects.backend;
            console.log("QWebChannel connected to Downloads Page");
            loadDownloads();

            // Listen for download updates in real-time
            backend.downloadUpdated.connect((downloadInfoJson) => {
                const info = JSON.parse(downloadInfoJson);
                updateDownloadItem(info);
            });
            
            // Listen for general list updates
            backend.downloadsListUpdated.connect(() => {
                loadDownloads();
            });
        });
    } else {
        console.warn("Running downloads in standalone mode");
        loadMockDownloads();
    }

    // Search filter
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        filterDownloads(query);
    });
});

function loadDownloads() {
    if (!backend) return;
    backend.getDownloads((downloadsStr) => {
        allDownloads = JSON.parse(downloadsStr);
        renderDownloads(allDownloads);
    });
}

function filterDownloads(query) {
    if (!query) {
        renderDownloads(allDownloads);
        return;
    }
    const filtered = allDownloads.filter(item => 
        item.filename.toLowerCase().includes(query) || 
        item.url.toLowerCase().includes(query)
    );
    renderDownloads(filtered);
}

function renderDownloads(items) {
    const listContainer = document.getElementById("downloads-list");
    const emptyState = document.getElementById("empty-state");

    if (items.length === 0) {
        listContainer.innerHTML = "";
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";
    listContainer.innerHTML = "";

    // Sort downloads: active first, then completed/cancelled (newest first)
    items.sort((a, b) => {
        if (a.state === "IN_PROGRESS" && b.state !== "IN_PROGRESS") return -1;
        if (a.state !== "IN_PROGRESS" && b.state === "IN_PROGRESS") return 1;
        return b.startTime - a.startTime;
    });

    items.forEach(item => {
        createOrUpdateItemDom(item, listContainer);
    });
}

function createOrUpdateItemDom(item, container) {
    let el = document.getElementById(`download-item-${item.id}`);
    const isNew = !el;

    if (isNew) {
        el = document.createElement("div");
        el.className = "download-item";
        el.id = `download-item-${item.id}`;
        container.appendChild(el);
    }

    const percent = item.totalBytes > 0 ? Math.round((item.receivedBytes / item.totalBytes) * 100) : 0;
    
    // Status text definition
    let statusText = "";
    let fillClass = "";
    let actionsHtml = "";

    if (item.state === "IN_PROGRESS") {
        const speedKbs = (item.speed / 1024).toFixed(1);
        const receivedMb = (item.receivedBytes / (1024 * 1024)).toFixed(1);
        const totalMb = (item.totalBytes / (1024 * 1024)).toFixed(1);
        statusText = `${percent}% - ${receivedMb} MB de ${totalMb} MB (${speedKbs} KB/s)`;
        actionsHtml = `
            <button class="btn-small btn-danger-small" onclick="cancelDownload('${item.id}')">Cancelar</button>
        `;
    } else if (item.state === "COMPLETED") {
        const totalMb = (item.totalBytes / (1024 * 1024)).toFixed(1);
        statusText = `Concluído - ${totalMb} MB`;
        fillClass = "completed";
        actionsHtml = `
            <button class="btn-small btn-primary-small" onclick="openFile('${item.filePath}')">Abrir Arquivo</button>
            <button class="btn-small btn-secondary-small" onclick="openFolder('${item.filePath}')">Mostrar na Pasta</button>
            <button class="btn-small btn-secondary-small" onclick="removeDownloadItem('${item.id}')">Excluir Histórico</button>
        `;
    } else if (item.state === "CANCELLED") {
        statusText = "Cancelado";
        fillClass = "";
        actionsHtml = `
            <button class="btn-small btn-secondary-small" onclick="removeDownloadItem('${item.id}')">Excluir Histórico</button>
        `;
    } else if (item.state === "INTERRUPTED") {
        statusText = "Interrompido";
        fillClass = "";
        actionsHtml = `
            <button class="btn-small btn-secondary-small" onclick="removeDownloadItem('${item.id}')">Excluir Histórico</button>
        `;
    }

    el.innerHTML = `
        <div class="download-header">
            <div class="download-file-info">
                <span class="download-filename" title="${item.filename}">${item.filename}</span>
                <span class="download-url" title="${item.url}">${item.url}</span>
            </div>
            <div class="download-actions">
                ${actionsHtml}
            </div>
        </div>
        <div class="progress-container">
            <div class="progress-bar-bg">
                <div class="progress-bar-fill ${fillClass}" style="width: ${percent}%"></div>
            </div>
            <div class="progress-status">
                <span>${statusText}</span>
            </div>
        </div>
    `;
}

function updateDownloadItem(info) {
    // If search filter is active and this item doesn't match, don't update it in the UI or refresh list
    const searchInput = document.getElementById("search-input");
    const query = searchInput.value.toLowerCase().trim();
    if (query && !info.filename.toLowerCase().includes(query) && !info.url.toLowerCase().includes(query)) {
        return;
    }

    const listContainer = document.getElementById("downloads-list");
    
    // Check if item exists in allDownloads and update it
    const idx = allDownloads.findIndex(d => d.id === info.id);
    if (idx !== -1) {
        allDownloads[idx] = info;
    } else {
        allDownloads.push(info);
        // Hide empty state if first item
        const emptyState = document.getElementById("empty-state");
        emptyState.style.display = "none";
    }

    createOrUpdateItemDom(info, listContainer);
}

// Global actions connected to backend
function cancelDownload(id) {
    if (backend) {
        backend.cancelDownload(id);
    }
}

function openFile(filePath) {
    if (backend) {
        backend.openDownloadFile(filePath);
    }
}

function openFolder(filePath) {
    if (backend) {
        backend.openDownloadFolder(filePath);
    }
}

function removeDownloadItem(id) {
    if (backend) {
        backend.removeDownloadItem(id);
    } else {
        allDownloads = allDownloads.filter(d => d.id !== id);
        renderDownloads(allDownloads);
    }
}

function loadMockDownloads() {
    allDownloads = [
        { id: "1", filename: "pyqt6-docs.pdf", url: "https://example.com/pyqt6-docs.pdf", totalBytes: 5242880, receivedBytes: 5242880, state: "COMPLETED", startTime: Date.now() - 300000, speed: 0, filePath: "/home/lazaro/Downloads/pyqt6-docs.pdf" },
        { id: "2", filename: "ubuntu-26.04-desktop.iso", url: "https://ubuntu.com/download/ubuntu-26.04.iso", totalBytes: 4187593113, receivedBytes: 2093796556, state: "IN_PROGRESS", startTime: Date.now() - 10000, speed: 5242880, filePath: "/home/lazaro/Downloads/ubuntu-26.04-desktop.iso" }
    ];
    renderDownloads(allDownloads);
}
