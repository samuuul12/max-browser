# 🚀 Max Browser

A modern browser for Linux that combines the robustness and performance of **PyQt6 (QtWebEngine)** in the backend with the flexibility and contemporary design of a hybrid interface built on **HTML5, CSS3, and JavaScript**.

Inspired by the usability of Google Chrome, **Max Browser** features its own minimalist visual identity, incorporating "glassmorphism" elements and full support for custom, dynamic backgrounds.

---

## ✨ Key Features

- **📂 Hybrid Navigation**: An interface with tabs and buttons rendered locally via HTML/CSS/JS, ensuring a lightweight experience and smooth transitions.
- **🖼️ Custom Wallpaper**: Set any image from your computer as the background for the "New Tab" page, with a real-time opacity slider.
- **⚙️ Comprehensive Settings Panel**: An organized settings interface featuring an intuitive sidebar, divided into General, Home, Search, and Privacy sections (following high-fidelity UI standards).
- **⭐ Bookmarks and History**: A quick-bookmarking system in the address bar (via a star icon) and a dedicated page for managing bookmarks and browsing history.
- **⚡ Real-time Downloads**: Native download monitoring, including progress tracking, download speed, and options to open files or their containing folders directly.
- **🔍 Customizable Search Engine**: Support for Google, Bing, DuckDuckGo, and Yahoo, accessible directly from the address bar.

---

## 🛠️ Technologies Used

- **Backend**: Python 3, PyQt6 (with PyQt6-WebEngine and PyQt6-WebChannel)
- **Frontend**: HTML5, Vanilla CSS3 (featuring Glassmorphism and smooth transitions), Modern JavaScript
- **Communication**: QWebChannel for asynchronous, two-way integration between Python and the browser engine. ---

## 🚀 How to Run

### 1. Install Dependencies

Ensure that Python 3 and the `pip` package manager are installed on your Linux system. Then, install the required PyQt6 components:

```bash
pip install PyQt6 PyQt6-WebEngine PyQt6-WebChannel
```

### 2. Launch the Browser

Navigate to the project folder and run the main file:

```bash
cd modern_browser
python3 main.py
```

---

## 📂 Project Structure

```
modern_browser/
├── main.py             # Main Python script (backend and PyQt6 engine)
├── config.json         # Local JSON database (history, bookmarks, downloads, and wallpaper)
└── ui/                 # User interface files (HTML/CSS/JS)
├── bar.html/css/js        # Top bar (tabs, navigation, and address bar)
├── newtab.html/css/js     # New Tab page (wallpaper, shortcuts, search)
├── settings.html/css/js   # Settings panel with a dedicated sidebar
├── history.html/css/js    # Browsing history page
├── bookmarks.html/css/js  # Bookmarks page
├── downloads.html/css/js  # Downloads management page
└── qwebchannel.js         # Qt integration library
```

---

## 🎨 Customizing the Wallpaper

In the Settings panel (or via the "Customize" button on the New Tab page):
1. Click **Choose Image** and select any image file (`.png`, `.jpg`, `.jpeg`, `.bmp`).
2. Adjust the **Opacity** slider to blend the image with the browser's dark theme.
3. Your changes are automatically saved to the `config.json` file and will be applied the next time you launch the browser. ;)
