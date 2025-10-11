#!/usr/bin/env node

/**
 * glitch-that-shit Development Environment Setup Script
 * Inspired by zenOS setup philosophy
 * 
 * This script automates:
 * - Environment detection and validation
 * - Git configuration and aliases
 * - Development tool setup
 * - Extension manifest validation
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Configuration
const config = {
  validateOnly: process.argv.includes('--validate-only'),
  unattended: process.argv.includes('--unattended'),
  phase: process.argv.includes('--phase') ? process.argv[process.argv.indexOf('--phase') + 1] : null,
};

// Logger utilities
const log = {
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}\n`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.magenta}→${colors.reset} ${msg}`),
};

// Utility functions
function runCommand(cmd, options = {}) {
  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
    return { success: true, output: result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout || error.stderr || '',
    };
  }
}

function checkCommand(cmd) {
  const result = runCommand(`${cmd} --version`, { silent: true });
  return result.success;
}

function getGitConfig(key) {
  const result = runCommand(`git config --get ${key}`, { silent: true });
  return result.success ? result.output.trim() : null;
}

function setGitConfig(key, value, global = false) {
  const scope = global ? '--global' : '';
  return runCommand(`git config ${scope} ${key} "${value}"`, { silent: true });
}

// Phase 1: Environment Detection
function detectEnvironment() {
  log.header('Phase 1: Environment Detection');
  
  const env = {
    os: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    shell: process.env.SHELL || process.env.ComSpec,
    isTermux: process.env.PREFIX && process.env.PREFIX.includes('com.termux'),
  };

  log.info(`Operating System: ${env.os} (${env.arch})`);
  log.info(`Node.js Version: ${env.nodeVersion}`);
  log.info(`Shell: ${path.basename(env.shell)}`);
  
  if (env.isTermux) {
    log.info('Termux/Android environment detected');
  }

  // Check Node.js version
  const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
  if (nodeVersion < 16) {
    log.error(`Node.js 16+ required, found ${process.version}`);
    return false;
  }
  log.success('Node.js version OK');

  // Check Git
  if (checkCommand('git')) {
    const gitVersion = runCommand('git --version', { silent: true }).output.trim();
    log.success(`Git installed: ${gitVersion}`);
  } else {
    log.error('Git not found. Please install Git first.');
    return false;
  }

  // Check npm
  if (checkCommand('npm')) {
    const npmVersion = runCommand('npm --version', { silent: true }).output.trim();
    log.success(`npm installed: ${npmVersion}`);
  } else {
    log.error('npm not found. Please install Node.js/npm first.');
    return false;
  }

  return env;
}

// Phase 2: Git Setup
function setupGit() {
  log.header('Phase 2: Git Configuration');

  // Check if in git repo
  const isGitRepo = fs.existsSync('.git');
  if (!isGitRepo) {
    log.warning('Not in a git repository. Initializing...');
    runCommand('git init');
    log.success('Git repository initialized');
  } else {
    log.success('Git repository detected');
  }

  // Check/set user config
  let userName = getGitConfig('user.name');
  let userEmail = getGitConfig('user.email');

  if (!userName || !userEmail) {
    log.warning('Git user configuration incomplete');
    
    if (!config.unattended) {
      log.info('Please set your git identity:');
      log.info('  git config --global user.name "Your Name"');
      log.info('  git config --global user.email "your@email.com"');
    }
  } else {
    log.success(`Git user: ${userName} <${userEmail}>`);
  }

  // Setup git aliases
  log.step('Configuring git aliases...');
  
  const aliases = {
    'alias.gs': 'status',
    'alias.ga': 'add',
    'alias.gaa': 'add -A',
    'alias.gc': 'commit',
    'alias.gp': 'push',
    'alias.gpu': 'pull',
    'alias.gl': 'log --oneline -10',
    'alias.gd': 'diff',
  };

  Object.entries(aliases).forEach(([key, value]) => {
    setGitConfig(key, value);
  });

  log.success('Git aliases configured');

  // Create/update .gitignore
  log.step('Setting up .gitignore...');
  
  const gitignoreContent = `# Node modules
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
dist/
build/
*.zip
*.xpi

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
desktop.ini

# Environment
.env
.env.local
.env.*.local

# Test coverage
coverage/

# Logs
logs/
*.log

# Temporary files
tmp/
temp/
*.tmp

# Extension specific
web-ext-artifacts/
`;

  fs.writeFileSync('.gitignore', gitignoreContent);
  log.success('.gitignore created');

  return true;
}

// Phase 3: Extension Validation
function validateExtension() {
  log.header('Phase 3: Extension Validation');

  // Check for manifest.json
  const manifestPath = 'manifest.json';
  
  if (!fs.existsSync(manifestPath)) {
    log.warning('manifest.json not found - extension not yet initialized');
    log.info('Create a manifest.json file to define your extension');
    return false;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    log.success('manifest.json found and valid');
    log.info(`  Name: ${manifest.name || 'Not set'}`);
    log.info(`  Version: ${manifest.version || 'Not set'}`);
    log.info(`  Manifest Version: ${manifest.manifest_version || 'Not set'}`);
    
    // Validate required fields
    const requiredFields = ['name', 'version', 'manifest_version'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      log.warning(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return true;
  } catch (error) {
    log.error(`manifest.json parsing error: ${error.message}`);
    return false;
  }
}

// Phase 4: Dependencies
function checkDependencies() {
  log.header('Phase 4: Dependency Check');

  const packageJsonPath = 'package.json';
  
  if (!fs.existsSync(packageJsonPath)) {
    log.error('package.json not found');
    return false;
  }

  log.success('package.json found');

  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    log.warning('node_modules not found');
    log.info('Run: npm install');
    
    if (!config.validateOnly && !config.unattended) {
      log.step('Installing dependencies...');
      const result = runCommand('npm install');
      if (result.success) {
        log.success('Dependencies installed');
      } else {
        log.error('Failed to install dependencies');
        return false;
      }
    }
  } else {
    log.success('node_modules found');
  }

  return true;
}

// Phase 5: Create helpful scripts
function createHelperScripts() {
  log.header('Phase 5: Creating Helper Scripts');

  // Create a simple build script placeholder
  const buildScriptPath = 'scripts/build.js';
  
  if (!fs.existsSync(buildScriptPath)) {
    const buildScript = `#!/usr/bin/env node
/**
 * Build script for glitch-that-shit
 * 
 * Usage:
 *   npm run build         - Build once
 *   npm run build:watch   - Build with watch mode
 */

console.log('Building glitch-that-shit extension...');

// TODO: Add build logic here
// - Compile/transpile source files if needed
// - Copy files to dist/
// - Minify/optimize assets
// - Generate source maps

console.log('✓ Build complete!');
console.log('Load the extension from the project root directory.');
`;

    fs.writeFileSync(buildScriptPath, buildScript);
    log.success('Created scripts/build.js');
  }

  // Create package-chrome script placeholder
  const packageScriptPath = 'scripts/package-chrome.js';
  
  if (!fs.existsSync(packageScriptPath)) {
    const packageScript = `#!/usr/bin/env node
/**
 * Package script for Chrome/Edge distribution
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Packaging for Chrome Web Store...');

// TODO: Add packaging logic
// - Create zip file
// - Exclude development files
// - Include only necessary files

console.log('✓ Package complete!');
`;

    fs.writeFileSync(packageScriptPath, packageScript);
    log.success('Created scripts/package-chrome.js');
  }

  return true;
}

// Main setup flow
async function main() {
  console.log(`
${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         glitch-that-shit Setup v0.1.0                 ║
║         Development Environment Configuration         ║
║                                                       ║
║         Inspired by zenOS philosophy 🧘              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
${colors.reset}
`);

  if (config.validateOnly) {
    log.info('Running in validation-only mode');
  }

  if (config.unattended) {
    log.info('Running in unattended mode');
  }

  // Run phases
  const phases = {
    detection: detectEnvironment,
    git_setup: setupGit,
    extension_validation: validateExtension,
    dependencies: checkDependencies,
    helper_scripts: createHelperScripts,
  };

  // If specific phase requested
  if (config.phase) {
    if (phases[config.phase]) {
      phases[config.phase]();
    } else {
      log.error(`Unknown phase: ${config.phase}`);
      log.info(`Available phases: ${Object.keys(phases).join(', ')}`);
      process.exit(1);
    }
    return;
  }

  // Run all phases
  let success = true;
  
  for (const [name, fn] of Object.entries(phases)) {
    if (config.validateOnly && name === 'helper_scripts') {
      continue; // Skip creation in validate mode
    }
    
    const result = fn();
    
    if (result === false) {
      success = false;
      if (name === 'detection') {
        log.error('Environment detection failed. Cannot continue.');
        break;
      }
    }
  }

  // Summary
  log.header('Setup Summary');
  
  if (success) {
    log.success('Setup completed successfully! 🎉');
    console.log(`
${colors.cyan}Next steps:${colors.reset}

1. ${colors.bright}Install dependencies${colors.reset} (if not done):
   ${colors.dim}npm install${colors.reset}

2. ${colors.bright}Load extension in browser${colors.reset}:
   ${colors.dim}Chrome: chrome://extensions/ → Load unpacked${colors.reset}
   ${colors.dim}Firefox: about:debugging → Load Temporary Add-on${colors.reset}

3. ${colors.bright}Start coding!${colors.reset}
   ${colors.dim}See DEV_SETUP.md for detailed instructions${colors.reset}

4. ${colors.bright}Quick commands${colors.reset}:
   ${colors.dim}npm test          - Run tests${colors.reset}
   ${colors.dim}npm run lint      - Check code style${colors.reset}
   ${colors.dim}npm run format    - Format code${colors.reset}

${colors.magenta}Happy hacking! ✨${colors.reset}
`);
  } else {
    log.error('Setup completed with issues. Please review errors above.');
    process.exit(1);
  }
}

// Run setup
main().catch((error) => {
  log.error(`Setup failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});

