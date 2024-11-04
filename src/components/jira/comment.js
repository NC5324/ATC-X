export const commentTemplate = (comment) => `
  <div id="comment-atc${comment.id}" class="issue-data-block activity-comment twixi-block expanded">
    <div class="twixi-wrap verbose actionContainer">
      <div class="action-head">
        <a href="#" title="Collapse comment" class="twixi">
          <span class="icon-default aui-icon aui-icon-small aui-iconfont-expanded">
            <span>Hide</span>
          </span>
        </a>
        <!-- <div class="action-links">
            <a href="/browse/ABC-4568?focusedCommentId=65318&amp;page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-65318"
                title="Right click and copy link for a permanent link to this comment."
                class="activitymodule-link issue-comment-action">
                <span class="icon-default aui-icon aui-icon-small aui-iconfont-link">Permalink</span></a>
            <a id="edit_comment_65318" href="/secure/EditComment!default.jspa?id=36761&amp;commentId=65318"
                title="Edit" class="edit-comment issue-comment-action">
                <span class="icon-default aui-icon aui-icon-small aui-iconfont-edit">Edit</span></a>
            <a id="delete_comment_65318" href="/secure/DeleteComment!default.jspa?id=36761&amp;commentId=65318"
                title="Delete" class="delete-comment issue-comment-action">
                <span class="icon-default aui-icon aui-icon-small aui-iconfont-delete">Delete</span></a>
        </div> -->
        <div class="action-details">
          <a
            class="user-hover user-avatar"
            rel="${comment.author.emailAddress}"
            id="commentauthor_atc${comment.id}_verbose"
            href="source-jira-url/secure/ViewProfile.jspa?name=${comment.author.name}">
            <span class="aui-avatar aui-avatar-xsmall">
              <span class="aui-avatar-inner">
                <img src="${chrome.runtime.getURL('assets/useravatar.svg')}" alt="${comment.author.emailAddress}" />
              </span>
            </span>
            ${comment.author.displayName}
          </a>
          added a comment -
          <span class="commentdate_atc${comment.id}_verbose subText">
            <span class="date user-tz" title="${comment.dateLabel}">
              <time class="livestamp" datetime="${comment.created}">
                ${comment.relativeDateLabel}
              </time>
            </span>
          </span>
        </div>
      </div>
      <div class="action-body flooded">${comment.body}</div>
    </div>
    <div class="twixi-wrap concise actionContainer">
      <div class="action-head">
        <a href="#" title="Expand comment" class="twixi">
          <span class="icon-default aui-icon aui-icon-small aui-iconfont-collapsed">
            <span>Show</span>
          </span>
        </a>
        <div class="action-details flooded">
          <a
            class="user-hover user-avatar"
            rel="${comment.author.emailAddress}"
            id="commentauthor_atc${comment.id}_concise"
            href="source-jira-url/secure/ViewProfile.jspa?name=${comment.author.name}">
            <span class="aui-avatar aui-avatar-xsmall">
              <span class="aui-avatar-inner">
                <img src="${chrome.runtime.getURL('assets/useravatar.svg')}" alt="${comment.author.emailAddress}" />
              </span>
            </span>
            ${comment.author.displayName}
          </a>
          added a comment -
          <span class="commentdate_atc${comment.id}_concise subText">
            <span class="date user-tz" title="${comment.dateLabel}">
              <time class="livestamp" datetime="${comment.created}">
                ${comment.relativeDateLabel}
              </time>
            </span>
          </span>
          ${comment.body}
        </div>
      </div>
    </div>
  </div>
`;
