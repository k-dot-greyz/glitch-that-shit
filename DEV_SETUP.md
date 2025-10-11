# 🚀 Development Environment Setup

**Browser Extension Development Guide - Your One Anchor Point**

This guide provides comprehensive setup instructions for developing glitch-that-shit across all platforms and browsers.

## 🎯 Quick Start

### **One-Command Setup (All Platforms)**
```bash
git clone https://github.com/k-dot-greyz/glitch-that-shit.git && cd glitch-that-shit && npm run setup
```

### **Essential Commands Cheat Sheet**
```bash
# Validate environment
npm run validate

# Install dependencies
npm install

# Run tests
npm test

# Lint and format
npm run lint
npm run format

# Build extension
npm run build
```

## 📋 Complete Setup Checklist

### **Phase 1: Prerequisites**
- [ ] **OS**: Windows 10+, macOS 10.15+, Linux, or Android (Termux)
- [ ] **Node.js**: v16+ (v18 LTS recommended)
- [ ] **npm**: v8+ (comes with Node.js)
- [ ] **Git**: Latest version
- [ ] **Browser**: Chrome/Edge/Firefox/Brave (Developer Edition recommended)
- [ ] **Code Editor**: VS Code, Cursor, or similar

### **Phase 2: Repository Setup**
- [ ] **Fork Repository**: Via GitHub UI
- [ ] **Clone Locally**: `git clone <your-fork-url>`
- [ ] **Git Configuration**: User name and email set
- [ ] **Git Aliases**: Development shortcuts configured
- [ ] **Branch Creation**: `git checkout -b feature/your-feature`

### **Phase 3: Dependencies**
- [ ] **Node Modules**: `npm install`
- [ ] **Dev Tools**: ESLint, Prettier configured
- [ ] **Testing Framework**: Jest or similar installed
- [ ] **Build Tools**: Webpack/Rollup configured

### **Phase 4: Browser Setup**
- [ ] **Developer Mode Enabled**: In browser extensions page
- [ ] **Extension Loaded**: Unpacked extension loaded
- [ ] **Extension Pinned**: For easy access
- [ ] **DevTools**: Extension context debugging enabled

### **Phase 5: Development Tools**
- [ ] **IDE Extensions**: ESLint, Prettier plugins installed
- [ ] **Git Hooks**: Pre-commit hooks configured
- [ ] **Browser DevTools**: Extension debugging panel open
- [ ] **Hot Reload**: Extension auto-reload configured (optional)

## 🔧 Platform-Specific Setup

### **Windows (PowerShell)**

#### Prerequisites
```powershell
# Install Node.js (if not installed)
winget install OpenJS.NodeJS.LTS

# Install Git (if not installed)
winget install Git.Git

# Verify installations
node --version
npm --version
git --version
```

#### Repository Setup
```powershell
# Clone repository
git clone https://github.com/k-dot-greyz/glitch-that-shit.git
cd glitch-that-shit

# Run setup
npm run setup

# Install dependencies
npm install
```

#### Browser Setup (Chrome/Edge)
1. Open browser and navigate to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `glitch-that-shit` directory
5. Pin the extension icon for easy access

### **Linux/macOS (Bash/Zsh)**

#### Prerequisites
```bash
# Ubuntu/Debian - Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS - Install Node.js
brew install node

# Install Git (if needed)
# Ubuntu/Debian
sudo apt install git

# macOS
brew install git

# Verify installations
node --version
npm --version
git --version
```

#### Repository Setup
```bash
# Clone repository
git clone https://github.com/k-dot-greyz/glitch-that-shit.git
cd glitch-that-shit

# Run setup
npm run setup

# Install dependencies
npm install
```

#### Browser Setup (Chrome/Firefox)

**Chrome/Chromium:**
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `glitch-that-shit` directory

**Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to the extension directory
4. Select `manifest.json`

### **Android (Termux)**

#### Prerequisites
```bash
# Update packages
pkg update && pkg upgrade

# Install Node.js and Git
pkg install nodejs git

# Verify installations
node --version
npm --version
git --version
```

#### Repository Setup
```bash
# Setup storage access (if needed)
termux-setup-storage

# Clone repository
git clone https://github.com/k-dot-greyz/glitch-that-shit.git
cd glitch-that-shit

# Run setup
npm run setup

# Install dependencies
npm install
```

#### Browser Setup
**Kiwi Browser** (supports Chrome extensions on Android):
1. Install Kiwi Browser from Play Store
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Use file manager to navigate to extension directory
5. Load unpacked extension

**Firefox Mobile:**
- Currently limited extension support
- Consider using Firefox Nightly for development

## 🛠️ Git Workflow Setup

### **Automated Git Aliases** (Configured by setup script)

The setup script configures helpful git aliases:

```bash
# Safe multiline commits
gcommit "type" "subject" "body"
# Example: gcommit "feat" "add blur effect" "implements gaussian blur with intensity control"

# Quick commits
gfeat "add new feature"      # Commits with "feat:" prefix
gfix "fix bug"               # Commits with "fix:" prefix
gdocs "update docs"          # Commits with "docs:" prefix
gstyle "format code"         # Commits with "style:" prefix

# Commit and push
gcp "feat" "add feature"     # Commit and push in one command

# Common operations
gs          # git status
ga          # git add
gaa         # git add -A
gl          # git log --oneline -10
gd          # git diff
gp          # git push
gpu         # git pull
```

### **Manual Git Configuration**
```bash
# Set your identity (if not set globally)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Set default branch name
git config init.defaultBranch main

# Enable colored output
git config --global color.ui auto
```

## 🧪 Development Workflow

### **Starting Development**
```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Start development
# Make your changes to the code

# 3. Test changes
npm test
npm run lint

# 4. Reload extension in browser
# Click reload button in browser's extension page
# Or use hot-reload setup (see below)

# 5. Commit changes
gfeat "your feature description"

# 6. Push to your fork
git push origin feature/your-feature-name
```

### **Testing Changes**
```bash
# Run all tests
npm test

# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Build extension
npm run build
```

### **Hot Reload Setup** (Optional)
```bash
# Install extension reloader (Chrome)
# Add web-ext for Firefox auto-reload
npm install --save-dev web-ext

# Run with auto-reload (Firefox)
npm run dev:firefox

# For Chrome, use extensions like "Extensions Reloader"
```

## 🔍 Debugging

### **Chrome/Edge DevTools**
1. Right-click extension icon → "Inspect popup"
2. Navigate to `chrome://extensions/`
3. Find glitch-that-shit
4. Click "background page" or "service worker" to debug background scripts
5. Open any webpage → F12 → Check console for content script logs

### **Firefox DevTools**
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Find glitch-that-shit
3. Click "Inspect" to debug background scripts
4. Open any webpage → F12 → Check console for content script logs

### **Common Debug Techniques**
```javascript
// Content script logging
console.log('[glitch-that-shit]', 'Debug message');

// Background script logging
chrome.runtime.sendMessage({type: 'log', message: 'Debug info'});

// Check storage
chrome.storage.local.get(null, (items) => {
  console.log('All stored data:', items);
});
```

## 🔧 Troubleshooting

### **Node.js/npm Issues**
```bash
# Wrong Node version
# Use nvm (Node Version Manager)
# Windows: https://github.com/coreybutler/nvm-windows
# Linux/Mac: https://github.com/nvm-sh/nvm

nvm install --lts
nvm use --lts

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Permission issues (Linux/Mac)
sudo chown -R $USER ~/.npm
```

### **Git Issues**
```bash
# Commit hanging (editor issue)
git config --global core.editor "code --wait"

# Missing user configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Not in git repository
cd glitch-that-shit
git init  # Only if absolutely necessary

# Merge conflicts
git status  # See conflicted files
# Manually resolve conflicts in editor
git add .
git commit -m "resolve merge conflicts"
```

### **Extension Loading Issues**

**"Manifest file is missing or unreadable"**
- Ensure you're selecting the correct directory
- Check that `manifest.json` exists in root
- Verify JSON is valid (no syntax errors)

**"Extensions in developer mode"**
- This is normal for development
- Production users won't see this

**Extension not updating**
- Click reload button on extension card
- Or remove and re-load the extension
- Check for console errors

**Content script not running**
- Check manifest.json permissions
- Verify match patterns include your test site
- Refresh the webpage after reloading extension

### **Browser-Specific Issues**

**Chrome:**
```bash
# Reset extension
# Remove from chrome://extensions/
# Restart browser
# Reload extension
```

**Firefox:**
```bash
# Temporary add-ons are removed on browser restart
# Need to reload each session during development

# Use web-ext for persistent development
npm run dev:firefox
```

**Edge:**
```bash
# Same as Chrome (Chromium-based)
# Navigate to edge://extensions/
```

## 📱 Mobile Development (Advanced)

### **Kiwi Browser (Android)**
```bash
# Develop on desktop, test on mobile
# 1. Build extension on desktop
npm run build

# 2. Transfer to Android (via USB or cloud)
adb push dist/ /sdcard/glitch-that-shit/

# 3. Load in Kiwi Browser
# kiwi://extensions/ → Load unpacked
```

### **Firefox for Android**
```bash
# Use web-ext for remote debugging
npm install -g web-ext

# Connect via USB debugging
web-ext run --target=firefox-android --android-device=<device-id>
```

## 🔄 Environment Switching

### **Quick Machine Switch**
```bash
# On current machine
git add .
git commit -m "wip: save current work"
git push origin feature/your-branch

# On new machine
git clone https://github.com/k-dot-greyz/glitch-that-shit.git
cd glitch-that-shit
git checkout feature/your-branch
npm run setup
npm install
# Load extension in browser
```

## 🎯 One-Liner Commands

```bash
# Fresh setup
git clone https://github.com/k-dot-greyz/glitch-that-shit.git && cd glitch-that-shit && npm run setup && npm install

# Update and rebuild
git pull origin main && npm install && npm run build

# Quick test
npm run lint && npm test

# Format and commit
npm run format && gfeat "your changes"
```

## 📚 Additional Resources

- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[Dev Cheat Sheet](DEV_SETUP_CHEAT_SHEET.md)** - Quick command reference
- **[Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)** - Official Chrome docs
- **[Firefox Extension Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)** - Official Firefox docs
- **[zenOS Philosophy](https://github.com/kasparsgreizis/zenOS)** - Our guiding principles

## 🆘 Getting Help

If you're stuck:
1. Check this guide's troubleshooting section
2. Search [existing issues](../../issues)
3. Open a [new issue](../../issues/new)
4. Join community discussions

---

**This is your anchor point for glitch-that-shit development. Bookmark it, use it, improve it!** 🚀

**Built with zenOS principles**: Effortless capture, minimal cognitive load, playful exploration. ✨

