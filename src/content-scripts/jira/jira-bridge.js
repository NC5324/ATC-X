Promise.all([
    import('./jira-board-bridge.js'),
    import('./jira-backlog-bridge.js'),
    import('./jira-details-bridge.js'),
    import('../../utils.js'),
]).then(([
    { injectAtcDetailsIntoBoardView },
    { injectAtcDetailsIntoBacklogView },
    { injectAtcDetailsIntoDetailedView },
    { repeatAsync },
]) => {
    const injectAtcDetails = repeatAsync(() => Promise.all([
        injectAtcDetailsIntoDetailedView(),
        injectAtcDetailsIntoBacklogView(),
        injectAtcDetailsIntoBoardView(),
    ]), 1000);
    injectAtcDetails.onStart = () => console.log('atc-x: polling started');
    injectAtcDetails.onStop = () => console.log('atc-x: polling stopped');
    window.addEventListener('focus', () => injectAtcDetails.start());
    window.addEventListener('blur', () => injectAtcDetails.stop());
});
