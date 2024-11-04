import { getSourceIssueStatus, getSourceIssues, statusColorMap, injectAtcxRefreshButton, priorityIconUrl, injectAtcLink } from './jira-bridge-utils.js';
import { injectAtcComments } from './jira-comments-bridge.js';
import { firstMatch, runIf } from '../../utils.js';
import { injectGitlabBranches } from './jira-gitlab-bridge.js';

export const injectAtcDetailsIntoDetailedView = async () => {

    const rapidViewUrl = 'target-jira-url/secure/RapidBoard.jspa';
    const detailsRoot = window.location.href.startsWith(rapidViewUrl)
        ? document.getElementById('ghx-detail-issue')
        : document;
    if (!detailsRoot) {
        return;
    }

    // Remove gerrit reviews panel since it's not functional
    const gerritReviewsModule = document.getElementById('gerritreviewsmodule') ?? document.getElementById('ghx-tab-com-meetme-plugins-jira-gerrit-plugin-gerrit-reviews-agile-panel');
    gerritReviewsModule?.remove();

    // Find links to atc jira and make them open in a new tab
    const atcLinks = document.querySelectorAll(`a[href*="source-jira-url"]`);
    atcLinks.forEach((atcLink) => atcLink.target = '_blank');

    // Extract the source issue key from the issue details
    // and load the source issue from the cache.
    const labels = detailsRoot.querySelector('.labels');
    const sourceIssueKey = firstMatch(labels.textContent, /ABC-\d+/g);
    const targetIssueKey = firstMatch(window.location.href, /ABC-\d+/g);
    const sourceIssuesMap = await getSourceIssues([sourceIssueKey]);
    const sourceIssue = sourceIssuesMap[sourceIssueKey];
    if (!sourceIssue) {
        return;
    }

    // console.log('atc-x: injecting atc data into the detailed view');

    // Inject ATC-X refresh button.
    injectAtcxRefreshButton([sourceIssueKey]);

    // Inject ATC data into linked issues.
    injectAtcDetailsIntoLinkedIssues();

    // Inject ATC comments.
    injectAtcComments(sourceIssueKey, targetIssueKey);

    // Inject GitLab branches.
    injectGitlabBranches(sourceIssue, targetIssueKey);

    // Inject ATC status field.
    const sourceIssueStatus = getSourceIssueStatus(sourceIssue);
    const status = document.getElementById('status-val').parentNode.parentNode;
    const atcStatus = document.getElementById('atc-status-val') ?? status.cloneNode(true);
    const atcStatusTag = atcStatus.querySelector('#status-val > span');
    atcStatus.querySelector('strong.name').textContent = 'ATC Status:';
    atcStatus.querySelector('.status-view').style.display = 'none';
    atcStatus.id = 'atc-status-val';
    atcStatusTag.textContent = sourceIssueStatus;
    atcStatusTag.style.backgroundColor = statusColorMap[sourceIssueStatus.toUpperCase()] ?? statusColorMap['DEFAULT'];
    atcStatusTag.style.borderColor = statusColorMap[sourceIssueStatus.toUpperCase()];
    atcStatusTag.removeAttribute('data-tooltip');
    if (!document.getElementById('atc-status-val')) {
        if (status.nextSibling) {
            status.parentNode.insertBefore(atcStatus, status.nextSibling);
        } else {
            status.parentNode.appendChild(atcStatus);
        }
    }

    // Inject ATC fix versions
    const fixVersion = document.getElementById('fixfor-val').parentNode.parentNode;
    const atcFixVersion = document.getElementById('atc-fixfor-val') ?? fixVersion.cloneNode(true);
    const atcFixVersionVal = atcFixVersion.querySelector('span');
    atcFixVersion.querySelector('strong.name').textContent = 'ATC Fix Version/s:'
    atcFixVersion.id = 'atc-fixfor-val';
    atcFixVersionVal.classList.remove('editable-field');
    atcFixVersionVal.classList.remove('inactive');
    atcFixVersionVal.removeAttribute('title');
    if (sourceIssue.fields.fixVersions?.length) {
        const fixVersions = atcFixVersionVal.textContent.trim();
        const newFixVersions = sourceIssue.fields.fixVersions.map((fixVersionData) => `ATC ${fixVersionData.name}`);
        if (fixVersions !== newFixVersions.join(', ')) {
            atcFixVersionVal.innerHTML = newFixVersions.map((fixVersionName) => `<a href="source-jira-url/issues/?jql=project+%3D+ABC+AND+fixVersion+%3D+${fixVersionName.replace(/^ATC /, '')}" target="_blank">${fixVersionName}</a>`).join(', ').trim();
        }
    } else {
        atcFixVersionVal.textContent = ' None ';
    }
    if (!document.getElementById('atc-fixfor-val')) {
        if (fixVersion.nextSibling) {
            fixVersion.parentNode.insertBefore(atcFixVersion, fixVersion.nextSibling);
        } else {
            fixVersion.parentNode.appendChild(atcFixVersion);
        }
    }

    // Inject ATC priority field.
    const atcPriorityName = sourceIssue.fields.priority.name;
    const priority = document.getElementById('priority-val').parentNode.parentNode;
    const atcPriority = document.getElementById('atc-priority-val') ?? priority.cloneNode(true);
    const atcPriorityIcon = atcPriority.querySelector('span > img');
    atcPriority.querySelector('strong.name').textContent = 'ATC Priority:';
    atcPriority.id = 'atc-priority-val';
    atcPriorityIcon.src = priorityIconUrl(sourceIssue.fields.priority.iconUrl);
    atcPriorityIcon.nextSibling.textContent = ` ${atcPriorityName} `;
    if (!document.getElementById('atc-priority-val')) {
        if (priority.nextSibling) {
            priority.parentNode.insertBefore(atcPriority, priority.nextSibling);
        } else {
            priority.parentNode.appendChild(atcPriority);
        }
    }

    // Inject ATC assignee field.
    if (!document.getElementById('atc-peopledetails')) {
        const atcAssigneeDisplayName = sourceIssue.fields.assignee.displayName;
        const assignee = document.getElementById('peopledetails').querySelector('dl');
        const atcAssignee = document.getElementById('atc-peopledetails') ?? assignee.cloneNode(true);
        atcAssignee.innerHTML = assignee.innerHTML;
        atcAssignee.id = 'atc-peopledetails';
        const atcAssigneeLabel = atcAssignee.querySelector('dt');
        atcAssigneeLabel.textContent = 'ATC Assignee:';
        const atcAssigneeImg = atcAssignee.querySelector('.aui-avatar-inner > img');
        atcAssigneeImg.src = sourceIssue.fields.assignee.avatarUrls['24x24'];
        atcAssigneeImg.alt = undefined;
        atcAssigneeImg.parentNode.parentNode.nextSibling.textContent = ` ${atcAssigneeDisplayName} `;
        atcAssigneeImg.parentNode.parentNode.parentNode.classList.remove('user-hover');
        atcAssignee.style.marginTop = '4px';
        assignee.parentNode.appendChild(atcAssignee);
    }
};

const injectAtcDetailsIntoLinkedIssues = () => {
    // Make linked issues module take the whole width for better ui/ux.
    const linkedIssuesModule = document.getElementById('linkingmodule');
    if (!linkedIssuesModule || linkedIssuesModule.classList.contains('atcx-linkedissuesmodule')) {
        return;
    }
    // Make the section take full width for better viewing.
    linkedIssuesModule.style.flex = '1 0 100%';
    // Replace linked issue atc keys with links to atc.
    linkedIssuesModule.querySelectorAll('.link-summary').forEach((summary) => {
        injectAtcLink('atcx-issuelink-link', () => summary);
    });
}
