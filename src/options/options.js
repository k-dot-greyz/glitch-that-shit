/**
 * glitch-that-shit - Options Page JavaScript
 * Comprehensive settings management
 */

console.log('[glitch-that-shit] Options page loaded');

// DOM Elements
const caseSensitive = document.getElementById('caseSensitive');
const filterList = document.getElementById('filterList');
const effectTypeSelect = document.getElementById('effectTypeSelect');
const intensitySelect = document.getElementById('intensitySelect');
const previewEffect = document.getElementById('previewEffect');
const reduceMotion = document.getElementById('reduceMotion');
const showTooltips = document.getElementById('showTooltips');
const addQuickFilters = document.getElementById('addQuickFilters');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const resetBtn = document.getElementById('resetBtn');
const statWords = document.getElementById('statWords');
const statEffect = document.getElementById('statEffect');
const statStatus = document.getElementById('statStatus');
const toast = document.getElementById('toast');

// Common ad-related words
const COMMON_AD_WORDS = [
  'ad',
  'ads',
  'advertisement',
  'sponsored',
  'promotion',
  'promoted',
  'advertising',
  'advert',
  'sponsor',
];

// Load configuration
async function loadConfig() {
  try {
    const config = await chrome.storage.local.get([
      'enabled',
      'filterList',
      'effectType',
      'effectIntensity',
      'caseSensitive',
      'reduceMotion',
      'showTooltips',
    ]);

    console.log('[glitch-that-shit] Config loaded:', config);

    // Update form fields
    caseSensitive.checked = config.caseSensitive || false;
    filterList.value = (config.filterList || []).join('\n');
    effectTypeSelect.value = config.effectType || 'glitch';
    intensitySelect.value = config.effectIntensity || 'medium';
    reduceMotion.checked = config.reduceMotion || false;
    showTooltips.checked = config.showTooltips !== false;

    // Update statistics
    updateStatistics(config);
    
    // Update preview
    updatePreview();
  } catch (error) {
    console.error('[glitch-that-shit] Error loading config:', error);
    showToast('Error loading settings', 'error');
  }
}

// Save configuration
async function saveConfig() {
  try {
    const words = filterList.value
      .split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0);

    const config = {
      caseSensitive: caseSensitive.checked,
      filterList: words,
      effectType: effectTypeSelect.value,
      effectIntensity: intensitySelect.value,
      reduceMotion: reduceMotion.checked,
      showTooltips: showTooltips.checked,
    };

    await chrome.storage.local.set(config);
    console.log('[glitch-that-shit] Config saved:', config);

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'UPDATE_CONFIG',
      config,
    });

    // Update statistics
    updateStatistics(config);

    showToast('Settings saved successfully!');
  } catch (error) {
    console.error('[glitch-that-shit] Error saving config:', error);
    showToast('Error saving settings', 'error');
  }
}

// Update statistics display
function updateStatistics(config) {
  statWords.textContent = config.filterList?.length || 0;
  statEffect.textContent = config.effectType || 'glitch';
  statStatus.textContent = config.enabled !== false ? 'Active' : 'Disabled';
  statStatus.style.color = config.enabled !== false ? 'var(--success-color)' : 'var(--danger-color)';
}

// Update preview effect
function updatePreview() {
  const effectType = effectTypeSelect.value;
  const intensity = intensitySelect.value;
  
  previewEffect.className = `glitch-that-shit-effect glitch-that-shit-${effectType}`;
  previewEffect.setAttribute('data-intensity', intensity);
  previewEffect.setAttribute('data-original', 'glitched');
}

// Show toast notification
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Export settings
function exportSettings() {
  chrome.storage.local.get(null, (config) => {
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `glitch-that-shit-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('Settings exported successfully!');
  });
}

// Import settings
function importSettings(file) {
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
      const config = JSON.parse(e.target.result);
      
      // Validate config
      if (typeof config !== 'object' || config === null) {
        throw new Error('Invalid configuration file');
      }
      
      await chrome.storage.local.set(config);
      await loadConfig();
      
      showToast('Settings imported successfully!');
      
      // Reload page to apply changes
      setTimeout(() => location.reload(), 1500);
    } catch (error) {
      console.error('[glitch-that-shit] Error importing config:', error);
      showToast('Error importing settings', 'error');
    }
  };
  
  reader.readAsText(file);
}

// Reset to defaults
async function resetSettings() {
  const confirmed = confirm(
    'Are you sure you want to reset all settings to defaults? This cannot be undone.'
  );
  
  if (!confirmed) return;
  
  try {
    await chrome.runtime.sendMessage({ type: 'RESET_CONFIG' });
    await loadConfig();
    showToast('Settings reset to defaults');
  } catch (error) {
    console.error('[glitch-that-shit] Error resetting config:', error);
    showToast('Error resetting settings', 'error');
  }
}

// Add common ad words
function addCommonAdWords() {
  const currentWords = filterList.value
    .split('\n')
    .map(word => word.trim())
    .filter(word => word.length > 0);
  
  const combinedWords = [...new Set([...currentWords, ...COMMON_AD_WORDS])];
  filterList.value = combinedWords.join('\n');
  
  showToast(`Added ${COMMON_AD_WORDS.length} common ad words`);
  saveConfig();
}

// Event Listeners

// Auto-save on change
caseSensitive.addEventListener('change', saveConfig);
reduceMotion.addEventListener('change', saveConfig);
showTooltips.addEventListener('change', saveConfig);

// Auto-save filter list (debounced)
let filterListTimeout;
filterList.addEventListener('input', () => {
  clearTimeout(filterListTimeout);
  filterListTimeout = setTimeout(saveConfig, 1000);
});

// Effect type change
effectTypeSelect.addEventListener('change', () => {
  updatePreview();
  saveConfig();
});

// Intensity change
intensitySelect.addEventListener('change', () => {
  updatePreview();
  saveConfig();
});

// Button clicks
addQuickFilters.addEventListener('click', addCommonAdWords);
exportBtn.addEventListener('click', exportSettings);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
  if (e.target.files[0]) {
    importSettings(e.target.files[0]);
  }
});
resetBtn.addEventListener('click', resetSettings);

// Listen for storage changes from other contexts
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    loadConfig();
  }
});

// Initialize
loadConfig();

console.log('[glitch-that-shit] Options page initialized');

