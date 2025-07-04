const torToggle = document.getElementById('torToggle');
const mainStatus = document.getElementById('mainStatus');
const error = document.getElementById('error');
const ipAddress = document.getElementById('ipAddress');
const torStatus = document.getElementById('torStatus');
const webRtcStatus = document.getElementById('webRtcStatus');
const userAgentStatus = document.getElementById('userAgentStatus');
const refererStatus = document.getElementById('refererStatus');
const timezoneStatus = document.getElementById('timezoneStatus');
const geolocationStatus = document.getElementById('geolocationStatus');
const reloadButton = document.getElementById('reloadButton');
const killSwitchMessage = document.getElementById('killSwitchMessage');
const newIdentityButton = document.getElementById('newIdentityButton');
const serviceStatus = document.getElementById('serviceStatus');

let port = null;

/**
 * Updates the UI based on the current state.
 * This function is the single source of truth for rendering the UI.
 * @param {object} state - The current state of the extension.
 */
function updateUi(state) {
  log(`updateUi called with state: ${JSON.stringify(state)}`);

  // --- 1. Comprehensive Reset of all dynamic UI elements ---
  mainStatus.textContent = '';
  mainStatus.className = '';
  killSwitchMessage.style.display = 'none';
  document.body.style.backgroundColor = '#1a1a2e'; // Original dark background
  error.textContent = '';
  reloadButton.style.display = 'none';
  newIdentityButton.style.display = 'none';
  torToggle.disabled = false; // Default to enabled

  // --- 2. Apply Kill Switch specific UI (Highest Priority) ---
  if (state.killSwitchActive) {
    log('Kill switch active.');
    killSwitchMessage.style.display = 'block';
    mainStatus.textContent = 'NETWORK BLOCKED';
    mainStatus.className = 'text-center text-2xl font-bold mb-6 text-red-500';
    document.body.style.backgroundColor = '#4a0000'; // Dark red background
    // torToggle.disabled = true; // REMOVED: Allow user to toggle off even with kill switch
  } else {
    log('Kill switch not active.');
    // --- 3. Apply general Tor Enabled/Disabled status if kill switch is not active ---
    mainStatus.textContent = state.torEnabled ? 'Tor Enabled' : 'Tor Disabled';
    mainStatus.className = state.torEnabled ? 'text-center text-2xl font-bold mb-6 status-enabled' : 'text-center text-2xl font-bold mb-6 status-disabled';
    torToggle.checked = state.torEnabled; // Set toggle state
    if (state.torEnabled) {
      newIdentityButton.style.display = 'block';
    }
  }

  // --- 4. Apply Error specific UI (Overrides some previous settings if an error exists) ---
  if (state.error) {
    error.textContent = state.error;
    reloadButton.style.display = 'block';
    newIdentityButton.style.display = 'none'; // Hide new identity button on error
  }

  // --- 5. Update other status indicators ---
  ipAddress.textContent = state.ip;
  ipAddress.className = state.ip !== 'N/A' ? 'font-mono text-sm status-info' : 'font-mono text-sm status-warning';

  torStatus.textContent = state.isTor ? 'Connected' : 'Not Connected';
  torStatus.className = state.isTor ? 'font-mono text-sm status-info' : 'font-mono text-sm status-warning';

  webRtcStatus.textContent = state.torEnabled ? 'Protected' : 'Default';
  webRtcStatus.className = state.torEnabled ? 'font-mono text-sm status-info' : 'font-mono text-sm status-warning';

  userAgentStatus.textContent = state.torEnabled ? 'Spoofed' : 'Default';
  userAgentStatus.className = state.torEnabled ? 'font-mono text-sm status-info' : 'font-mono text-sm status-warning';

  refererStatus.textContent = state.torEnabled ? 'Spoofed' : 'Default';
  refererStatus.className = state.torEnabled ? 'font-mono text-sm status-info' : 'font-mono text-sm status-warning';

  timezoneStatus.textContent = state.torEnabled ? 'Spoofed (UTC)' : 'Default';
  timezoneStatus.className = state.torEnabled ? 'font-mono text-sm status-info' : 'font-mono text-sm status-warning';

  geolocationStatus.textContent = state.torEnabled ? 'Spoofed' : 'Default';
  geolocationStatus.className = state.torEnabled ? 'font-mono text-sm status-info' : 'font-mono text-sm status-warning';
}

/**
 * Sets the connection status in the UI.
 * @param {boolean} connected - Whether the popup is connected to the background script.
 */
function setServiceStatus(connected) {
  if (connected) {
    serviceStatus.textContent = 'Connected';
    serviceStatus.className = 'font-mono text-sm status-info';
  } else {
    serviceStatus.textContent = 'Disconnected';
    serviceStatus.className = 'font-mono text-sm status-warning';
  }
}

function setUIState(stateName, errorMessage = '') {
  // setUIState should primarily manage the connection/loading states,
  // and let updateUi handle the detailed rendering based on the actual state object.
  // It should NOT directly manipulate error, reloadButton, newIdentityButton, killSwitchMessage, or body background.

  switch (stateName) {
    case 'connecting':
      mainStatus.textContent = 'Connecting...';
      mainStatus.className = 'text-center text-2xl font-bold mb-6 status-info';
      torToggle.disabled = true;
      // Other elements will be hidden/shown by updateUi when stateUpdate comes
      break;
    case 'connected':
      // updateUi will handle the mainStatus, torToggle.checked, etc.
      // This state primarily means the connection to background script is established.
      // torToggle.disabled will be set by updateUi based on actual state.
      break;
    case 'disconnected':
      mainStatus.textContent = 'Service Disconnected';
      mainStatus.className = 'text-center text-2xl font-bold mb-6 status-disabled';
      torToggle.disabled = true; // Disable toggle if disconnected from background script
      error.textContent = 'Could not connect to the background service. Please ensure Tor is running.';
      reloadButton.style.display = 'block'; // Show reload button if disconnected from background
      break;
    case 'error':
      // This case is primarily for internal popup errors, not background script errors.
      // Background script errors are handled by updateUi(state.error).
      // If this is called, it means the popup itself has an issue.
      error.textContent = errorMessage;
      reloadButton.style.display = 'block';
      torToggle.disabled = true;
      break;
  }
}

/**
 * Sets the connection status in the UI.
 * @param {boolean} connected - Whether the popup is connected to the background script.
 */
function setServiceStatus(connected) {
  if (connected) {
    serviceStatus.textContent = 'Connected';
    serviceStatus.className = 'font-mono text-sm status-info';
  } else {
    serviceStatus.textContent = 'Disconnected';
    serviceStatus.className = 'font-mono text-sm status-warning';
  }
}

function setUIState(stateName, errorMessage = '') {
  log(`setUIState called: ${stateName}, error: ${errorMessage}`);
  // setUIState now ONLY manages mainStatus text and torToggle.disabled for connecting/disconnected.
  // All other UI elements are managed by updateUi.

  switch (stateName) {
    case 'connecting':
      mainStatus.textContent = 'Connecting...';
      mainStatus.className = 'text-center text-2xl font-bold mb-6 status-info';
      torToggle.disabled = true;
      break;
    case 'connected':
      // updateUi will handle the mainStatus, torToggle.checked, etc.
      // This state primarily means the connection to background script is established.
      // torToggle.disabled will be set by updateUi based on actual state.
      break;
    case 'disconnected':
      mainStatus.textContent = 'Service Disconnected';
      mainStatus.className = 'text-center text-2xl font-bold mb-6 status-disabled';
      torToggle.disabled = true; // Disable toggle if disconnected from background script
      // Error message and reload button will be handled by updateUi if state.error is set
      break;
    case 'error':
      // This case is primarily for internal popup errors, not background script errors.
      // Background script errors are handled by updateUi(state.error).
      // If this is called, it means the popup itself has an issue.
      // We still set mainStatus and disable toggle here for immediate feedback.
      mainStatus.textContent = 'Error!';
      mainStatus.className = 'text-center text-2xl font-bold mb-6 text-red-500';
      error.textContent = errorMessage; // Display the specific error message
      reloadButton.style.display = 'block'; // Show reload button for internal errors
      break;
  }
}

reloadButton.addEventListener('click', () => {
  // Set torEnabled to false in storage before reloading to ensure a clean start
  chrome.storage.local.set({ torEnabled: false }, () => {
    chrome.runtime.reload();
  });
});

newIdentityButton.addEventListener('click', () => {
  if (port) {
    try {
      port.postMessage({ action: 'newIdentity' });
      setUIState('connecting'); // Show connecting state while new identity is being established
    } catch (e) {
      log(`Error sending newIdentity message: ${e.message}`, 'error');
      error.textContent = 'Failed to request new identity. Please try again.';
      setUIState('error', error.textContent);
    }
  } else {
    log('Port not established. Cannot send newIdentity message.', 'warn');
    error.textContent = 'Not connected to the background service. Cannot request new identity.';
    setUIState('error', error.textContent);
  }
});

/**
 * Connects to the background script.
 */
function connectToBackground() {
  try {
    port = chrome.runtime.connect({ name: 'cloaxa_popup' });
    setServiceStatus(true);

    port.onMessage.addListener((message) => {
      if (message.action === 'stateUpdate') {
        updateUi(message.state);
        // The toggle should be enabled by default unless an action is in progress
        if (!message.state.error) {
          torToggle.disabled = false;
        }
      }
    });

    port.onDisconnect.addListener(() => {
      log('Disconnected from background script.', 'warn');
      port = null;
      setServiceStatus(false);
      setUIState('disconnected');
    });
  } catch (e) {
    log(`Error connecting to background script: ${e.message}`, 'error');
    setServiceStatus(false);
    setUIState('disconnected');
  }
}

torToggle.addEventListener('change', () => {
  const enabled = torToggle.checked;
  if (port) {
    try {
      port.postMessage({ action: 'toggleTor', enabled });
      setUIState('connecting');
    } catch (e) {
      log(`Error sending message to background: ${e.message}`, 'error');
      torToggle.checked = !enabled; // Revert toggle if message fails
      error.textContent = 'Failed to send command. Please try again.';
      port = null; // Invalidate port if sending fails
      setServiceStatus(false);
      setUIState('disconnected');
    }
  } else {
    log('Port not established. Cannot send message.', 'warn');
    torToggle.checked = !enabled; // Revert toggle
    error.textContent = 'Not connected to the background service. Please try again.';
    setUIState('disconnected');
  }
});

// Initial connection
connectToBackground();