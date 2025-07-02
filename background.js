const state = {
  torEnabled: false,
  ip: 'N/A',
  isTor: false,
  error: null,
  killSwitchActive: false
};

let popupPort = null;
let proxyCheckInterval = null;

function updateState(newState) {
  Object.assign(state, newState);
  console.log('updateState: popupPort status:', popupPort ? 'connected' : 'disconnected');
  if (popupPort) {
    try {
      popupPort.postMessage({ action: 'stateUpdate', state: state });
      console.log('updateState: Message sent to popup.');
    } catch (e) {
      console.error('Error sending message to popup:', e);
      popupPort = null;
    }
  }
}

async function enableKillSwitch() {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ['kill_switch_ruleset'] });
    updateState({ killSwitchActive: true, error: 'Proxy connection lost. Kill switch activated.' });
    console.warn('Kill switch activated: All network requests are blocked.');
  } catch (e) {
    console.error('Error enabling kill switch:', e);
    updateState({ error: 'Failed to activate kill switch.' });
  }
}

async function disableKillSwitch() {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ['kill_switch_ruleset'] });
    updateState({ killSwitchActive: false, error: null });
    console.log('Kill switch deactivated.');
  } catch (e) {
    console.error('Error disabling kill switch:', e);
    updateState({ error: 'Failed to deactivate kill switch.' });
  }
}

async function enableTor() {
  try {
    await chrome.proxy.settings.set({
      value: {
        mode: 'fixed_servers',
        rules: { singleProxy: { scheme: 'socks5', host: '127.0.0.1', port: 9050 } }
      },
      scope: 'regular'
    });

    await chrome.privacy.network.webRTCIPHandlingPolicy.set({ value: 'disable_non_proxied_udp' });
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ['ruleset_1'] });

    updateState({ torEnabled: true, error: null });
    chrome.storage.local.set({ torEnabled: true });
    checkIp();
    if (proxyCheckInterval) {
      clearInterval(proxyCheckInterval);
    }
    proxyCheckInterval = setInterval(checkProxyConnectivity, 5000); // Check every 5 seconds
  } catch (e) {
    console.error('Error enabling Tor:', e);
    updateState({ torEnabled: false, error: 'Failed to enable proxy or apply settings.' });
  }
}

async function disableTor() {
  try {
    await chrome.proxy.settings.clear({ scope: 'regular' });
    await chrome.privacy.network.webRTCIPHandlingPolicy.clear({});
    await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ['ruleset_1'] });
    if (proxyCheckInterval) {
      clearInterval(proxyCheckInterval);
      proxyCheckInterval = null;
    }
    if (state.killSwitchActive) {
      await disableKillSwitch();
    }
    updateState({ torEnabled: false, ip: 'N/A', isTor: false, error: null });
    chrome.storage.local.set({ torEnabled: false });
  } catch (e) {
    console.error('Error disabling Tor:', e);
    updateState({ torEnabled: false, error: 'Failed to disable proxy or clear settings.' });
  }
}

async function checkIp() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    updateState({ ip: data.ip });
    checkTorStatus(data.ip);
  } catch (err) {
    console.error('Error fetching IP:', err);
    updateState({ error: 'Failed to fetch IP.' });
  }
}

async function checkTorStatus(ip) {
  try {
    const response = await fetch(`https://check.torproject.org/api/ip?ip=${ip}`);
    const data = await response.json();
    updateState({ isTor: data.IsTor });
  } catch (err) {
    console.error('Error checking Tor status:', err);
    updateState({ error: 'Failed to check Tor status.' });
  }
}

async function checkProxyConnectivity() {
  if (!state.torEnabled) return; // Only check if Tor is supposed to be enabled

  try {
    // Attempt to fetch a known resource through the proxy
    const testUrl = 'https://check.torproject.org/api/ip';
    const response = await fetch(testUrl, { mode: 'no-cors' });
    // If we get here, it means the fetch didn't throw an immediate network error.
    // For no-cors, we can't check response.ok, but a successful fetch implies connectivity.
    if (state.killSwitchActive) {
      disableKillSwitch(); // Proxy is back, disable kill switch
    }
  } catch (e) {
    console.error('Proxy connectivity check failed:', e);
    if (!state.killSwitchActive) {
      enableKillSwitch(); // Proxy failed, activate kill switch
    }
  }
}

chrome.runtime.onConnect.addListener((port) => {

  if (port.name === 'cloaxa_popup') {
    popupPort = port;
    try {
      port.postMessage({ action: 'stateUpdate', state: state });
    } catch (e) {
      console.error('Error sending initial state to popup:', e);
    }

    port.onDisconnect.addListener(() => {
      popupPort = null;
    });

    port.onMessage.addListener((message) => {
      if (message.action === 'toggleTor') {
        if (message.enabled) {
          enableTor();
        } else {
          disableTor();
        }
      }
    });
  }
});

// Initialize state on startup
chrome.storage.local.get(['torEnabled'], async (result) => {
  if (result.torEnabled) {
    try {
      await enableTor();
    } catch (e) {
      console.error('Error enabling Tor on startup:', e);
      updateState({ torEnabled: false, error: 'Failed to enable Tor on startup.' });
    }
  }
});

