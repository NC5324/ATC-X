import { getSourceIssueStatus, getSourceIssues, statusColorMap, injectAtcxRefreshButton, injectAtcLink } from './jira-bridge-utils.js';
import { isNotEmpty, parseHTML } from '../../utils.js';
import { issueCardExtraField } from '../../components/jira/issue-card-extra-field.js';

export const injectAtcDetailsIntoBoardView = async () => {

    // Skip execution if we are not in the board view.
    const rapidViewUrl = 'target-jira-url/secure/RapidBoard.jspa';
    const urlParams = new URLSearchParams(window.location.search);
    const viewMode = urlParams.get('view');
    if (!window.location.href.startsWith(rapidViewUrl) || viewMode === 'planning.nodetail') {
        return;
    }

    // console.group('atc-x: injecting atc data into the board view');

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

    // Define epic field container template 
    // to be used when epics are hidden or missing.
    const epicFieldContainerTemplate = document.createElement('div');
    epicFieldContainerTemplate.style.width = '100%';
    epicFieldContainerTemplate.style.display = 'flex';
    epicFieldContainerTemplate.style.flexWrap = 'wrap';
    epicFieldContainerTemplate.style.alignItems = 'center';
    epicFieldContainerTemplate.style.marginTop = '7px';
    
    // Extract all of the source issue keys 
    // from the visible cards on the board.
    const issueCards = document.querySelectorAll('.ghx-issue');
    const issueLabels = document.querySelectorAll('.ghx-extra-field[data-tooltip*="ABC-"]');
    const sourceIssueKeys = Array.from(issueLabels).map((issueLabel) => issueLabel.textContent.match(/ABC-\d+/g))
        .filter((regexMatches) => isNotEmpty(regexMatches)).map((regexMatches) => regexMatches[0])
        .filter((sourceIssueKey) => isNotEmpty(sourceIssueKey));
    const sourceIssuesMap = await getSourceIssues(sourceIssueKeys);

    // Inject ATC-X refresh button.
    injectAtcxRefreshButton(sourceIssueKeys);

    for (const issueCard of issueCards) {
        // Extract the source issue key from the card's labels.
        const targetIssueKey =  issueCard.dataset.issueKey;
        const issueLabel = issueCard.querySelector('.ghx-extra-field[data-tooltip*="ABC-"]');
        const sourceIssueKey = issueLabel?.textContent?.match(/ABC-\d+/g)[0];
        const sourceIssue = sourceIssuesMap[sourceIssueKey];
        // console.log(targetIssueKey, sourceIssueKey, sourceIssuesMap, sourceIssue);
        if (!sourceIssue) {
            continue;
        }

        // Replace source issue key with a link to atc jira.
        injectAtcLink('atcx-card-link', () => issueCard.querySelector('.ghx-inner'), (atcLink) => {
            issueCard.addEventListener('click', (event) => {
                if (atcLink.contains(event.target)) {
                    event.stopPropagation();
                }
            });
        });

        // Find the epic field on the card 
        // and prepare the container for the atc status tag.
        const epicFieldContainerId = `atcx-card-epic-container-${targetIssueKey}-${sourceIssueKey}`;
        const epicField = issueCard.querySelector('.ghx-highlighted-field');
        let epicFieldContainer = epicField?.parentNode;
        if (!epicFieldContainer) {
            // Find or create manually injected container.
            epicFieldContainer = document.getElementById(epicFieldContainerId);
            epicFieldContainer = epicFieldContainer ?? epicFieldContainerTemplate.cloneNode(true);
            epicFieldContainer.id = epicFieldContainerId;
            const issueFields = issueCard.querySelector('.ghx-issue-fields');
            issueFields.parentNode.insertBefore(epicFieldContainer, issueFields.nextSibling);
        } else {
            // Adjust the styling of the default container.
            epicFieldContainer.style.display = 'flex';
            epicFieldContainer.style.flexWrap = 'wrap';
            epicFieldContainer.style.alignItems = 'center';
            epicFieldContainer.style.marginTop = '10px';
            epicFieldContainer.style.paddingRight = '0px';
            epicField.style.marginTop = '5px';
        }

        // Inject or update the atc status tag.
        const atcStatusElementId = `atcx-card-status-${targetIssueKey}-${sourceIssueKey}`;
        const atcStatus = getSourceIssueStatus(sourceIssue);
        const atcStatusColor = statusColorMap[atcStatus.toUpperCase()] ?? statusColorMap['DEFAULT'];
        const atcStatusField = document.getElementById(atcStatusElementId) ?? epicFieldTemplate.cloneNode(true);
        const atcStatusLabel = atcStatusField.querySelector('.aui-label');
        atcStatusField.id = atcStatusElementId;
        if (atcStatusLabel.textContent !== `ATC ${atcStatus}`) {
            atcStatusLabel.textContent = `ATC ${atcStatus}`;
            atcStatusLabel.style.backgroundColor = atcStatusColor;
            atcStatusLabel.style.borderColor = atcStatusColor;
            atcStatusLabel.style.marginTop = '5px';
            epicFieldContainer.appendChild(atcStatusField);
        }

        // Inject ATC fix versions
        const atcFixVersionsElementId = `atcx-card-fixfor-${targetIssueKey}-${sourceIssueKey}`;
        const atcFixVersionNamesOld = document.getElementById(atcFixVersionsElementId)?.querySelector('.ghx-extra-field-content')?.textContent?.trim();
        const atcFixVersionNames = sourceIssue?.fields?.fixVersions?.map((fixVersionData) => `ATC ${fixVersionData.name}`);
        if (atcFixVersionNames?.length) {
            if (atcFixVersionNamesOld !== atcFixVersionNames.join(', ')) {
                const atcFixVersionsLabel = atcFixVersionNames.map((fixVersionName) => `<a href="source-jira-url/issues/?jql=project+%3D+ABC+AND+fixVersion+%3D+${fixVersionName.replace(/^ATC /, '')}" target="_blank">${fixVersionName}</a>`).join(', ');
                const atcFixVersions = document.getElementById(atcFixVersionsElementId) ?? parseHTML(issueCardExtraField(atcFixVersionsLabel));
                atcFixVersions.id = atcFixVersionsElementId;
                atcFixVersions.querySelector('.ghx-extra-field-content').innerHTML = atcFixVersionsLabel;
                if (!document.getElementById(atcFixVersionsElementId)) {
                    issueCard.querySelector('.ghx-extra-fields')?.appendChild(atcFixVersions);
                    issueCard.addEventListener('click', (event) => {
                        if (atcFixVersions.contains(event.target)) {
                            event.stopPropagation();
                        }
                    });
                }
            }
        } else {
            document.getElementById(atcFixVersionsElementId)?.remove();
        }
    }
};