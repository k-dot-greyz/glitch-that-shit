/**
 * glitch-that-shit - Background Service Worker
 * Handles extension-wide logic, keyboard shortcuts, and state management
 */

console.log('[glitch-that-shit] Background service worker starting...');

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  filterList: ['ad', 'sponsored', 'advertisement', 'promoted'],
  effectType: 'glitch',
  effectIntensity: 'medium',
  caseSensitive: false,
  version: '0.1.0',
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[glitch-that-shit] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // First time install - set defaults
    await chrome.storage.local.set(DEFAULT_CONFIG);
    console.log('[glitch-that-shit] Default config set');

    // Open welcome page (optional)
    // chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  } else if (details.reason === 'update') {
    // Extension updated - migrate settings if needed
    const existingConfig = await chrome.storage.local.get(null);
    const mergedConfig = { ...DEFAULT_CONFIG, ...existingConfig };
    await chrome.storage.local.set(mergedConfig);
    console.log('[glitch-that-shit] Config migrated after update');
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.log('[glitch-that-shit] Command received:', command);

  switch (command) {
    case 'toggle-extension':
      await toggleExtension();
      break;

    case 'quick-filter':
      await openQuickFilter();
      break;

    case 'cycle-effects':
      await cycleEffects();
      break;

    case 'open-settings':
      chrome.runtime.openOptionsPage();
      break;

    default:
      console.warn('[glitch-that-shit] Unknown command:', command);
  }
});

// Toggle extension on/off
async function toggleExtension() {
  const { enabled } = await chrome.storage.local.get('enabled');
  const newState = !enabled;

  await chrome.storage.local.set({ enabled: newState });

  // Notify all tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'TOGGLE_ENABLED',
      enabled: newState,
    }).catch(() => {
      // Tab might not have content script injected
    });
  });

  // Update badge
  updateBadge(newState);

  console.log('[glitch-that-shit] Extension toggled:', newState ? 'ON' : 'OFF');
}

// Cycle through effect types
async function cycleEffects() {
  const effects = ['glitch', 'pixelate', 'blur', 'scramble', 'rainbow', 'sparkle'];
  const { effectType } = await chrome.storage.local.get('effectType');
  
  const currentIndex = effects.indexOf(effectType || 'glitch');
  const nextEffect = effects[(currentIndex + 1) % effects.length];

  await chrome.storage.local.set({ effectType: nextEffect });

  // Notify all tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    chrome.tabs.sendMessage(tab.id, {
      type: 'CYCLE_EFFECT',
    }).catch(() => {
      // Ignore errors for tabs without content script
    });
  });

  // Show notification
  showNotification(`Effect changed to: ${nextEffect}`);

  console.log('[glitch-that-shit] Effect cycled to:', nextEffect);
}

// Open quick filter dialog
async function openQuickFilter() {
  // Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab) {
    // Inject quick filter UI (we'll implement this in content script)
    chrome.tabs.sendMessage(tab.id, {
      type: 'OPEN_QUICK_FILTER',
    }).catch((error) => {
      console.error('[glitch-that-shit] Error opening quick filter:', error);
    });
  }
}

// Update extension badge
async function updateBadge(enabled) {
  if (enabled === undefined) {
    const result = await chrome.storage.local.get('enabled');
    enabled = result.enabled !== undefined ? result.enabled : true;
  }

  chrome.action.setBadgeText({
    text: enabled ? '' : 'OFF',
  });

  chrome.action.setBadgeBackgroundColor({
    color: enabled ? '#00ff00' : '#ff0000',
  });
}

// Show notification
function showNotification(message, title = 'glitch-that-shit') {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icon128.png'),
    title: title,
    message: message,
    priority: 0,
  });
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[glitch-that-shit] Message received:', message);

  switch (message.type) {
    case 'GET_CONFIG':
      chrome.storage.local.get(null).then(sendResponse);
      return true; // Async response

    case 'UPDATE_CONFIG':
      chrome.storage.local.set(message.config).then(() => {
        sendResponse({ success: true });
        
        // Notify all tabs of config change
        chrome.tabs.query({}).then((tabs) => {
          tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, {
              type: 'UPDATE_CONFIG',
              config: message.config,
            }).catch(() => {});
          });
        });
      });
      return true;

    case 'RESET_CONFIG':
      chrome.storage.local.set(DEFAULT_CONFIG).then(() => {
        sendResponse({ success: true, config: DEFAULT_CONFIG });
      });
      return true;

    case 'EXPORT_CONFIG':
      chrome.storage.local.get(null).then((config) => {
        sendResponse({ config });
      });
      return true;

    case 'IMPORT_CONFIG':
      chrome.storage.local.set(message.config).then(() => {
        sendResponse({ success: true });
      });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return false;
});

// Monitor storage changes and update badge
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.enabled) {
    updateBadge(changes.enabled.newValue);
  }
});

// Context menu items (right-click menu)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'glitch-that-shit-add-selection',
    title: 'Add "%s" to filter list',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'glitch-that-shit-toggle',
    title: 'Toggle glitch-that-shit',
    contexts: ['all'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'glitch-that-shit-add-selection':
      if (info.selectionText) {
        const { filterList } = await chrome.storage.local.get('filterList');
        const newList = [...new Set([...filterList, info.selectionText.trim()])];
        await chrome.storage.local.set({ filterList: newList });
        showNotification(`Added "${info.selectionText}" to filter list`);
      }
      break;

    case 'glitch-that-shit-toggle':
      await toggleExtension();
      break;
  }
});

// Initialize badge on startup
updateBadge();

console.log('[glitch-that-shit] Background service worker ready');

