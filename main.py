import sys
import os
import json
import uuid
from PyQt6.QtCore import (
    QObject, pyqtSlot, pyqtSignal, QUrl, QPoint, Qt, QStandardPaths, QDateTime
)
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QStackedWidget, QFileDialog, QMenu
)
from PyQt6.QtGui import (
    QPainter, QImage, QColor, QAction, QDesktopServices
)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import (
    QWebEngineProfile, QWebEngineSettings, QWebEngineDownloadRequest
)
from PyQt6.QtWebChannel import QWebChannel

class BrowserBackend(QObject):
    # Signals to communicate with the HTML UI
    tabsUpdated = pyqtSignal(str)          # Send tab list JSON
    activeTabChanged = pyqtSignal(str, str, str, bool, bool, bool)  # tabId, url, title, canGoBack, canGoForward, isBookmarked
    tabLoadingProgress = pyqtSignal(str, int)  # tabId, progress
    historyUpdated = pyqtSignal()
    bookmarksUpdated = pyqtSignal()
    downloadUpdated = pyqtSignal(str)      # Real-time download info JSON
    downloadsListUpdated = pyqtSignal()    # Refresh download history list

    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window

    @pyqtSlot()
    def barReady(self):
        """Called by bar.js when HTML interface is loaded and ready."""
        self.main_window.refresh_ui_state()

    @pyqtSlot()
    def newTab(self):
        """Creates a new tab."""
        self.main_window.create_new_tab()

    @pyqtSlot(str)
    def closeTab(self, tab_id):
        """Closes a specific tab."""
        self.main_window.close_tab(tab_id)

    @pyqtSlot(str)
    def selectTab(self, tab_id):
        """Activates a specific tab."""
        self.main_window.select_tab(tab_id)

    @pyqtSlot(str, str)
    def navigate(self, tab_id, action):
        """Navigates active page (back, forward, reload, stop, home)."""
        tab = self.main_window.get_tab_by_id(tab_id)
        if not tab:
            return
        view = tab["view"]
        if action == "back":
            view.back()
        elif action == "forward":
            view.forward()
        elif action == "reload":
            view.reload()
        elif action == "stop":
            view.stop()
        elif action == "home":
            view.setUrl(QUrl(self.main_window.resolve_url("browser://newtab")))

    @pyqtSlot(str, str)
    def loadUrl(self, tab_id, url):
        """Loads a URL in the target tab."""
        tab = self.main_window.get_tab_by_id(tab_id)
        if not tab:
            return
        resolved = self.main_window.resolve_url(url)
        tab["view"].setUrl(QUrl(resolved))

    @pyqtSlot(str)
    def toggleBookmark(self, tab_id):
        """Bookmarks or unbookmarks the page currently open in the tab."""
        self.main_window.toggle_bookmark_for_tab(tab_id)

    @pyqtSlot(float, float)
    def showSettingsMenu(self, x, y):
        """Displays a native QMenu at coordinates x, y."""
        local_point = QPoint(int(x), int(y))
        # Map coordinates from the top bar widget to screen coordinates
        global_point = self.main_window.top_bar_view.mapToGlobal(local_point)
        self.main_window.open_settings_menu(global_point)

    @pyqtSlot(str)
    def navigateCurrentTab(self, url):
        """Forces the current active tab to navigate to the specified URL."""
        self.main_window.navigate_current_tab(url)

    # Database API Slots
    @pyqtSlot(result=str)
    def getSettings(self):
        """Returns JSON representation of wallpaper settings."""
        settings = {
            "wallpaper_path": self.main_window.config.get("wallpaper_path", ""),
            "wallpaper_opacity": self.main_window.config.get("wallpaper_opacity", 0.8),
            "search_engine": self.main_window.config.get("search_engine", "https://www.google.com/search?q="),
            "home_page_type": self.main_window.config.get("home_page_type", "newtab"),
            "home_page_url": self.main_window.config.get("home_page_url", "browser://newtab")
        }
        return json.dumps(settings)

    @pyqtSlot(result=str)
    def getDownloadDirectory(self):
        """Returns standard downloads directory path."""
        return QStandardPaths.writableLocation(QStandardPaths.StandardLocation.DownloadLocation)

    @pyqtSlot(str)
    def setSearchEngine(self, engine):
        """Saves search engine query template."""
        self.main_window.config["search_engine"] = engine
        self.main_window.save_config()

    @pyqtSlot(str, str)
    def setHomePage(self, home_type, home_url):
        """Saves home page configuration."""
        self.main_window.config["home_page_type"] = home_type
        self.main_window.config["home_page_url"] = home_url
        self.main_window.save_config()

    @pyqtSlot()
    def clearBookmarks(self):
        """Deletes all bookmarks."""
        self.main_window.config["bookmarks"] = []
        self.main_window.save_config()
        self.bookmarksUpdated.emit()
        self.main_window.refresh_ui_state()

    @pyqtSlot()
    def clearBrowserCache(self):
        """Clears all browser cache."""
        self.main_window.clear_browser_cache()

    @pyqtSlot(result=str)
    def getBookmarks(self):
        """Returns JSON string of bookmarks."""
        return json.dumps(self.main_window.config.get("bookmarks", []))

    @pyqtSlot(result=str)
    def getHistory(self):
        """Returns JSON string of history entries."""
        return json.dumps(self.main_window.config.get("history", []))

    @pyqtSlot(result=str)
    def getDownloads(self):
        """Returns JSON string of completed and registered downloads."""
        return json.dumps(self.main_window.config.get("downloads", []))

    @pyqtSlot()
    def clearHistory(self):
        """Clears all navigation history."""
        self.main_window.config["history"] = []
        self.main_window.save_config()
        self.historyUpdated.emit()

    @pyqtSlot(str)
    def deleteHistoryItem(self, item_id):
        """Deletes a history item by ID."""
        history = self.main_window.config.get("history", [])
        history = [h for h in history if h["id"] != item_id]
        self.main_window.config["history"] = history
        self.main_window.save_config()
        self.historyUpdated.emit()

    @pyqtSlot(str)
    def deleteBookmark(self, url):
        """Deletes a bookmark by URL."""
        bookmarks = self.main_window.config.get("bookmarks", [])
        bookmarks = [b for b in bookmarks if b["url"] != url]
        self.main_window.config["bookmarks"] = bookmarks
        self.main_window.save_config()
        self.bookmarksUpdated.emit()
        self.main_window.refresh_ui_state()

    # Wallpaper Controls
    @pyqtSlot()
    def selectWallpaper(self):
        """Opens file dialog for wallpaper selection."""
        file_path, _ = QFileDialog.getOpenFileName(
            self.main_window,
            "Selecionar Plano de Fundo",
            "",
            "Imagens (*.png *.jpg *.jpeg *.bmp)"
        )
        if file_path:
            self.main_window.config["wallpaper_path"] = file_path
            self.main_window.save_config()
            self.main_window.load_wallpaper()

    @pyqtSlot(float)
    def setWallpaperOpacity(self, opacity):
        """Updates wallpaper opacity."""
        self.main_window.config["wallpaper_opacity"] = opacity
        self.main_window.save_config()
        self.main_window.wallpaper_opacity = opacity
        self.main_window.update() # Repaint main window

    @pyqtSlot()
    def removeWallpaper(self):
        """Removes the wallpaper."""
        self.main_window.config["wallpaper_path"] = ""
        self.main_window.save_config()
        self.main_window.load_wallpaper()

    # Download controls
    @pyqtSlot(str)
    def cancelDownload(self, download_id):
        """Cancels an active download."""
        self.main_window.cancel_download(download_id)

    @pyqtSlot(str)
    def openDownloadFile(self, file_path):
        """Opens a downloaded file."""
        QDesktopServices.openUrl(QUrl.fromLocalFile(file_path))

    @pyqtSlot(str)
    def openDownloadFolder(self, file_path):
        """Opens the folder containing the downloaded file."""
        folder = os.path.dirname(file_path)
        QDesktopServices.openUrl(QUrl.fromLocalFile(folder))

    @pyqtSlot(str)
    def removeDownloadItem(self, download_id):
        """Removes a download from history list."""
        downloads = self.main_window.config.get("downloads", [])
        downloads = [d for d in downloads if d["id"] != download_id]
        self.main_window.config["downloads"] = downloads
        self.main_window.save_config()
        self.downloadsListUpdated.emit()


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Max Browser")
        self.resize(1100, 800)

        # Config & database initialization
        self.config_path = os.path.abspath("config.json")
        self.load_config()

        # Wallpaper variables
        self.wallpaper_image = None
        self.wallpaper_opacity = 0.8
        self.load_wallpaper()

        # Tabs management
        self.tabs = []  # list of dicts: {"id": str, "view": QWebEngineView, "title": str, "url": str}
        self.active_tab_id = None
        self.active_downloads = {} # stores active download requests by ID

        # Set up UI layouts
        self.setup_ui()

        # Connect download manager
        QWebEngineProfile.defaultProfile().downloadRequested.connect(self.on_download_requested)

    def setup_ui(self):
        # Base container
        self.central_widget = QWidget(self)
        self.central_widget.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setCentralWidget(self.central_widget)

        self.main_layout = QVBoxLayout(self.central_widget)
        self.main_layout.setContentsMargins(0, 0, 0, 0)
        self.main_layout.setSpacing(0)

        # 1. Top Bar View (HTML UI)
        self.top_bar_view = QWebEngineView(self)
        self.top_bar_view.setFixedHeight(80)
        self.top_bar_view.setStyleSheet("background: transparent;")
        self.top_bar_view.page().setBackgroundColor(Qt.GlobalColor.transparent)
        self.main_layout.addWidget(self.top_bar_view)

        # 2. QStackedWidget for Web Content (Web Views)
        self.tab_stack = QStackedWidget(self)
        self.main_layout.addWidget(self.tab_stack)

        # Create WebChannel & Backend connection
        self.channel = QWebChannel(self)
        self.backend = BrowserBackend(self)
        self.channel.registerObject("backend", self.backend)
        self.top_bar_view.page().setWebChannel(self.channel)

        # Load Top Bar HTML
        bar_html_path = os.path.abspath("ui/bar.html")
        self.top_bar_view.setUrl(QUrl.fromLocalFile(bar_html_path))

    def load_config(self):
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    self.config = json.load(f)
            except Exception as e:
                print("Error loading config:", e)
                self.config = {}
        else:
            self.config = {}

        # Default values
        if "wallpaper_path" not in self.config:
            self.config["wallpaper_path"] = ""
        if "wallpaper_opacity" not in self.config:
            self.config["wallpaper_opacity"] = 0.8
        if "bookmarks" not in self.config:
            self.config["bookmarks"] = []
        if "history" not in self.config:
            self.config["history"] = []
        if "downloads" not in self.config:
            self.config["downloads"] = []
        if "search_engine" not in self.config:
            self.config["search_engine"] = "https://www.google.com/search?q="
        if "home_page_type" not in self.config:
            self.config["home_page_type"] = "newtab"
        if "home_page_url" not in self.config:
            self.config["home_page_url"] = "browser://newtab"

    def save_config(self):
        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print("Error saving config:", e)

    def load_wallpaper(self):
        path = self.config.get("wallpaper_path", "")
        if path and os.path.exists(path):
            self.wallpaper_image = QImage(path)
        else:
            self.wallpaper_image = None
        self.wallpaper_opacity = self.config.get("wallpaper_opacity", 0.8)
        self.update() # Trigger repaint

    def paintEvent(self, event):
        """Draws the dark workspace background, overlaid with the wallpaper image and custom opacity."""
        painter = QPainter(self)
        # 1. Dark ambient background color
        painter.fillRect(self.rect(), QColor(15, 16, 22))

        # 2. Wallpaper with transparency
        if self.wallpaper_image and not self.wallpaper_image.isNull():
            painter.setOpacity(self.wallpaper_opacity)
            scaled = self.wallpaper_image.scaled(
                self.size(),
                Qt.AspectRatioMode.KeepAspectRatioByExpanding,
                Qt.TransformationMode.SmoothTransformation
            )
            # Center the image
            x = (self.width() - scaled.width()) // 2
            y = (self.height() - scaled.height()) // 2
            painter.drawImage(x, y, scaled)

    def resolve_url(self, url_str):
        """Translates virtual browser:// URLs into absolute local files, resolves search queries, or returns standard url."""
        if url_str.startswith("browser://"):
            page = url_str.split("://")[1]
            if page in ["newtab", "history", "bookmarks", "downloads", "settings"]:
                return QUrl.fromLocalFile(os.path.abspath(f"ui/{page}.html")).toString()
        
        # Check if it looks like a search query
        if url_str and not url_str.startswith("http://") and not url_str.startswith("https://") and not url_str.startswith("file://"):
            engine = self.config.get("search_engine", "https://www.google.com/search?q=")
            encoded = QUrl.toPercentEncoding(url_str).data().decode('utf-8')
            return engine + encoded
            
        return url_str

    # Tabs management
    def create_new_tab(self, url="browser://newtab"):
        tab_id = str(uuid.uuid4())
        view = QWebEngineView(self)
        
        # Transparent background so wallpaper painted on MainWindow shows through
        view.setStyleSheet("background: transparent;")
        view.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        view.page().setBackgroundColor(Qt.GlobalColor.transparent)

        # Tab configuration
        tab = {
            "id": tab_id,
            "view": view,
            "title": "Nova Guia",
            "url": url
        }

        # Bind event listeners
        view.urlChanged.connect(lambda qurl: self.on_tab_url_changed(tab_id, qurl))
        view.titleChanged.connect(lambda title: self.on_tab_title_changed(tab_id, title))
        view.loadProgress.connect(lambda progress: self.on_tab_load_progress(tab_id, progress))
        view.loadFinished.connect(lambda ok: self.on_tab_load_finished(tab_id, ok))

        # Setup WebChannel inside tab view page
        tab_channel = QWebChannel(view)
        tab_channel.registerObject("backend", self.backend)
        view.page().setWebChannel(tab_channel)

        # Load target URL
        resolved = self.resolve_url(url)
        view.setUrl(QUrl(resolved))

        # Add to stack and tabs list
        self.tab_stack.addWidget(view)
        self.tabs.append(tab)

        # Refresh UI
        self.notify_tabs_updated()
        self.select_tab(tab_id)

    def close_tab(self, tab_id):
        tab = self.get_tab_by_id(tab_id)
        if not tab:
            return

        idx = self.tabs.index(tab)
        
        # Remove from UI
        self.tab_stack.removeWidget(tab["view"])
        # Destroy widget to save memory
        tab["view"].deleteLater()
        # Remove from internal list
        self.tabs.remove(tab)

        # Handle window closure or active tab re-selection
        if len(self.tabs) == 0:
            self.close()
            return

        if self.active_tab_id == tab_id:
            # Select neighboring tab
            new_idx = max(0, idx - 1)
            self.select_tab(self.tabs[new_idx]["id"])
        else:
            self.notify_tabs_updated()

    def select_tab(self, tab_id):
        tab = self.get_tab_by_id(tab_id)
        if not tab:
            return

        self.active_tab_id = tab_id
        idx = self.tabs.index(tab)
        self.tab_stack.setCurrentIndex(idx)
        
        self.refresh_ui_state()

    def get_tab_by_id(self, tab_id):
        for tab in self.tabs:
            if tab["id"] == tab_id:
                return tab
        return None

    def get_active_tab(self):
        return self.get_tab_by_id(self.active_tab_id)

    def navigate_current_tab(self, url):
        active = self.get_active_tab()
        if active:
            resolved = self.resolve_url(url)
            active["view"].setUrl(QUrl(resolved))

    # Event handlers for Tab loading
    def on_tab_url_changed(self, tab_id, qurl):
        tab = self.get_tab_by_id(tab_id)
        if not tab:
            return
        
        url_str = qurl.toString()
        tab["url"] = url_str

        # If it's the active tab, refresh the UI
        if tab_id == self.active_tab_id:
            self.refresh_ui_state()

    def on_tab_title_changed(self, tab_id, title):
        tab = self.get_tab_by_id(tab_id)
        if not tab:
            return
        
        # Override title for internal local files
        url = tab["view"].url().toString()
        if url.startswith("file://") and "/ui/newtab.html" in url:
            title = "Nova Guia"
        elif url.startswith("file://") and "/ui/history.html" in url:
            title = "Histórico"
        elif url.startswith("file://") and "/ui/bookmarks.html" in url:
            title = "Favoritos"
        elif url.startswith("file://") and "/ui/downloads.html" in url:
            title = "Downloads"

        tab["title"] = title
        self.notify_tabs_updated()

        if tab_id == self.active_tab_id:
            self.refresh_ui_state()

    def on_tab_load_progress(self, tab_id, progress):
        self.backend.tabLoadingProgress.emit(tab_id, progress)

    def on_tab_load_finished(self, tab_id, ok):
        tab = self.get_tab_by_id(tab_id)
        if not tab or not ok:
            return
        
        url = tab["view"].url().toString()
        title = tab["view"].title()

        # Save to history if it's an external web page
        if url and not url.startswith("file://") and url != "about:blank":
            self.add_history_entry(title, url)

    # UI updates synchronization
    def notify_tabs_updated(self):
        # Convert tabs to JSON and emit
        data = []
        for tab in self.tabs:
            data.append({
                "id": tab["id"],
                "title": tab["title"],
                "url": tab["url"]
            })
        self.backend.tabsUpdated.emit(json.dumps(data))

    def refresh_ui_state(self):
        active = self.get_active_tab()
        if not active:
            # If no tab is open yet, create one
            self.create_new_tab()
            return

        view = active["view"]
        url = view.url().toString()
        title = active["title"]
        can_go_back = view.history().canGoBack()
        can_go_forward = view.history().canGoForward()
        is_bookmarked = any(b["url"] == url for b in self.config.get("bookmarks", []))

        self.notify_tabs_updated()
        self.backend.activeTabChanged.emit(
            active["id"],
            url,
            title,
            can_go_back,
            can_go_forward,
            is_bookmarked
        )

    # Database updates
    def add_history_entry(self, title, url):
        history = self.config.get("history", [])
        
        # Add new item
        history.append({
            "id": str(uuid.uuid4()),
            "title": title or url,
            "url": url,
            "timestamp": QDateTime.currentMSecsSinceEpoch()
        })
        
        # Limit history length to 1000 items
        if len(history) > 1000:
            history.pop(0)

        self.config["history"] = history
        self.save_config()
        self.backend.historyUpdated.emit()

    def toggle_bookmark_for_tab(self, tab_id):
        tab = self.get_tab_by_id(tab_id)
        if not tab:
            return
        
        url = tab["view"].url().toString()
        title = tab["view"].title()

        if not url or url.startswith("file://") or url == "about:blank":
            return

        bookmarks = self.config.get("bookmarks", [])
        exists = False
        for b in bookmarks:
            if b["url"] == url:
                exists = True
                bookmarks.remove(b)
                break

        if not exists:
            bookmarks.append({
                "name": title or url,
                "url": url,
                "timestamp": QDateTime.currentMSecsSinceEpoch()
            })

        self.config["bookmarks"] = bookmarks
        self.save_config()
        self.backend.bookmarksUpdated.emit()
        self.refresh_ui_state()

    # Settings QMenu Popup
    def open_settings_menu(self, global_pos):
        menu = QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background-color: rgba(22, 22, 30, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 8px;
                padding: 4px;
            }
            QMenu::item {
                padding: 6px 20px;
                color: #f7f9fc;
                border-radius: 4px;
            }
            QMenu::item:selected {
                background-color: #7f5af0;
                color: white;
            }
            QMenu::separator {
                height: 1px;
                background-color: rgba(255, 255, 255, 0.08);
                margin: 4px 0;
            }
        """)

        action_new_tab = QAction("Nova Guia", self)
        action_new_tab.triggered.connect(lambda: self.create_new_tab())
        menu.addAction(action_new_tab)

        menu.addSeparator()

        action_history = QAction("Histórico", self)
        action_history.triggered.connect(lambda: self.navigate_current_tab("browser://history"))
        menu.addAction(action_history)

        action_bookmarks = QAction("Favoritos", self)
        action_bookmarks.triggered.connect(lambda: self.navigate_current_tab("browser://bookmarks"))
        menu.addAction(action_bookmarks)

        action_downloads = QAction("Downloads", self)
        action_downloads.triggered.connect(lambda: self.navigate_current_tab("browser://downloads"))
        menu.addAction(action_downloads)

        action_settings = QAction("Configurações", self)
        action_settings.triggered.connect(lambda: self.navigate_current_tab("browser://settings"))
        menu.addAction(action_settings)

        menu.addSeparator()

        action_clear = QAction("Limpar Cache", self)
        action_clear.triggered.connect(self.clear_browser_cache)
        menu.addAction(action_clear)

        action_exit = QAction("Sair", self)
        action_exit.triggered.connect(self.close)
        menu.addAction(action_exit)

        menu.exec(global_pos)

    def clear_browser_cache(self):
        # Clear profile cache
        profile = QWebEngineProfile.defaultProfile()
        profile.clearHttpCache()
        print("Browser cache cleared")

    def clear_bookmarks(self):
        self.config["bookmarks"] = []
        self.save_config()
        self.backend.bookmarksUpdated.emit()
        self.refresh_ui_state()

    # Download Interception
    def on_download_requested(self, download_item):
        download_dir = QStandardPaths.writableLocation(QStandardPaths.StandardLocation.DownloadLocation)
        suggested_name = download_item.suggestedFileName()
        target_path = os.path.join(download_dir, suggested_name)

        download_id = str(uuid.uuid4())

        # Configure download path
        download_item.setDownloadDirectory(download_dir)
        download_item.setDownloadFileName(suggested_name)

        download_info = {
            "id": download_id,
            "filename": suggested_name,
            "url": download_item.url().toString(),
            "totalBytes": download_item.totalBytes(),
            "receivedBytes": 0,
            "state": "IN_PROGRESS",
            "startTime": QDateTime.currentMSecsSinceEpoch(),
            "speed": 0,
            "filePath": target_path
        }

        # Keep a reference to the active download request so it's not garbage collected
        self.active_downloads[download_id] = {
            "item": download_item,
            "info": download_info
        }

        # Connect signals
        download_item.receivedBytesChanged.connect(
            lambda: self.on_download_progress_updated(download_id)
        )
        download_item.totalBytesChanged.connect(
            lambda: self.on_download_progress_updated(download_id)
        )
        download_item.stateChanged.connect(
            lambda state: self.on_download_state_changed(download_id, state)
        )

        # Start download
        download_item.accept()

        # Update database
        self.add_download_to_db(download_info)
        self.backend.downloadsListUpdated.emit()

    def on_download_progress_updated(self, download_id):
        if download_id not in self.active_downloads:
            return
        
        dl = self.active_downloads[download_id]
        item = dl["item"]
        info = dl["info"]

        received = item.receivedBytes()
        total = item.totalBytes()

        info["receivedBytes"] = received
        if total > 0:
            info["totalBytes"] = total

        # Speed calculation
        elapsed_ms = QDateTime.currentMSecsSinceEpoch() - info["startTime"]
        if elapsed_ms > 0:
            info["speed"] = int((received * 1000) / elapsed_ms)

        self.update_download_in_db(info)
        self.backend.downloadUpdated.emit(json.dumps(info))

    def on_download_state_changed(self, download_id, state):
        if download_id not in self.active_downloads:
            return

        dl = self.active_downloads[download_id]
        info = dl["info"]

        # Map QWebEngineDownloadRequest.DownloadState
        if state == QWebEngineDownloadRequest.DownloadState.DownloadInProgress:
            info["state"] = "IN_PROGRESS"
        elif state == QWebEngineDownloadRequest.DownloadState.DownloadCompleted:
            info["state"] = "COMPLETED"
            # Cleanup active reference
            self.active_downloads.pop(download_id, None)
        elif state == QWebEngineDownloadRequest.DownloadState.DownloadCancelled:
            info["state"] = "CANCELLED"
            self.active_downloads.pop(download_id, None)
        elif state == QWebEngineDownloadRequest.DownloadState.DownloadInterrupted:
            info["state"] = "INTERRUPTED"
            self.active_downloads.pop(download_id, None)

        self.update_download_in_db(info)
        self.backend.downloadUpdated.emit(json.dumps(info))
        self.backend.downloadsListUpdated.emit()

    def add_download_to_db(self, info):
        downloads = self.config.get("downloads", [])
        downloads.append(info)
        self.config["downloads"] = downloads
        self.save_config()

    def update_download_in_db(self, info):
        downloads = self.config.get("downloads", [])
        for i, d in enumerate(downloads):
            if d["id"] == info["id"]:
                downloads[i] = info
                break
        self.config["downloads"] = downloads
        self.save_config()

    def cancel_download(self, download_id):
        if download_id in self.active_downloads:
            self.active_downloads[download_id]["item"].cancel()


def main():
    app = QApplication(sys.argv)
    
    # Configure shared WebEngineSettings for file permission details
    settings = QWebEngineProfile.defaultProfile().settings()
    settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
    settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
    settings.setAttribute(QWebEngineSettings.WebAttribute.AllowRunningInsecureContent, True)

    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
