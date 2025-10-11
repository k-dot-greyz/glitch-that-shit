# Assets Directory

## Extension Icons

This directory should contain the extension icons in the following sizes:

- **icon16.png** - 16x16 pixels (toolbar icon, small)
- **icon48.png** - 48x48 pixels (extension management page)
- **icon128.png** - 128x128 pixels (Chrome Web Store, installation)

## Icon Design Guidelines

### Design Concept
The icons should reflect the "glitch" theme while remaining recognizable. Consider:

- **Glitch aesthetic** - RGB color separation, digital distortion
- **Minimalist** - Clean, simple shapes
- **High contrast** - Works well on both light and dark backgrounds
- **Memorable** - Instantly recognizable at small sizes

### Suggested Design Elements

1. **Letter "G"** with glitch effect (RGB offset)
2. **Pixelated/8-bit style** character or symbol
3. **Wave/distortion** pattern
4. **Censorship bar** with glitch effect
5. **Eye symbol** with glitch overlay

### Color Palette

Based on the glitch effects in the extension:

- **Primary**: `#6366f1` (Indigo/Purple)
- **Accent**: `#8b5cf6` (Purple)
- **Glitch RGB**: Red (`#ff0000`), Green (`#00ff00`), Blue (`#0000ff`)
- **Background**: Transparent or white/black variants

## Creating Icons

### Option 1: Design Tools
- **Figma** (free) - https://figma.com
- **Inkscape** (free, open-source) - https://inkscape.org
- **Adobe Illustrator** (paid)

### Option 2: AI Generation
- **DALL-E** or **Midjourney** with prompt:
  ```
  "Minimalist browser extension icon, glitch effect, RGB color separation,
   letter G, 128x128 pixels, transparent background, modern, clean"
  ```

### Option 3: Quick Placeholder
Use an online icon generator like:
- https://favicon.io/favicon-generator/
- https://realfavicongenerator.net/

## Quick SVG Icon Template

Save this as an SVG and convert to PNG at different sizes:

```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glitch">
      <feColorMatrix type="matrix" values="1 0 0 0 0
                                           0 0 0 0 0
                                           0 0 0 0 0
                                           0 0 0 1 0"/>
    </filter>
  </defs>
  
  <!-- Background circle -->
  <circle cx="64" cy="64" r="60" fill="#6366f1"/>
  
  <!-- Glitched "G" letter -->
  <text x="64" y="90" 
        font-family="Arial Black, sans-serif" 
        font-size="72" 
        font-weight="bold" 
        text-anchor="middle" 
        fill="#ffffff">G</text>
  
  <!-- RGB glitch offsets -->
  <text x="62" y="88" 
        font-family="Arial Black, sans-serif" 
        font-size="72" 
        font-weight="bold" 
        text-anchor="middle" 
        fill="#ff0000" 
        opacity="0.5">G</text>
        
  <text x="66" y="92" 
        font-family="Arial Black, sans-serif" 
        font-size="72" 
        font-weight="bold" 
        text-anchor="middle" 
        fill="#00ffff" 
        opacity="0.5">G</text>
</svg>
```

## Converting SVG to PNG

### Online Tools
- https://cloudconvert.com/svg-to-png
- https://svgtopng.com/

### Command Line (ImageMagick)
```bash
# Install ImageMagick first
# Then convert:
convert -background none -resize 16x16 icon.svg icon16.png
convert -background none -resize 48x48 icon.svg icon48.png
convert -background none -resize 128x128 icon.svg icon128.png
```

### Node.js (sharp)
```bash
npm install sharp
```

```javascript
const sharp = require('sharp');

sharp('icon.svg')
  .resize(16, 16)
  .png()
  .toFile('icon16.png');
```

## Temporary Placeholders

Until proper icons are created, you can use:
1. A simple colored square with the letter "G"
2. Default Chrome extension icon (will show a puzzle piece)
3. Generate using https://favicon.io/ with letter "G" and color #6366f1

---

**Note**: The extension will work without custom icons (Chrome will use defaults),
but custom icons greatly improve the user experience and professionalism.

Inspired by zenOS philosophy: Simple, functional, aesthetically pleasing. ✨

