/**
 * glitch-that-shit - Popup JavaScript
 * Handle user interactions in the popup UI
 */

console.log('[glitch-that-shit] Popup script loaded');

// DOM Elements
const enabledToggle = document.getElementById('enabledToggle');
const effectType = document.getElementById('effectType');
const effectIntensity = document.getElementById('effectIntensity');
const filterCount = document.getElementById('filterCount');
const statusIndicator = document.getElementById('statusIndicator');
const cycleEffectBtn = document.getElementById('cycleEffectBtn');
const reloadPageBtn = document.getElementById('reloadPageBtn');
const openOptionsBtn = document.getElementById('openOptionsBtn');
const helpBtn = document.getElementById('helpBtn');
const aboutBtn = document.getElementById('aboutBtn');

// Load current configuration
async function loadConfig() {
  try {
    const config = await chrome.storage.local.get([
      'enabled',
      'filterList',
      'effectType',
      'effectIntensity',
    ]);

    console.log('[glitch-that-shit] Config loaded:', config);

    // Update UI
    enabledToggle.checked = config.enabled !== false;
    effectType.value = config.effectType || 'glitch';
    effectIntensity.value = config.effectIntensity || 'medium';
    filterCount.textContent = config.filterList?.length || 0;

    updateStatusIndicator(config.enabled !== false);
  } catch (error) {
    console.error('[glitch-that-shit] Error loading config:', error);
  }
}

// Update status indicator
function updateStatusIndicator(enabled) {
  statusIndicator.textContent = enabled ? 'Active' : 'Disabled';
  statusIndicator.className = `stat-value ${enabled ? 'active' : 'inactive'}`;
}

// Save configuration
async function saveConfig(updates) {
  try {
    await chrome.storage.local.set(updates);
    console.log('[glitch-that-shit] Config saved:', updates);

    // Notify background and content scripts
    chrome.runtime.sendMessage({
      type: 'UPDATE_CONFIG',
      config: updates,
    });
  } catch (error) {
    console.error('[glitch-that-shit] Error saving config:', error);
  }
}

// Event Listeners

// Toggle extension on/off
enabledToggle.addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  await saveConfig({ enabled });
  updateStatusIndicator(enabled);

  // Send message to current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'TOGGLE_ENABLED',
      enabled,
    }).catch(() => {
      // Tab might not have content script
      console.log('[glitch-that-shit] Could not notify tab');
    });
  }
});

// Change effect type
effectType.addEventListener('change', async (e) => {
  await saveConfig({ effectType: e.target.value });
  
  // Notify current tab to update effects
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'UPDATE_CONFIG',
      config: { effectType: e.target.value },
    }).catch(() => {});
  }
});

// Change effect intensity
effectIntensity.addEventListener('change', async (e) => {
  await saveConfig({ effectIntensity: e.target.value });

  // Notify current tab to update effects
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'UPDATE_CONFIG',
      config: { effectIntensity: e.target.value },
    }).catch(() => {});
  }
});

// Cycle through effects
cycleEffectBtn.addEventListener('click', async () => {
  const effects = ['glitch', 'pixelate', 'blur', 'scramble', 'rainbow', 'sparkle'];
  const currentEffect = effectType.value;
  const currentIndex = effects.indexOf(currentEffect);
  const nextEffect = effects[(currentIndex + 1) % effects.length];

  effectType.value = nextEffect;
  await saveConfig({ effectType: nextEffect });

  // Visual feedback
  cycleEffectBtn.textContent = '🔄 ' + nextEffect.charAt(0).toUpperCase() + nextEffect.slice(1);
  setTimeout(() => {
    cycleEffectBtn.textContent = '🔄 Cycle Effect';
  }, 1500);

  // Notify current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'CYCLE_EFFECT',
    }).catch(() => {});
  }
});

// Reload current page
reloadPageBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.reload(tab.id);
    window.close(); // Close popup after reload
  }
});

// Open options page
openOptionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

// Show help
helpBtn.addEventListener('click', () => {
  chrome.tabs.create({
    url: 'https://github.com/k-dot-greyz/glitch-that-shit#readme',
  });
  window.close();
});

// Show about
aboutBtn.addEventListener('click', () => {
  const aboutText = `
glitch-that-shit v0.1.0

A browser extension that glitches out unwanted words, 
phrases, or ads with custom visual effects.

✨ Built with zenOS philosophy
🔒 Privacy-first, local processing only
🎨 Multiple visual effects
⚡ Real-time content filtering

Created by k-dot-greyz (Kaspars)
MIT License

GitHub: github.com/k-dot-greyz/glitch-that-shit
  `;

  alert(aboutText.trim());
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.enabled) {
      enabledToggle.checked = changes.enabled.newValue;
      updateStatusIndicator(changes.enabled.newValue);
    }
    if (changes.effectType) {
      effectType.value = changes.effectType.newValue;
    }
    if (changes.effectIntensity) {
      effectIntensity.value = changes.effectIntensity.newValue;
    }
    if (changes.filterList) {
      filterCount.textContent = changes.filterList.newValue?.length || 0;
    }
  }
});

// Initialize popup
loadConfig();

console.log('[glitch-that-shit] Popup initialized');

