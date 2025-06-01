// iOS PWA Version Check and Update Helper
// This script helps ensure iOS PWA users always see the latest version

// App version - increment this when making significant changes
const APP_VERSION = '1.0.1';

// Version check frequency (in hours)
const CHECK_FREQUENCY = 24;

// Function to check if running as installed PWA on iOS
function isIOSPWA() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
  return isIOS && isStandalone;
}

// Function to check if we should force refresh based on version
function shouldForceRefresh() {
  // Get stored version (if any)
  const storedVersion = localStorage.getItem('app_version');
  
  // If no stored version or version is different, we should refresh
  if (!storedVersion || storedVersion !== APP_VERSION) {
    return true;
  }
  
  // Check when we last refreshed
  const lastCheck = localStorage.getItem('last_version_check');
  if (!lastCheck) {
    return true;
  }
  
  // Check if enough time has passed since last check
  const hoursSinceLastCheck = (Date.now() - parseInt(lastCheck)) / (1000 * 60 * 60);
  return hoursSinceLastCheck > CHECK_FREQUENCY;
}

// Function to show update notification
function showUpdateNotification() {
  const updateBanner = document.createElement('div');
  updateBanner.style.position = 'fixed';
  updateBanner.style.bottom = '0';
  updateBanner.style.left = '0';
  updateBanner.style.right = '0';
  updateBanner.style.backgroundColor = '#204ECF';
  updateBanner.style.color = 'white';
  updateBanner.style.padding = '12px';
  updateBanner.style.textAlign = 'center';
  updateBanner.style.zIndex = '9999';
  updateBanner.style.boxShadow = '0 -2px 10px rgba(0,0,0,0.2)';
  
  updateBanner.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div style="flex: 1; text-align: left;">New version available!</div>
      <button id="update-now-btn" style="background: white; color: #204ECF; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer;">Update Now</button>
    </div>
  `;
  
  document.body.appendChild(updateBanner);
  
  // Add event listener to update button
  document.getElementById('update-now-btn').addEventListener('click', function() {
    // Force reload from server, not cache
    window.location.reload(true);
    
    // Update stored version and timestamp
    localStorage.setItem('app_version', APP_VERSION);
    localStorage.setItem('last_version_check', Date.now().toString());
  });
}

// Function to add version query params to resource URLs
function addVersionToResources() {
  // Add version to CSS links
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    if (!link.href.includes('?v=')) {
      link.href = link.href + '?v=' + APP_VERSION;
    }
  });
  
  // Add version to script tags
  document.querySelectorAll('script[src]').forEach(script => {
    if (!script.src.includes('?v=') && !script.src.includes('firebase')) {
      script.src = script.src + '?v=' + APP_VERSION;
    }
  });
}

// Main initialization function
function initVersionCheck() {
  // Only run special handling for iOS PWAs
  if (isIOSPWA()) {
    console.log('Running as iOS PWA, checking for updates...');
    
    // Add version parameters to resources
    addVersionToResources();
    
    // Check if we should show update notification
    if (shouldForceRefresh()) {
      showUpdateNotification();
    } else {
      // Update last check timestamp
      localStorage.setItem('last_version_check', Date.now().toString());
    }
  } else {
    // For non-iOS PWAs, just store the current version
    localStorage.setItem('app_version', APP_VERSION);
    localStorage.setItem('last_version_check', Date.now().toString());
  }
}

// Run the version check when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initVersionCheck);
