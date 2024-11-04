export const config = {
  'source.jira.url': 'source-jira-url',
  'source.jira.project.key': 'ABC',
  'source.jira.username': '',
  'source.jira.password': '',
  'source.jira.access.token': '', // alternative to username/password auth (optional)
  'source.jira.update.summary.with.target.key.enabled': false, // add the target ticket key in front of atc ticket summary (optional)
  'source.jira.acceptance.criteria.field': 'customfield_11100',
  'source.jira.epic.field': 'customfield_10001',
  'target.jira.url': 'target-jira-url',
  'target.jira.project.key': 'ABC',
  'target.jira.source.ticket.field': 'customfield_10840',
  'target.jira.username': '',
  'target.jira.password': '',
  'target.jira.reporter': '', // set someone else as reporter, otherwise use own username
  'target.jira.update.async.on.view.enabled': false, // update issue in the background when viewing an issue, (optional, caution: potentially causing duplicated tickets),
  'target.gitlab.url': '',
  'target.gitlab.access.token': '',
  'target.gitlab.project.id': '',
};
