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

function updateUi(state) {
  torToggle.checked = state.torEnabled;
  mainStatus.textContent = state.torEnabled ? 'Tor Enabled' : 'Tor Disabled';
  mainStatus.className = state.torEnabled ? 'text-center text-2xl font-bold mb-6 status-enabled' : 'text-center text-2xl font-bold mb-6 status-disabled';
  
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

  error.textContent = state.error || '';
}

let port = null;

function connectToBackground() {
  port = chrome.runtime.connect({ name: 'cloaxa_popup' });

  port.onMessage.addListener((message) => {
    if (message.action === 'stateUpdate') {
      updateUi(message.state);
    }
  });

  port.onDisconnect.addListener(() => {
    console.warn('Disconnected from background script. Attempting to reconnect...');
    port = null;
    // Re-attempt connection after a short delay
    setTimeout(connectToBackground, 1000);
  });
}

// Initial connection attempt with a slight delay
setTimeout(connectToBackground, 50);

torToggle.addEventListener('change', () => {
  const enabled = torToggle.checked;
  if (port) {
    try {
      port.postMessage({ action: 'toggleTor', enabled: enabled });
    } catch (e) {
      console.error('Error sending message to background:', e);
      torToggle.checked = !enabled; // Revert toggle if message fails
      error.textContent = 'Failed to communicate with background service.';
      port = null; // Invalidate port if sending fails
      // The onDisconnect listener will handle reconnection
    }
  } else {
    // If port is null, the connection is not ready.
    // Revert the toggle and inform the user.
    console.warn('Port not established. Cannot send message.');
    torToggle.checked = !enabled; // Revert toggle
    error.textContent = 'Not connected to background service. Please try again.';
  }
  // The background script now handles saving torEnabled state to storage
  // chrome.storage.local.set({ torEnabled: enabled }); // Removed as background handles this
});