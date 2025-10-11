/**
 * glitch-that-shit - Content Script
 * Main content filtering and visual effects engine
 * 
 * Runs on every page, scans for filtered words/phrases,
 * and applies custom glitch effects.
 */

// Configuration state
let config = {
  enabled: true,
  filterList: [],
  effectType: 'glitch', // glitch, pixelate, blur, scramble, rainbow, sparkle
  effectIntensity: 'medium', // subtle, medium, extreme
  caseSensitive: false,
};

// Load configuration from storage
async function loadConfig() {
  try {
    const result = await chrome.storage.local.get([
      'enabled',
      'filterList',
      'effectType',
      'effectIntensity',
      'caseSensitive',
    ]);

    config = {
      enabled: result.enabled !== undefined ? result.enabled : true,
      filterList: result.filterList || ['ad', 'sponsored', 'advertisement'],
      effectType: result.effectType || 'glitch',
      effectIntensity: result.effectIntensity || 'medium',
      caseSensitive: result.caseSensitive || false,
    };

    console.log('[glitch-that-shit] Config loaded:', config);
  } catch (error) {
    console.error('[glitch-that-shit] Error loading config:', error);
  }
}

// Apply glitch effect to element
function applyGlitchEffect(element, word) {
  if (!config.enabled) return;

  // Create wrapper span for the glitched text
  const span = document.createElement('span');
  span.className = `glitch-that-shit-effect glitch-that-shit-${config.effectType}`;
  span.setAttribute('data-glitched', 'true');
  span.setAttribute('data-original', word);
  span.setAttribute('data-intensity', config.effectIntensity);
  
  // Copy the text content
  span.textContent = word;

  return span;
}

// Scan text node for filtered words
function scanTextNode(node) {
  if (!config.enabled || !node.textContent.trim()) return;

  const text = node.textContent;
  let modified = false;
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  // Build regex from filter list
  const pattern = config.filterList
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape regex special chars
    .join('|');

  if (!pattern) return;

  const regex = new RegExp(
    `\\b(${pattern})\\b`,
    config.caseSensitive ? 'g' : 'gi'
  );

  let match;
  while ((match = regex.exec(text)) !== null) {
    modified = true;

    // Add text before match
    if (match.index > lastIndex) {
      fragment.appendChild(
        document.createTextNode(text.substring(lastIndex, match.index))
      );
    }

    // Add glitched span
    const glitchSpan = applyGlitchEffect(node, match[0]);
    fragment.appendChild(glitchSpan);

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (modified) {
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    // Replace the text node with the fragment
    node.parentNode.replaceChild(fragment, node);
  }
}

// Recursively walk DOM and scan text nodes
function scanElement(element) {
  // Skip already processed elements, scripts, styles, etc.
  if (
    !element ||
    element.hasAttribute('data-glitched') ||
    ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(element.tagName)
  ) {
    return;
  }

  // Process text nodes
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip empty text nodes and already processed nodes
        if (!node.textContent.trim() || node.parentElement?.hasAttribute('data-glitched')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  // Process collected text nodes
  textNodes.forEach(scanTextNode);
}

// Initialize mutation observer to watch for dynamic content
function initObserver() {
  const observer = new MutationObserver((mutations) => {
    if (!config.enabled) return;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scanElement(node);
        } else if (node.nodeType === Node.TEXT_NODE) {
          scanTextNode(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log('[glitch-that-shit] Observer initialized');
}

// Main initialization
async function init() {
  console.log('[glitch-that-shit] Initializing...');

  await loadConfig();

  if (!config.enabled) {
    console.log('[glitch-that-shit] Extension is disabled');
    return;
  }

  // Scan existing content
  scanElement(document.body);

  // Watch for new content
  initObserver();

  console.log('[glitch-that-shit] Active and filtering content');
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[glitch-that-shit] Message received:', message);

  switch (message.type) {
    case 'TOGGLE_ENABLED':
      config.enabled = message.enabled;
      if (config.enabled) {
        scanElement(document.body);
      } else {
        // Remove all glitch effects
        document.querySelectorAll('[data-glitched]').forEach((el) => {
          el.outerHTML = el.textContent;
        });
      }
      sendResponse({ success: true });
      break;

    case 'UPDATE_CONFIG':
      config = { ...config, ...message.config };
      chrome.storage.local.set(config);
      // Re-scan page with new config
      location.reload();
      sendResponse({ success: true });
      break;

    case 'CYCLE_EFFECT':
      const effects = ['glitch', 'pixelate', 'blur', 'scramble', 'rainbow', 'sparkle'];
      const currentIndex = effects.indexOf(config.effectType);
      config.effectType = effects[(currentIndex + 1) % effects.length];
      chrome.storage.local.set({ effectType: config.effectType });
      // Update existing effects
      document.querySelectorAll('[data-glitched]').forEach((el) => {
        el.className = `glitch-that-shit-effect glitch-that-shit-${config.effectType}`;
      });
      sendResponse({ effectType: config.effectType });
      break;

    case 'GET_STATUS':
      sendResponse({ config });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true; // Keep channel open for async response
});

// Listen for keyboard shortcuts (handled by background, but we can respond)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.enabled) {
      config.enabled = changes.enabled.newValue;
      if (!config.enabled) {
        document.querySelectorAll('[data-glitched]').forEach((el) => {
          el.outerHTML = el.textContent;
        });
      }
    }
  }
});

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('[glitch-that-shit] Content script loaded');

