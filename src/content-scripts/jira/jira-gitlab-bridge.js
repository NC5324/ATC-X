import { config } from "../../../config.js";
import { sendAsyncMessage, formatRelativeDate, parseHTML } from "../../utils.js";

export const injectGitlabBranches = async (sourceIssue, targetIssueKey) => {
    const sourceIssueKey = sourceIssue.key;
    const sourceEpicKey = sourceIssue.fields[config['source.jira.epic.field']];
    const itoDevelopSourceEpicKeys = config['target.gitlab.module.branch.source.jira.epics']['ito_develop'];
    const regex = `(${sourceIssueKey}|${targetIssueKey})${itoDevelopSourceEpicKeys.includes(sourceEpicKey) ? '|^ito_develop$' : ''}`;
    const branches = await sendAsyncMessage({
        function: 'searchGitlabBranches',
        regex,
    });
    const devStatusPanel = document.getElementById('viewissue-devstatus-panel') ?? document.getElementById('ghx-tab-com-atlassian-jira-plugins-jira-development-integration-plugin-greenhopper-devstatus-panel');
    const devStatusPanelContent = devStatusPanel.querySelector('.mod-content');
    if (document.getElementById('atc-x-dev-status')) {
        return;
    }
    devStatusPanelContent.innerHTML = '';
    devStatusPanelContent.appendChild(parseHTML(`
        <table id="atc-x-dev-status">
            <style>
                table#atc-x-dev-status {
                    border-collapse: collapse;
                    table-layout: fixed;
                    width: 100%;
                    td:nth-child(2), th:nth-child(2) {
                        width: 45%;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                    }
                    td:nth-child(1), th:nth-child(1) {
                        width: 20%;
                    }
                    th {
                        font-weight: 500;
                    }
                    th, td {
                        text-align: left;
                        vertical-align: text-top;
                        color: #172b4d;
                    }
                }
            </style>
            <tr>
                <th>Branch</th>
                <th>Latest commit</th>
                <th>Date</th>
            </tr>
            ${branches.map((branch) => `
                <tr>
                    <td><a href="${branch.web_url}" title="${branch.name}" target="_blank">${branch.name}</a></td>
                    <td title="${branch.commit.title}">${branch.commit.title}</td>
                    <td>${formatRelativeDate(new Date(branch.commit.committed_date))}</td>
                </tr>
            `)}
        </table>
    `));
}
