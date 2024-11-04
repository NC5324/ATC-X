import { getSourceIssueStatus, getSourceIssues, statusColorMap, injectAtcxRefreshButton } from './jira-bridge-utils.js';
import { firstMatch, isNotEmpty } from '../../utils.js';

export const injectAtcDetailsIntoBacklogView = async () => {

    // Skip execution if we are not in the backlog view.
    const rapidViewUrl = 'target-jira-url/secure/RapidBoard.jspa';
    const urlParams = new URLSearchParams(window.location.search);
    const viewMode = urlParams.get('view');
    if (!window.location.href.startsWith(rapidViewUrl) || viewMode !== 'planning.nodetail') {
        return;
    }

    // console.log('atc-x: injecting atc data into the backlog view');

    // Define tag element to be used as template for the atc status tag.
    const epicFieldTemplate = document.createElement('div');
    epicFieldTemplate.classList.add('ghx-highlighted-field');
    const epicFieldTemplateLabel = document.createElement('span');
    epicFieldTemplateLabel.classList.add('aui-label');
    epicFieldTemplateLabel.style.display = 'flex';
    epicFieldTemplateLabel.style.alignItems = 'center';
    epicFieldTemplateLabel.style.justifyContent = 'center';
    epicFieldTemplateLabel.style.width = 'max-content';
    epicFieldTemplateLabel.style.color = 'white';
    epicFieldTemplate.appendChild(epicFieldTemplateLabel);

    // Extract all of the source issue keys 
    // from the visible rows in the backlog.
    const issueRows = document.querySelectorAll('.ghx-row');
    const issueSummaries = document.querySelectorAll('.ghx-summary > .ghx-inner');
    const sourceIssueKeys = Array.from(issueSummaries).map((issueSummary) => issueSummary.textContent.match(/ABC-\d+/g))
        .filter((regexMatches) => isNotEmpty(regexMatches)).map((regexMatches) => regexMatches[0])
        .filter((sourceIssueKey) => isNotEmpty(sourceIssueKey));
    const sourceIssuesMap = await getSourceIssues(sourceIssueKeys);

    // Inject ATC-X refresh button.
    injectAtcxRefreshButton(sourceIssueKeys);

    for (const issueRow of issueRows) {

        // Extract the source issue key from the card's labels.
        const targetIssueKey =  issueRow.querySelector('.js-key-link')?.title;
        const issueSummary = issueRow.querySelector('.ghx-summary');
        const sourceIssueKey = firstMatch(issueSummary?.querySelector('.ghx-inner')?.textContent, /ABC-\d+/g);
        const sourceIssue = sourceIssuesMap[sourceIssueKey];
        if (!sourceIssue) {
            continue;
        }

        // Inject or update the atc status tag.
        const elementId = `atcx-backlog-status-${targetIssueKey}-${sourceIssueKey}`;
        const atcStatus = getSourceIssueStatus(sourceIssue);
        const atcStatusColor = statusColorMap[atcStatus.toUpperCase()] ?? statusColorMap['DEFAULT'];
        const atcStatusField = document.getElementById(elementId) ?? epicFieldTemplate.cloneNode(true);
        const atcStatusLabel = atcStatusField.querySelector('.aui-label');
        atcStatusField.id = elementId;
        atcStatusLabel.textContent = `ATC ${atcStatus}`;
        atcStatusLabel.style.backgroundColor = atcStatusColor;
        atcStatusLabel.style.borderColor = atcStatusColor;
        const anchorElement = issueRow.querySelector('span[data-epickey*="ABC-"]') ?? issueRow.querySelector('.ghx-end');
        issueRow.insertBefore(atcStatusField, anchorElement);
    }

};