document.addEventListener('DOMContentLoaded', async () => {
    const sourceTabPromise = chrome.tabs.query({ active: true, currentWindow: true });
    await SEOJumpI18n.initialize();
    const [sourceTab] = await sourceTabPromise;

    document.getElementById('workflowPanelLink').addEventListener('click', async () => {
        if (sourceTab?.id) {
            const openPromise = chrome.sidePanel.open({ tabId: sourceTab.id });
            const response = await chrome.runtime.sendMessage({ type: 'prepareWorkflowLaunch', tabId: sourceTab.id });
            if (!response?.success) return;
            await openPromise;
        }
        window.close();
    });

    document.getElementById('marketLink').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://SearchEngines.cc' });
        window.close();
    });

    document.getElementById('allowCopyBtn').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'enableCopy' });
        window.close();
    });

    document.getElementById('settingsLink').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });
});
