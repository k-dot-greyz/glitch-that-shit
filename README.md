# glitch-that-shit

A browser extension that glitches out unwanted words, phrases, or ads with custom visual effects. 100% user-configurable, privacy-first, zenOS-inspired.

## 🌟 Features

- **Custom Visual Effects**: Apply glitch, pixelation, blur, scramble, or rainbow effects to unwanted content
- **Word & Phrase Filtering**: Block specific words, phrases, or regex patterns
- **Ad Blocking Enhancement**: Advanced ad detection with visual censoring instead of removal
- **User-Configurable**: Easy-to-use settings panel for customizing filters and effects
- **Privacy-First**: All processing happens locally - no data sent to external servers
- **ZenOS-Inspired**: Minimalist, calm aesthetic with focus on digital wellbeing
- **Cross-Browser**: Works on Chrome, Firefox, Edge, and other Chromium-based browsers
- **Real-Time Processing**: Instant content filtering as pages load

## 🚀 Installation

### From Browser Extension Store

1. Visit the [Chrome Web Store](# "Coming Soon") or [Firefox Add-ons](# "Coming Soon")
2. Click "Add to Browser"
3. Confirm installation when prompted
4. Look for the glitch-that-shit icon in your browser toolbar

### For Developers (Quick Setup)

**One-command setup:**
```bash
git clone https://github.com/k-dot-greyz/glitch-that-shit.git && cd glitch-that-shit && npm run setup && npm install
```

**Then load in your browser:**
- **Chrome/Edge**: Navigate to `chrome://extensions/` (or `edge://extensions/`), enable "Developer mode", click "Load unpacked", select the `glitch-that-shit` directory
- **Firefox**: Navigate to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", select `manifest.json`

📖 **See [DEV_SETUP.md](DEV_SETUP.md) for detailed development instructions**

### Manual Installation (Step-by-Step)

1. Clone this repository:
   ```bash
   git clone https://github.com/k-dot-greyz/glitch-that-shit.git
   cd glitch-that-shit
   ```
2. Run the setup script:
   ```bash
   npm run setup
   npm install
   ```
3. Open your browser's extension management page:
   - Chrome: `chrome://extensions/`
   - Firefox: `about:debugging#/runtime/this-firefox`
   - Edge: `edge://extensions/`
4. Enable "Developer mode" (Chrome/Edge) or click "Load Temporary Add-on" (Firefox)
5. Click "Load unpacked" (Chrome/Edge) and select the cloned directory, or select `manifest.json` (Firefox)
6. The extension will appear in your browser toolbar

## 📖 Usage

### Quick Start

1. Click the glitch-that-shit icon in your browser toolbar
2. Toggle the extension ON/OFF with the main switch
3. Add words or phrases to your filter list
4. Choose your preferred glitch effect
5. Browse the web with enhanced content control!

### Advanced Configuration

- **Filter Lists**: Create custom lists for different websites or contexts
- **Effect Intensity**: Adjust the strength of visual effects (subtle to extreme)
- **Whitelist/Blacklist**: Specify which websites to include or exclude
- **Regex Support**: Use regular expressions for advanced pattern matching
- **Scheduled Filtering**: Set time-based rules for when filtering is active

### Supported Visual Effects

- 🌊 **Glitch**: Digital distortion with RGB separation
- 🔲 **Pixelation**: 8-bit style censoring blocks
- 🌫️ **Blur**: Gaussian blur with adjustable intensity
- 🎲 **Scramble**: Random character substitution
- 🌈 **Rainbow**: Color-shifting text overlay
- ✨ **Sparkle**: Animated particle effects
- 🎭 **Custom**: Upload your own CSS animations

### Keyboard Shortcuts

- Ctrl+Shift+G - Toggle extension on/off
- Ctrl+Shift+F - Open quick filter dialog
- Ctrl+Shift+E - Cycle through effect types
- Ctrl+Shift+S - Open settings panel

## 🔧 Configuration

Access the settings panel by:

1. Right-clicking the extension icon → "Options"
2. Using keyboard shortcut Ctrl+Shift+S
3. Visiting chrome-extension://[extension-id]/options.html

### Settings Categories

- **Filters**: Manage word lists, regex patterns, and sensitivity levels
- **Effects**: Customize visual styles, animations, and intensities
- **Performance**: Adjust processing speed and resource usage
- **Privacy**: Review data handling and export/import settings
- **Advanced**: Developer tools, debug mode, and experimental features

## 🛡️ Privacy & Security

- **No Data Collection**: glitch-that-shit does not collect, store, or transmit any personal data
- **Local Processing**: All filtering and effects are applied locally on your device
- **Open Source**: Full source code available for security review
- **Minimal Permissions**: Requests only essential browser permissions
- **Regular Updates**: Security patches and improvements released frequently

## 🤝 Contributing

We welcome contributions! This project follows the zenOS development philosophy with standardized workflows.

### Quick Start for Contributors

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/glitch-that-shit.git
cd glitch-that-shit

# 2. Automated setup
npm run setup && npm install

# 3. Create feature branch
git checkout -b feature/amazing-feature

# 4. Make changes, then test
npm test && npm run lint

# 5. Commit using conventions
git commit -m "feat: add amazing feature"

# 6. Push and create PR
git push origin feature/amazing-feature
```

### Development Resources

- 📖 **[CONTRIBUTING.md](CONTRIBUTING.md)** - Full contribution guidelines
- 🚀 **[DEV_SETUP.md](DEV_SETUP.md)** - Comprehensive development setup guide
- 📋 **[DEV_SETUP_CHEAT_SHEET.md](DEV_SETUP_CHEAT_SHEET.md)** - Quick command reference
- 🎯 **[GitHub Issues](../../issues)** - Bug reports and feature requests

### Helpful Commands

```bash
npm run setup           # Setup dev environment
npm test               # Run tests
npm run lint           # Check code style
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run build          # Build extension
npm run validate       # Validate environment
```

### Commit Convention

We use conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code formatting
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Maintenance tasks

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2025 k-dot-greyz (Kaspars Greizis)

## 🐛 Bug Reports & Feature Requests

Please use the [GitHub Issues](../../issues) page to:

- Report bugs
- Request new features
- Ask questions
- Share feedback

## 🎯 Roadmap

- [ ] Machine learning-based content detection
- [ ] Social media integration
- [ ] Mobile browser support
- [ ] Community filter sharing
- [ ] Advanced analytics dashboard
- [ ] Voice command controls
- [ ] Collaborative filtering networks

## 💫 Inspired by zenOS Philosophy

glitch-that-shit embraces the zenOS principles of:

- **Mindful Technology**: Thoughtful interaction with digital content
- **User Agency**: You control your browsing experience
- **Digital Minimalism**: Focus on what matters, filter out noise
- **Privacy Respect**: Your data stays yours
- **Calm Computing**: Peaceful, distraction-free browsing

Transform your browsing experience with glitch-that-shit - where you control the narrative. ✨
