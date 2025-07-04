try {
  importScripts('utils.js');
} catch (e) {
  console.error(e);
}

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
  log(`State updated: ${JSON.stringify(newState)}`);
  if (popupPort) {
    try {
      popupPort.postMessage({ action: 'stateUpdate', state: state });
    } catch (e) {
      log(`Error sending message to popup: ${e.message}`, 'error');
      popupPort = null;
    }
  }
}

async function enableKillSwitch() {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ['kill_switch_ruleset'] });
    updateState({ killSwitchActive: true, error: 'Proxy connection lost. Kill switch activated.' });
    log('Kill switch activated: All network requests are blocked.', 'warn');
  } catch (e) {
    log(`Error enabling kill switch: ${e.message}`, 'error');
    updateState({ error: 'Failed to activate kill switch.' });
  }
}

async function disableKillSwitch() {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ['kill_switch_ruleset'] });
    updateState({ killSwitchActive: false, error: null });
    log('Kill switch deactivated.');
  } catch (e) {
    log(`Error disabling kill switch: ${e.message}`, 'error');
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
    log(`Error enabling Tor: ${e.message}`, 'error');
    updateState({ torEnabled: false, error: 'Failed to enable proxy. Please ensure the standalone Tor service is installed and running on 127.0.0.1:9050. Refer to the README for setup instructions.' });
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
    log(`Error disabling Tor: ${e.message}`, 'error');
    updateState({ torEnabled: false, error: 'Failed to disable proxy or clear settings.' });
  }
}

async function checkIp() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) {
      throw new CloaxaError(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    updateState({ ip: data.ip });
    checkTorStatus(data.ip);
  } catch (err) {
    log(`Error fetching IP: ${err.message}`, 'error');
    updateState({ error: 'Failed to fetch IP address.' });
  }
}

async function checkTorStatus(ip) {
  try {
    const response = await fetch(`https://check.torproject.org/api/ip?ip=${ip}`);
    if (!response.ok) {
      throw new CloaxaError(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    updateState({ isTor: data.IsTor });
  } catch (err) {
    log(`Error checking Tor status: ${err.message}`, 'error');
    updateState({ error: 'Failed to check Tor status.' });
  }
}

async function checkProxyConnectivity() {
  if (!state.torEnabled) return;

  try {
    const testUrl = 'https://check.torproject.org/api/ip';
    const response = await fetch(testUrl, { mode: 'no-cors' });
    if (state.killSwitchActive) {
      await disableKillSwitch();
    }
  } catch (e) {
    log(`Proxy connectivity check failed: ${e.message}`, 'warn');
    if (!state.killSwitchActive) {
      await enableKillSwitch();
    }
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'cloaxa_popup') {
    popupPort = port;
    log('Popup connected.');

    try {
      port.postMessage({ action: 'stateUpdate', state: state });
    } catch (e) {
      log(`Error sending initial state to popup: ${e.message}`, 'error');
    }

    port.onDisconnect.addListener(() => {
      popupPort = null;
      log('Popup disconnected.');
    });

    port.onMessage.addListener(async (message) => {
      if (message.action === 'toggleTor') {
        if (message.enabled) {
          enableTor();
        } else {
          disableTor();
        }
      } else if (message.action === 'newIdentity') {
        log('New identity requested.');
        // Disable and re-enable Tor to force a new circuit
        await disableTor();
        await enableTor();
      }
    });
  }
});

async function handleTabRemoved(tabId, removeInfo) {
  if (removeInfo.isWindowClosing) return; // Don't process if the whole window is closing

  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab && tab.url) {
      const url = new URL(tab.url);
      const domain = url.hostname;
      if (domain) {
        log(`Tab ${tabId} closed. Deleting cookies for domain: ${domain}`);
        const cookies = await chrome.cookies.getAll({ domain: domain });
        for (const cookie of cookies) {
          await chrome.cookies.remove({
            url: `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`,
            name: cookie.name
          });
        }
        log(`Deleted ${cookies.length} cookies for ${domain}`);
      }
    }
  } catch (e) {
    // Tab might already be gone if it was a quick close, or permissions issue
    log(`Error handling tab removed: ${e.message}`, 'error');
  }
}

chrome.tabs.onRemoved.addListener(handleTabRemoved);

// Initialize state on startup
chrome.storage.local.get(['torEnabled'], async (result) => {
  if (result.torEnabled) {
    log('Enabling Tor on startup.');
    try {
      await enableTor();
    } catch (e) {
      log(`Error enabling Tor on startup: ${e.message}`, 'error');
      updateState({ torEnabled: false, error: 'Failed to enable Tor on startup.' });
    }
  }
});

