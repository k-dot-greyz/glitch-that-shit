/**
 * glitch-that-shit - Shared Utilities
 * Common functions used across the extension
 */

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between calls
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Escape regex special characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
export function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get default configuration
 * @returns {Object} Default config
 */
export function getDefaultConfig() {
  return {
    enabled: true,
    filterList: ['ad', 'sponsored', 'advertisement', 'promoted'],
    effectType: 'glitch',
    effectIntensity: 'medium',
    caseSensitive: false,
    reduceMotion: false,
    showTooltips: true,
    version: '0.1.0',
  };
}

/**
 * Validate configuration object
 * @param {Object} config - Config to validate
 * @returns {boolean} Whether config is valid
 */
export function validateConfig(config) {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  const validEffects = ['glitch', 'pixelate', 'blur', 'scramble', 'rainbow', 'sparkle'];
  const validIntensities = ['subtle', 'medium', 'extreme'];

  if (config.effectType && !validEffects.includes(config.effectType)) {
    return false;
  }

  if (config.effectIntensity && !validIntensities.includes(config.effectIntensity)) {
    return false;
  }

  if (config.filterList && !Array.isArray(config.filterList)) {
    return false;
  }

  return true;
}

/**
 * Merge config with defaults
 * @param {Object} config - User config
 * @returns {Object} Merged config
 */
export function mergeWithDefaults(config) {
  return { ...getDefaultConfig(), ...config };
}

/**
 * Log message with extension prefix
 * @param {string} message - Message to log
 * @param {*} data - Additional data
 */
export function log(message, data = null) {
  const prefix = '[glitch-that-shit]';
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

/**
 * Log error with extension prefix
 * @param {string} message - Error message
 * @param {Error} error - Error object
 */
export function logError(message, error = null) {
  const prefix = '[glitch-that-shit]';
  if (error) {
    console.error(prefix, message, error);
  } else {
    console.error(prefix, message);
  }
}

/**
 * Check if element should be skipped
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} Whether to skip element
 */
export function shouldSkipElement(element) {
  const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED'];
  const skipClasses = ['glitch-that-shit-effect'];
  
  if (skipTags.includes(element.tagName)) {
    return true;
  }
  
  if (element.hasAttribute('data-glitched')) {
    return true;
  }
  
  if (skipClasses.some(cls => element.classList.contains(cls))) {
    return true;
  }
  
  return false;
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if reduce motion is preferred
 * @returns {boolean} Whether reduced motion is preferred
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if dark mode is preferred
 * @returns {boolean} Whether dark mode is preferred
 */
export function prefersDarkMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Storage helper - get from chrome.storage
 * @param {string|string[]|null} keys - Keys to get
 * @returns {Promise<Object>} Storage data
 */
export async function storageGet(keys = null) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Storage helper - set in chrome.storage
 * @param {Object} items - Items to set
 * @returns {Promise<void>}
 */
export async function storageSet(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Storage helper - remove from chrome.storage
 * @param {string|string[]} keys - Keys to remove
 * @returns {Promise<void>}
 */
export async function storageRemove(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Send message helper
 * @param {Object} message - Message to send
 * @returns {Promise<*>} Response
 */
export async function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Export all utilities as default object for non-module usage
const utils = {
  deepClone,
  debounce,
  throttle,
  escapeRegex,
  getDefaultConfig,
  validateConfig,
  mergeWithDefaults,
  log,
  logError,
  shouldSkipElement,
  formatDate,
  generateId,
  prefersReducedMotion,
  prefersDarkMode,
  storageGet,
  storageSet,
  storageRemove,
  sendMessage,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = utils;
}

