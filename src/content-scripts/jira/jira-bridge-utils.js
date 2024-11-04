import { config } from '../../../config.js';
import { updateTargetIssue } from '../../service.js';
import { firstMatch, isNotEmpty, sendAsyncMessage } from '../../utils.js';

export const atcxCacheKey = 'atc-x-source-issues-cache';
export const atcxUsersCacheKey = 'atc-x-source-users-cache';

let previousGetSourceIssues;
let previousSourceIssueKeys = [];

export const refreshSourceIssuesCache = async (sourceIssueKeys) => {
    console.debug('atc-x: refreshing cache for issues', sourceIssueKeys);
    const sourceIssuesMap = JSON.parse(sessionStorage.getItem(atcxCacheKey) ?? '{}');
    sourceIssueKeys.forEach((sourceIssueKey) => delete sourceIssuesMap[sourceIssueKey]);
    sessionStorage.setItem(atcxCacheKey, JSON.stringify(sourceIssuesMap));
    previousSourceIssueKeys = [];
}

export const getSourceIssues = async (sourceIssueKeys) => {
    sourceIssueKeys = sourceIssueKeys.filter((sourceIssueKey) => isNotEmpty(sourceIssueKey));
    if (!sourceIssueKeys.some((sourceIssueKey) => !previousSourceIssueKeys.includes(sourceIssueKey))) {
        if (previousGetSourceIssues) {
            return previousGetSourceIssues;
        }
    }
    previousSourceIssueKeys = sourceIssueKeys;
    if (previousGetSourceIssues) {
        console.log('atc-x: waiting for previous source issues to load');
        await previousGetSourceIssues;
    }
    const getSourceIssuesInternal = async () => {
        const sourceIssuesMap = JSON.parse(sessionStorage.getItem(atcxCacheKey) ?? '{}');
        const missingSourceIssueKeys = sourceIssueKeys.filter((sourceIssueKey) => !sourceIssuesMap[sourceIssueKey]);
        if (!missingSourceIssueKeys.length) {
            return sourceIssuesMap;
        }
        showToast({
            id: 'atcx.getSourceIssues',
            type: 'info',
            title: 'ATC-X',
            body: 'Loading ATC status, priority and assignee',
            close: 'auto',
        });
        console.group('atc-x: getSourceIssues');
        console.log('atc-x: cached source issues', Object.keys(sourceIssuesMap));
        console.log('atc-x: loading source issues', missingSourceIssueKeys);
        const sourceIssues = await sendAsyncMessage({
            function: 'searchSourceIssues',
            sourceIssueKeys: missingSourceIssueKeys,
        });
        sourceIssues.forEach((sourceIssue) => sourceIssuesMap[sourceIssue.key] = sourceIssue);
        sessionStorage.setItem(atcxCacheKey, JSON.stringify(sourceIssuesMap));
        console.log('atc-x: loading finished');
        console.groupEnd();
        return sourceIssuesMap;
    }
    previousGetSourceIssues = getSourceIssuesInternal();
    return previousGetSourceIssues;
};

const expandedSourceIssueCalls = {};
export const getSourceIssueExpanded = async (sourceIssueKey, targetIssueKey) => {
    if (expandedSourceIssueCalls[sourceIssueKey]) {
        return expandedSourceIssueCalls[sourceIssueKey];
    }
    const getSourceIssueExpandedInternal = async (sourceIssueKey) => {
        const sourceIssuesMap = JSON.parse(sessionStorage.getItem(atcxCacheKey) ?? '{}');
        const sourceIssue = await sendAsyncMessage({
            function: 'fetchSourceIssue',
            sourceIssueKey,
        });
        sourceIssuesMap[sourceIssueKey] = sourceIssue;
        sessionStorage.setItem(atcxCacheKey, JSON.stringify(sourceIssuesMap));
        if (config['target.jira.update.async.on.view.enabled']) {
            sendAsyncMessage({
                function: 'updateTargetIssue',
                sourceIssue: JSON.stringify(sourceIssue),
                targetIssueKey,
            });
        }
        return sourceIssue;
    }
    expandedSourceIssueCalls[sourceIssueKey] = getSourceIssueExpandedInternal(sourceIssueKey);
    return expandedSourceIssueCalls[sourceIssueKey].then((res) => {
        delete expandedSourceIssueCalls[sourceIssueKey];
        return res;
    });
}

const sourceUserCalls = {};
export const getSourceUser = async (username) => {
    if (sourceUserCalls[username]) {
        return sourceUserCalls[username];
    }
    const getSourceUserInternal = async (username) => {
        const usersCache = JSON.parse(localStorage.getItem(atcxUsersCacheKey) ?? '{}');
        if (!usersCache[username]) {
            usersCache[username] = await sendAsyncMessage({
                function: 'fetchSourceUser',
                username,
            });
        }
        localStorage.setItem(atcxUsersCacheKey, JSON.stringify(usersCache));
        return usersCache[username];
    }
    sourceUserCalls[username] = getSourceUserInternal(username);
    return sourceUserCalls[username];
}

export const getSourceUsers = async (usernames) => usernames?.length ? Promise.all(usernames.map(getSourceUser)) : [];

export const getSourceIssueStatus = (sourceIssue) => {
    const atcStatus = sourceIssue.fields.status.name;
    const pendingReason = sourceIssue.fields['customfield_11000']?.value;
    if (atcStatus.toUpperCase() === 'PENDING' && pendingReason) {
        if (pendingReason === 'Waiting for deployment') {
            return 'Pending Deployment';
        }
        if (pendingReason === 'Waiting for information') {
            return 'Pending Information';
        }
    }
    return atcStatus;
};

export const statusColorMap = {
    ['OPEN']: '#42526e',
    ['NEW']: '#42526e',
    ['PENDING']: '#42526e',
    ['PENDING INFORMATION']: '#42526e',
    ['PENDING DEPLOYMENT']: '#42526e',
    ['IN PROGRESS']: '#0052cc',
    ['IN REVIEW']: '#0052cc',
    ['IN TEST']: '#0052cc',
    ['RESOLVED']: '#00875a',
    ['CLOSED']: '#00875a',
    ['DEFAULT']: '#42526e',
};

export const injectAtcxRefreshButton = async (sourceIssueKeys) => {
    // Skip execution if ATC-X refresh button is already injected.
    const elementId = 'atcx-refresh-button';
    let atcxRefreshButton = document.getElementById(elementId);
    if (!atcxRefreshButton) {
        // Find the toolbar container based on window url.
        const rapidViewUrl = 'target-jira-url/secure/RapidBoard.jspa';
        const toolbarContainer = window.location.href.startsWith(rapidViewUrl)
            ? document.getElementById('ghx-view-pluggable')
            : document.getElementById('opsbar-jira.issue.tools');
        // Inject ATC-X refresh button.
        atcxRefreshButton = document.createElement('button');
        atcxRefreshButton.id = elementId;
        atcxRefreshButton.textContent = 'Refresh ATC-X';
        atcxRefreshButton.classList.add('aui-button');
        atcxRefreshButton.style.backgroundColor = '#2b2b2b';
        atcxRefreshButton.style.borderColor = '#2b2b2b !important';
        atcxRefreshButton.style.color = 'white';
        // Change the hover color on mouseenter because :hover style can't be changed via js.
        atcxRefreshButton.onmouseenter = () => {
            atcxRefreshButton.style.backgroundColor = '#3b3b3b';
            atcxRefreshButton.style.borderColor = '#3b3b3b !important';
        };
        // Set back the hover color on mouseleave because :hover style can't be changed via js.
        atcxRefreshButton.onmouseleave = () => {
            atcxRefreshButton.style.backgroundColor = '#2b2b2b';
            atcxRefreshButton.style.borderColor = '#2b2b2b !important';
        };
        toolbarContainer.prepend(atcxRefreshButton);
    }
    atcxRefreshButton.onclick = () => refreshSourceIssuesCache(sourceIssueKeys);
};

export const injectAtcLink = (elementPrefix, summarySelector, callback) => {
    const summary = summarySelector();
    const sourceIssueKey = firstMatch(summary.textContent, /ABC-\d+/g);
    const elementId = `${elementPrefix}-${sourceIssueKey}`;
    if (!sourceIssueKey || document.getElementById(elementId)) {
        return;
    }
    const atcUrl = `source-jira-url/browse/${sourceIssueKey}`;
    let atcLink = `<a id="${elementId}" href="${atcUrl}" target="_blank">${sourceIssueKey}</a>`;
    summary.innerHTML = summary.innerHTML.replace(/ABC-\d+/g, atcLink);
    atcLink = document.getElementById(elementId);
    if (callback) {
        callback(atcLink);
    }
}

let showToastScriptInjected;
export const showToast = (toast) => {
    if (!showToastScriptInjected) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('src/injection-scripts/jira/show-toast.js');
        document.head.appendChild(script);
        showToastScriptInjected = true;
    }
    window?.postMessage({
        type: 'atcx.toast',
        toast
    }, '*');
}

export const priorityIconUrl = (iconUrl) => {
    iconUrl = iconUrl.split('/');
    iconUrl = iconUrl[iconUrl.length - 1];
    iconUrl = chrome.runtime.getURL('assets/' + iconUrl);
    return iconUrl;
}

export const sourceUserUrl = (username) => `source-jira-url/secure/ViewProfile.jspa?name=${username}`;