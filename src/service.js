import { config } from '../config.js';

// Config properties
const sourceJiraUrl = config['source.jira.url'];
const sourceJiraProjectKey = config['source.jira.project.key'];
const sourceJiraHttpBasicAuth = `Basic ${btoa(`${config['source.jira.username']}:${config['source.jira.password']}`)}`;
const sourceJiraHttpAccessTokenAuth = `Bearer ${config['source.jira.access.token']}`;
const sourceJiraUpdateSummaryWithTargetKeyIsEnabled = config['source.jira.update.summary.with.target.key.enabled'];
const sourceJiraAcceptanceCriteriaField = config['source.jira.acceptance.criteria.field'];

const targetJiraUrl = config['target.jira.url'];
const targetJiraProjectKey = config['target.jira.project.key'];
const targetJiraHttpBasicAuth = `Basic ${btoa(`${config['target.jira.username']}:${config['target.jira.password']}`)}`;
const targetJiraSourceTicketField = config['target.jira.source.ticket.field'];

const targetGitlabUrl = config['target.gitlab.url'];
const targetGitlabAccessToken = config['target.gitlab.access.token'];
const targetGitlabProjectId = config['target.gitlab.project.id'];

// Http/Jira clients
const url = (url, apiUrl) => `${url}/${apiUrl}`;
const headers = (auth) => ({ Authorization: auth, 'X-Atlassian-Token': 'no-check' });
const http = (jiraUrl, auth) => ({
  get: (apiUrl, responseType) =>
    fetch(url(jiraUrl, apiUrl), { headers: headers(auth) }).then(async (response) => {
      if (responseType === 'blob') {
        return response.blob();
      }
      if (responseType === 'image/png') {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      return response.json();
    }),
  put: (apiUrl, body) =>
    fetch(url(jiraUrl, apiUrl), { method: 'PUT', headers: { ...headers(auth), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  post: (apiUrl, body) =>
    fetch(url(jiraUrl, apiUrl), {
      method: 'POST',
      headers: { ...headers(auth), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((response) => response.json()),
  postFormData: (apiUrl, body) => fetch(url(jiraUrl, apiUrl), { method: 'POST', headers: headers(auth), body }),
  // search: (jql) => fetch(url(jiraUrl, `rest/api/latest/search?jql=${jql}&expand=comment,attachment`), { headers: headers(auth) })
  //     .then((response) => response.json())
  //     .then((result) => result.issues),
  search: async (jql) => {
    let result = [];
    let response;
    let startAt = 0;
    do {
      response = await fetch(url(jiraUrl, `rest/api/latest/search?jql=${jql}&startAt=${startAt}`), { headers: headers(auth) }).then((response) => response.json());
      result.push(...response.issues);
      startAt = result.length;
    } while (response.total > result.length);
    return result;
  },
});
const targetJira = http(targetJiraUrl, targetJiraHttpBasicAuth);
const sourceJira = http(sourceJiraUrl, config['source.jira.access.token'] ? sourceJiraHttpAccessTokenAuth : sourceJiraHttpBasicAuth);

const targetGitlab = http(targetGitlabUrl, `Bearer ${targetGitlabAccessToken}`);

// Helper functions
const convertIssueType = (sourceIssueType) => {
  const issueTypeIds = {
    Bug: 1,
    Defect: 1,
    Task: 3,
    Aufgabe: 3,
    Story: 6,
  };
  return {
    id: issueTypeIds[sourceIssueType.name],
  };
};

const differenceBy = (arr1, arr2, iteratee) => {
  if (typeof iteratee === 'string') {
    const prop = iteratee;
    iteratee = (item) => item[prop];
  }
  return arr1.filter((c) => !arr2.map(iteratee).includes(iteratee(c)));
};

const atcxDescriptionWithSourceTicketUrl = (description, sourceTicketUrl) => sourceTicketUrl ? `
  Source JIRA Ticket: ${sourceTicketUrl}
  ----
  ${description}
` : description;

const atcxDescription = (description, acceptanceCriterias) => acceptanceCriterias?.length ? `
  ||Acceptance Criteria||Checked in ATC||
  ${acceptanceCriterias.map((acceptanceCriteria) => `|${acceptanceCriteria.name}|${acceptanceCriteria.checked}|`).join('\n')}
  ----
  ${description}
` : description;

const autoImportedCommentBody = (comment) => `
  === atc-x ===
  [Author]: ${comment.updateAuthor.displayName}
  [Created]: ${comment.created}
  === atc-x ===
  ${comment.body}
`;

const extractActualCommentBody = (comment) => {
  const match = comment.body.split('=== atc-x ===');
  if (match?.length > 1) {
    return match[2].trim();
  } else {
    return comment.body.trim();
  }
};

// API functions
export const fetchSourceIssues = (issueKeys) => Promise.all(issueKeys.filter((key) => key.startsWith(sourceJiraProjectKey)).map((key) => fetchSourceIssue(key)));
export const fetchSourceIssue = (key) => sourceJira.get(`rest/api/latest/issue/${key}`);
export const fetchTargetIssues = (issueKeys) =>
  Promise.all(issueKeys.filter((key) => key.startsWith(targetJiraProjectKey)).map((key) => targetJira.get(`rest/api/latest/issue/${key}`)));
export const fetchTargetIssuesBySourceIssueKeys = (issueKeys) =>
  targetJira
    .search(`project = ${targetJiraProjectKey} AND labels in (${issueKeys.join()})`)
    .then((issues) => Promise.all(issues.map((issue) => targetJira.get(`rest/api/latest/issue/${issue.key}`))));
export const searchSourceIssues = (issueKeys) => sourceJira.search(`project = ${sourceJiraProjectKey} AND key in (${issueKeys.join()})`);
export const searchTargetIssues = (issueKeys) => targetJira.search(`project = ${targetJiraProjectKey} AND key in (${issueKeys.join()})`);
export const fetchSourceUser = (username) => sourceJira.get(`rest/api/latest/user?username=${username}`);
export const fetchImage = (url, contentType) => sourceJira.get(url.replace('source-jira-url/', ''), contentType);
export const searchGitlabBranches = (regex) => targetGitlab.get(`api/v4/projects/${targetGitlabProjectId}/repository/branches?regex=${regex}`);

const createTargetIssue = (issue) => targetJira.post('rest/api/latest/issue', issue).then((savedIssue) => ({ ...issue, ...savedIssue }));

const updateAndFetchTargetIssue = (issue) =>
  targetJira
    .put(`rest/api/latest/issue/${issue.key}`, { update: {}, fields: { ...issue.fields, project: undefined } })
    .then(() => targetJira.get(`rest/api/latest/issue/${issue.key}`))
    .then((savedIssue) => ({ ...issue, ...savedIssue }))
    .catch((error) => {
      console.error('Error:', error);
      throw new Error(error);
    });

const saveTargetIssues = async (issues) => {
  console.group();
  console.log('Issues to save: ', issues);
  const newIssues = issues.filter((issue) => !issue.key);
  const editedIssues = issues.filter((issue) => !!issue.key);
  console.log('New issues: ', newIssues);
  console.log('Edited issues: ', editedIssues);
  const createdIssues = newIssues.length ? await Promise.all(newIssues.map(createTargetIssue)) : [];
  const updatedIssues = editedIssues.length ? await Promise.all(editedIssues.map(updateAndFetchTargetIssue)) : [];
  const savedIssues = [...createdIssues, ...updatedIssues];
  console.log('Saved issues: ', savedIssues);
  if (sourceJiraUpdateSummaryWithTargetKeyIsEnabled) {
    for (const createdIssue of createdIssues) {
      if (createdIssue.sourceIssueKey && !createdIssue.sourceIssueSummary.startsWith('ABC')) {
        const updatedSourceIssue = await sourceJira.put(`rest/api/latest/issue/${sourceIssueKey}`, {
          fields: { summary: createdIssue.key + ' - ' + createdIssue.sourceIssueSummary },
          update: {},
        });
        console.log(`Added Target issue key (${createdIssue.key}) in front of the Source ticket's (${updatedSourceIssue.key}) title`);
      }
    }
  }
  console.groupEnd();
  return savedIssues;
};

// Main logic
const syncTargetIssues = async (issueKeys, sourceIssues, additionalParams) => {
  const targetIssues = additionalParams?.cbgIssues || await fetchTargetIssuesBySourceIssueKeys(issueKeys);
  const result = [];
  sourceIssues.forEach((sourceIssue) => {
    const existingIssues = targetIssues.filter((issue) => issue.fields.labels.some((label) => label === sourceIssue.key));
    if (existingIssues.length) {
      existingIssues.forEach((existingIssue) => {
        const newAttachments = differenceBy(sourceIssue.fields.attachment, existingIssue.fields.attachment, 'filename');
        const newComments = differenceBy(sourceIssue.fields.comment.comments, existingIssue.fields.comment.comments, (comment) =>
          extractActualCommentBody(comment)
        );
        result.push({
          key: existingIssue.key,
          fields: {
            project: {
              key: existingIssue.fields.key,
            },
            summary: existingIssue.fields.summary,
            description: atcxDescriptionWithSourceTicketUrl(
              atcxDescription(sourceIssue.fields.description, sourceIssue.fields[sourceJiraAcceptanceCriteriaField]),
              `${sourceJiraUrl}/browse/${sourceIssue.key}`
            ),
            labels: existingIssue.fields.labels,
            issuetype: existingIssue.fields.issuetype,
            [targetJiraSourceTicketField]: !['Bug', 'Defect'].includes(sourceIssue.fields.issuetype.name)
              ? `${sourceJiraUrl}/browse/${sourceIssue.key}`
              : undefined,
          },
          attachments: newAttachments,
          comments: newComments,
        });
      });
    } else {
      result.push({
        fields: {
          project: {
            key: targetJiraProjectKey,
          },
          summary: `${sourceIssue.key} - ${sourceIssue.fields.summary}`,
          description: atcxDescriptionWithSourceTicketUrl(
            atcxDescription(sourceIssue.fields.description, sourceIssue.fields[sourceJiraAcceptanceCriteriaField]),
            `${sourceJiraUrl}/browse/${sourceIssue.key}`
          ),
          labels: [sourceIssue.key],
          issuetype: convertIssueType(sourceIssue.fields.issuetype),
          [targetJiraSourceTicketField]: !['Bug', 'Defect'].includes(sourceIssue.fields.issuetype.name)
            ? `${sourceJiraUrl}/browse/${sourceIssue.key}`
            : undefined,
          reporter: additionalParams?.reporter,
        },
        attachments: sourceIssue.fields.attachment,
        comments: sourceIssue.fields.comment.comments,
        sourceIssueKey: sourceIssue.key,
        sourceIssueSummary: sourceIssue.summary,
      });
    }
  });
  return result;
};

const addComments = async (issues) => {
  for (const issue of issues) {
    for (const comment of issue.comments) {
      await targetJira.post(`rest/api/latest/issue/${issue.key}/comment`, { body: autoImportedCommentBody(comment) });
    }
  }
};

const addAttachments = async (issues) => {
  for (const issue of issues) {
    for (const attachment of issue.attachments) {
      const file = await sourceJira.get(`secure/attachment/${attachment.id}/${attachment.filename}`, 'blob');
      const formData = new FormData();
      formData.append('file', file, attachment.filename);
      await targetJira.postFormData(`rest/api/latest/issue/${issue.key}/attachments`, formData).catch((err) => console.error(err));
    }
  }
};

export const importOrUpdateBySourceIssueKeys = async (issueKeys) => {
  const sourceIssues = await fetchSourceIssues(issueKeys);
  const reporter = await targetJira.get(`rest/api/2/user?username=${config['target.jira.reporter']}`);
  const syncedIssues = await syncTargetIssues(issueKeys, sourceIssues, { reporter });
  const savedIssues = await saveTargetIssues(syncedIssues);
  await addAttachments(savedIssues);
  await addComments(savedIssues);
  return {
    targetIssues: savedIssues,
    sourceIssues,
  };
};

export const updateTargetIssue = async (targetIssueKey, sourceIssue) => {
  const sourceIssues = [sourceIssue];
  const targetIssues = await fetchTargetIssues([targetIssueKey]);
  if (!targetIssues?.length) {
    return {
      targetIssues: [],
      sourceIssues,
    };
  }
  const syncedIssues = await syncTargetIssues([sourceIssue.key], sourceIssues, { cbgIssues: targetIssues });
  const savedIssues = await saveTargetIssues(syncedIssues);
  await addAttachments(savedIssues);
  await addComments(savedIssues);
  return {
    targetIssues: savedIssues,
    sourceIssues,
  };
};

export const updateByTargetIssueKeys = async (targetIssueKeys) => {
  const targetIssues = await fetchTargetIssues(targetIssueKeys);
  if (!targetIssues?.length) {
    return {
      targetIssues: [],
      sourceIssues: [],
    };
  }
  const sourceIssueKeys = targetIssues.reduce((res, issue) => res.concat(issue.fields.labels.filter((label) => label.startsWith('ABC'))), []);
  const sourceIssues = await fetchSourceIssues(sourceIssueKeys);
  const syncedIssues = await syncTargetIssues(sourceIssueKeys, sourceIssues, { cbgIssues: targetIssues });
  const savedIssues = await saveTargetIssues(syncedIssues);
  await addAttachments(savedIssues);
  await addComments(savedIssues);
  return {
    targetIssues: savedIssues,
    sourceIssues,
  };
}
