document.addEventListener('DOMContentLoaded', async () => {
    await SEOJumpI18n.initialize();

    document.getElementById('workflowPanelLink').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) await chrome.sidePanel.open({ tabId: tab.id });
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
