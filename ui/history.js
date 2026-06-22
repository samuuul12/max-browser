let backend = null;
let allHistory = [];

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search-input");
    const clearBtn = document.getElementById("clear-btn");

    // Connect to backend QWebChannel
    if (typeof qt !== "undefined") {
        new QWebChannel(qt.webChannelTransport, function (channel) {
            backend = channel.objects.backend;
            console.log("QWebChannel connected to History Page");
            loadHistory();

            // Listen for history updates
            backend.historyUpdated.connect(() => {
                loadHistory();
            });
        });
    } else {
        console.warn("Running history in standalone mode");
        loadMockHistory();
    }

    // Search filter
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        filterHistory(query);
    });

    // Clear all history
    clearBtn.addEventListener("click", () => {
        if (confirm("Tem certeza que deseja limpar todo o seu histórico de navegação?")) {
            if (backend) {
                backend.clearHistory();
            } else {
                allHistory = [];
                renderHistory([]);
            }
        }
    });
});

function loadHistory() {
    if (!backend) return;
    backend.getHistory((historyStr) => {
        allHistory = JSON.parse(historyStr);
        // Sort history by timestamp descending (newest first)
        allHistory.sort((a, b) => b.timestamp - a.timestamp);
        renderHistory(allHistory);
    });
}

function filterHistory(query) {
    if (!query) {
        renderHistory(allHistory);
        return;
    }
    const filtered = allHistory.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.url.toLowerCase().includes(query)
    );
    renderHistory(filtered);
}

function renderHistory(items) {
    const listContainer = document.getElementById("history-list");
    const emptyState = document.getElementById("empty-state");

    if (items.length === 0) {
        listContainer.innerHTML = "";
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";
    listContainer.innerHTML = "";

    // Group by Date
    const groups = {};
    items.forEach(item => {
        const dateStr = new Date(item.timestamp).toLocaleDateString("pt-BR", {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        // Capitalize first letter
        const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        if (!groups[capitalizedDate]) {
            groups[capitalizedDate] = [];
        }
        groups[capitalizedDate].push(item);
    });

    Object.keys(groups).forEach(date => {
        // Group Header
        const header = document.createElement("div");
        header.className = "history-group-title";
        header.innerText = date;
        listContainer.appendChild(header);

        // Group Items
        groups[date].forEach(item => {
            const el = document.createElement("div");
            el.className = "history-item";

            const timeStr = new Date(item.timestamp).toLocaleTimeString("pt-BR", {
                hour: '2-digit', minute: '2-digit'
            });

            el.innerHTML = `
                <div class="history-info">
                    <span class="history-time">${timeStr}</span>
                    <a class="history-title" title="${item.title}">${item.title || "Sem título"}</a>
                    <span class="history-url">${item.url}</span>
                </div>
                <button class="delete-item-btn" title="Remover do histórico">
                    <svg class="delete-icon" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                    </svg>
                </button>
            `;

            // Click title to navigate
            el.querySelector(".history-title").addEventListener("click", (e) => {
                e.preventDefault();
                if (backend) {
                    backend.navigateCurrentTab(item.url);
                } else {
                    window.location.href = item.url;
                }
            });

            // Click delete button
            el.querySelector(".delete-item-btn").addEventListener("click", () => {
                if (backend) {
                    backend.deleteHistoryItem(item.id);
                } else {
                    allHistory = allHistory.filter(h => h.id !== item.id);
                    renderHistory(allHistory);
                }
            });

            listContainer.appendChild(el);
        });
    });
}

function loadMockHistory() {
    allHistory = [
        { id: "1", title: "Google", url: "https://www.google.com", timestamp: Date.now() - 50000 },
        { id: "2", title: "GitHub - Onde o mundo constrói software", url: "https://github.com", timestamp: Date.now() - 5000000 },
        { id: "3", title: "PyQt6 - Python Wiki", url: "https://wiki.python.org", timestamp: Date.now() - 86400000 }
    ];
    renderHistory(allHistory);
}
