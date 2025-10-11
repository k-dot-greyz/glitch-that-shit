# 🚀 Dev Environment Setup - Cheat Sheet

**Quick reference for glitch-that-shit development**

## **One-Command Setup (Any Environment)**
```bash
git clone https://github.com/k-dot-greyz/glitch-that-shit.git && cd glitch-that-shit && npm run setup && npm install
```

## **Essential Commands**
```bash
# Validation
npm run validate              # Check environment readiness
npm test                      # Run all tests
npm run lint                  # Check code style
npm run lint:fix              # Auto-fix linting issues
npm run format                # Format code with Prettier

# Build
npm run build                 # Build extension
npm run build:watch           # Build with auto-rebuild
npm run dev:firefox           # Run with Firefox hot-reload

# Git shortcuts (configured by setup)
gfeat "add feature"           # Quick feature commit
gfix "fix bug"                # Quick bugfix commit
gdocs "update docs"           # Quick docs commit
gs                            # git status
ga                            # git add
gp                            # git push
```

## **Browser Extension Loading**

### **Chrome/Edge**
```
1. chrome://extensions/ (or edge://extensions/)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select glitch-that-shit directory
```

### **Firefox**
```
1. about:debugging#/runtime/this-firefox
2. Click "Load Temporary Add-on"
3. Select manifest.json from directory
```

### **Kiwi Browser (Android)**
```
1. kiwi://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Navigate to extension directory
```

## **Platform-Specific Setup**

### **Windows**
```powershell
winget install OpenJS.NodeJS.LTS Git.Git
git clone <repo> && cd glitch-that-shit
npm run setup && npm install
```

### **Linux/macOS**
```bash
# Ubuntu/Debian
sudo apt install nodejs git

# macOS
brew install node git

git clone <repo> && cd glitch-that-shit
npm run setup && npm install
```

### **Termux (Android)**
```bash
pkg update && pkg upgrade
pkg install nodejs git
git clone <repo> && cd glitch-that-shit
npm run setup && npm install
```

## **Git Workflow**
```bash
# Create feature branch
git checkout -b feature/amazing-feature

# Make changes, then commit
gfeat "add amazing feature"

# Push to your fork
git push origin feature/amazing-feature

# Create PR on GitHub
```

## **Debugging**
```bash
# Chrome/Edge DevTools
1. Right-click extension icon → "Inspect popup"
2. chrome://extensions/ → Click "background page"
3. Open webpage → F12 → Console (for content scripts)

# Firefox DevTools
1. about:debugging → Click "Inspect" on extension
2. Open webpage → F12 → Console (for content scripts)

# Check storage
chrome.storage.local.get(null, console.log)
```

## **Common Issues**

### **Extension not loading**
```bash
# Verify manifest
cat manifest.json | jq  # Check JSON validity

# Reload extension
# Click reload button in browser extensions page
```

### **Node/npm issues**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Use nvm for version management
nvm install --lts && nvm use --lts
```

### **Git issues**
```bash
# Set user config
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Fix editor hanging
git config --global core.editor "code --wait"
```

### **Changes not reflecting**
```bash
# Reload extension in browser
# Refresh the webpage
# Check console for errors
```

## **Development Workflow**
```bash
# 1. Start
git checkout -b feature/my-feature

# 2. Code
# Make your changes

# 3. Test
npm run lint && npm test

# 4. Reload extension in browser

# 5. Commit
gfeat "implement my feature"

# 6. Push
git push origin feature/my-feature

# 7. Open PR on GitHub
```

## **Testing on Multiple Browsers**
```bash
# Test matrix
✓ Chrome (latest)
✓ Firefox (latest)
✓ Edge (latest)
✓ Brave (optional)
✓ Kiwi Browser on Android (optional)

# Quick test procedure
1. Load in each browser
2. Test basic functionality
3. Check console for errors
4. Verify settings persist
5. Test on various websites
```

## **Environment Switching**
```bash
# Save work on current machine
git add . && git commit -m "wip: save work" && git push

# Continue on new machine
git clone <repo> && cd glitch-that-shit
git checkout your-branch
npm run setup && npm install
# Load in browser and continue!
```

## **Quick Links**

- **Full Setup Guide**: [DEV_SETUP.md](DEV_SETUP.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **README**: [README.md](README.md)
- **Chrome Docs**: https://developer.chrome.com/docs/extensions/
- **Firefox Docs**: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions

## **Emergency Recovery**
```bash
# Nuclear option - start fresh
cd ..
rm -rf glitch-that-shit
git clone <repo> && cd glitch-that-shit
npm run setup && npm install
```

## **Useful Code Snippets**

### **Log from content script**
```javascript
console.log('[glitch-that-shit]', 'Debug message', data);
```

### **Check storage**
```javascript
chrome.storage.local.get(null, (items) => {
  console.log('All settings:', items);
});
```

### **Send message to background**
```javascript
chrome.runtime.sendMessage({
  type: 'DEBUG',
  data: yourData
}, (response) => {
  console.log('Response:', response);
});
```

### **Quick permission check**
```javascript
chrome.permissions.contains({
  permissions: ['storage', 'activeTab']
}, (result) => {
  console.log('Has permissions:', result);
});
```

---

**Bookmark this! Your quick reference for all glitch-that-shit development.** 🎯

**zenOS-inspired**: Minimal cognitive load, maximum productivity. ✨

