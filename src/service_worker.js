import { atcxCacheKey } from './content-scripts/jira/jira-bridge-utils.js';
import { importOrUpdateBySourceIssueKeys, updateByTargetIssueKeys, searchSourceIssues, searchTargetIssues, fetchSourceIssue, updateTargetIssue, fetchSourceUser, fetchImage, searchGitlabBranches } from './service.js';
import { firstMatch, notifyError, notifySuccess } from './utils.js';

chrome.runtime.onInstalled.addListener(() => {
  // Create a context menu item
  chrome.contextMenus.create({
    id: 'atc-x',
    title: 'Transfer to Target Jira',
    contexts: ['page'],
    documentUrlPatterns: ['*source-jira-url*ABC*'],
  });
  chrome.contextMenus.create({
    id: 'atc-x-target',
    title: 'Sync with Source Jira',
    contexts: ['page'],
    documentUrlPatterns: ['*target-jira-url*ABC*'],
  });
});

// Add an event listener for when the context menu item is clicked
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const issueKey = firstMatch(tab.url, /ABC-\d+/g);
    if (issueKey) {
      const result = info.menuItemId === 'atc-x'
        ? await importOrUpdateBySourceIssueKeys([issueKey])
        : await updateByTargetIssueKeys([issueKey]);
      const importedIssues = result.targetIssues;
      if (importedIssues.length) {
        notifySuccess('Successfuly synced: ' + importedIssues.map((issue) => issue.key));
      } else {
        notifySuccess('Issue is already up to date');
      }
    }
  } catch (err) {
    console.error(err);
    notifyError(String(err));
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(request);
  const logAndSendResponse = (response) => {
    console.log(response);
    sendResponse(response);
  }
  switch(request.function) {
  case 'updateBySourceIssueKeys':
    importOrUpdateBySourceIssueKeys(request.issueKeys).then(logAndSendResponse);
    break;
  case 'searchTargetIssues':
    if (!request.targetIssueKeys?.length) {
      sendResponse([]);
      break;
    }
    searchTargetIssues(request.targetIssueKeys).then(logAndSendResponse);
    break;
  case 'searchSourceIssues':
    if (!request.sourceIssueKeys?.length) {
      sendResponse([]);
      break;
    }
    searchSourceIssues(request.sourceIssueKeys).then(logAndSendResponse);
    break;
  case 'fetchSourceIssue':
    fetchSourceIssue(request.sourceIssueKey).then(logAndSendResponse);
    break;
  case 'fetchSourceUser':
    fetchSourceUser(request.username).then(logAndSendResponse);
    break;
  case 'fetchImage':
    fetchImage(request.url, request.contentType).then(logAndSendResponse);
    break;
  case 'updateTargetIssue':
    updateTargetIssue(request.targetIssueKey, JSON.parse(request.sourceIssue)).then(logAndSendResponse);
    break;
  case 'searchGitlabBranches':
    searchGitlabBranches(request.regex).then(logAndSendResponse);
    break;
  }
  return true;
});
