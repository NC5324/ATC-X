(async () => {
    console.debug('atc-x: refreshing issue page');
    JIRA.trigger(JIRA.Events.REFRESH_ISSUE_PAGE, [JIRA.Issue.getIssueId()]);
    await new Promise((resolve, reject) => {
        const element = document.getElementById('jira');
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName == 'class') {
                    if (!mutation.target.classList.contains('ghx-loading-pool')) {
                        observer.disconnect();
                        resolve(true);
                        break;
                    }
                }
            }
        });
        observer.observe(element, { attributes: true });
        setTimeout(() => {
            observer.disconnect();
            if (!element.classList.contains('ghx-loading-pool')) {
                resolve(true);
            }
            reject(new Error('Timeout reached. Board took too long to load.'));
        }, 2000);
    });
    window.postMessage({ type: 'ATC-X-REFRESH-DONE' }, '*')
})();