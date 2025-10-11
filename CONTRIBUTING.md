# Contributing to glitch-that-shit 🎨

Thanks for considering contributing to glitch-that-shit! This document will guide you through the contribution process.

## 🚀 Quick Start

### One-Command Setup
```bash
git clone https://github.com/k-dot-greyz/glitch-that-shit.git && cd glitch-that-shit && npm run setup
```

### Manual Setup
```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/glitch-that-shit.git
cd glitch-that-shit

# 2. Run the setup script
npm run setup

# 3. Load the extension in your browser (see DEV_SETUP.md)
```

## 📋 Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes
- Follow the coding standards (see below)
- Write tests if applicable
- Update documentation

### 3. Test Locally
```bash
# Run tests
npm test

# Lint your code
npm run lint

# Format code
npm run format
```

### 4. Commit Your Changes
We use conventional commits for clear history:

```bash
# Using the provided git aliases (configured by setup script)
gfeat "add rainbow glitch effect"
gfix "resolve timing issue in content script"
gdocs "update installation instructions"

# Or manually
git commit -m "feat: add rainbow glitch effect"
git commit -m "fix: resolve timing issue in content script"
git commit -m "docs: update installation instructions"
```

#### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style/formatting (no functional changes)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub with:
- Clear description of changes
- Screenshots/GIFs for UI changes
- Test results
- Any breaking changes noted

## 🎯 Coding Standards

### JavaScript Style
- Use ES6+ features
- Prefer `const` over `let`, avoid `var`
- Use async/await over raw promises
- Comment complex logic
- Keep functions small and focused

### File Structure
```
glitch-that-shit/
├── src/
│   ├── content/          # Content scripts
│   ├── background/       # Background scripts
│   ├── popup/            # Extension popup UI
│   ├── options/          # Settings page
│   └── shared/           # Shared utilities
├── assets/               # Icons, images
├── docs/                 # Documentation
└── tests/                # Test files
```

### Browser Extension Best Practices
- Minimize permissions requested
- Optimize for performance (content scripts run on every page)
- Handle errors gracefully
- Respect user privacy
- Test across browsers (Chrome, Firefox, Edge)

## 🧪 Testing

### Manual Testing
1. Load extension in developer mode
2. Test on various websites
3. Check console for errors
4. Verify settings persistence
5. Test keyboard shortcuts

### Automated Testing
```bash
# Run all tests
npm test

# Run specific test
npm test -- --match "glitch effect"

# Watch mode
npm run test:watch
```

## 🐛 Bug Reports

When filing a bug report, include:
- Browser and version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
- Screenshots/screen recordings

## 💡 Feature Requests

We love new ideas! When suggesting features:
- Check existing issues first
- Explain the use case
- Describe expected behavior
- Consider privacy/performance implications
- Mock up UI changes if applicable

## 🔒 Security

- **Never** commit sensitive data (API keys, tokens, etc.)
- Report security vulnerabilities privately to [security email]
- Follow browser extension security best practices
- Review the [Security Guidelines](SECURITY.md)

## 📝 Documentation

- Update README.md for user-facing changes
- Update inline code comments
- Add JSDoc comments for functions
- Update DEV_SETUP.md for dev environment changes

## 🌟 Recognition

Contributors will be:
- Listed in the README
- Credited in release notes
- Given our eternal gratitude and respect ✨

## 🤝 Code of Conduct

### Our Pledge
- Be respectful and inclusive
- Welcome diverse perspectives
- Focus on constructive feedback
- Support fellow contributors
- Prioritize user privacy and wellbeing

### Not Tolerated
- Harassment or discrimination
- Toxic behavior
- Privacy violations
- Malicious code
- Spam or self-promotion

## 📚 Additional Resources

- [Development Setup Guide](DEV_SETUP.md)
- [Development Cheat Sheet](DEV_SETUP_CHEAT_SHEET.md)
- [Browser Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [zenOS Development Philosophy](https://github.com/kasparsgreizis/zenOS)

## 💬 Questions?

- Open a [Discussion](../../discussions)
- Check existing [Issues](../../issues)
- Join our community chat [link TBD]

---

**Remember**: Every contribution, no matter how small, makes glitch-that-shit better. Thank you for being part of this project! 🎨✨

**Inspired by zenOS principles**: Mindful technology, user agency, and calm computing.

