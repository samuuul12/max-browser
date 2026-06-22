let backend = null;
let allBookmarks = [];

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search-input");

    // Connect to backend QWebChannel
    if (typeof qt !== "undefined") {
        new QWebChannel(qt.webChannelTransport, function (channel) {
            backend = channel.objects.backend;
            console.log("QWebChannel connected to Bookmarks Page");
            loadBookmarks();

            // Listen for bookmarks updates
            backend.bookmarksUpdated.connect(() => {
                loadBookmarks();
            });
        });
    } else {
        console.warn("Running bookmarks in standalone mode");
        loadMockBookmarks();
    }

    // Search filter
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        filterBookmarks(query);
    });
});

function loadBookmarks() {
    if (!backend) return;
    backend.getBookmarks((bookmarksStr) => {
        allBookmarks = JSON.parse(bookmarksStr);
        renderBookmarks(allBookmarks);
    });
}

function filterBookmarks(query) {
    if (!query) {
        renderBookmarks(allBookmarks);
        return;
    }
    const filtered = allBookmarks.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.url.toLowerCase().includes(query)
    );
    renderBookmarks(filtered);
}

function renderBookmarks(items) {
    const gridContainer = document.getElementById("bookmarks-grid");
    const emptyState = document.getElementById("empty-state");

    if (items.length === 0) {
        gridContainer.innerHTML = "";
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";
    gridContainer.innerHTML = "";

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "bookmark-card";

        const letter = item.name.substring(0, 1).toUpperCase();

        card.innerHTML = `
            <div class="bookmark-icon">${item.icon || letter}</div>
            <div class="bookmark-title" title="${item.name}">${item.name}</div>
            <div class="bookmark-url" title="${item.url}">${item.url}</div>
            <button class="delete-btn" title="Remover dos favoritos">
                <svg class="delete-icon" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                </svg>
            </button>
        `;

        // Click card to navigate
        card.addEventListener("click", (e) => {
            // Check if delete button was clicked
            if (e.target.closest(".delete-btn")) return;
            
            if (backend) {
                backend.navigateCurrentTab(item.url);
            } else {
                window.location.href = item.url;
            }
        });

        // Click delete button
        card.querySelector(".delete-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            if (backend) {
                backend.deleteBookmark(item.url);
            } else {
                allBookmarks = allBookmarks.filter(b => b.url !== item.url);
                renderBookmarks(allBookmarks);
            }
        });

        gridContainer.appendChild(card);
    });
}

function loadMockBookmarks() {
    allBookmarks = [
        { name: "Google", url: "https://www.google.com" },
        { name: "YouTube", url: "https://www.youtube.com" },
        { name: "GitHub", url: "https://github.com" },
        { name: "PyQt6 WebEngine", url: "https://www.riverbankcomputing.com/software/pyqt/" }
    ];
    renderBookmarks(allBookmarks);
}
