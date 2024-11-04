import { commentImageTemplate } from '../../components/jira/comment-image.js';
import { commentTemplate } from '../../components/jira/comment.js';
import { moduleTemplate } from '../../components/jira/module.js';
import { formatDate, formatRelativeDate, firstMatch, keyBy, sortBy, parseHTML, sendAsyncMessage } from '../../utils.js';
import { atcxCacheKey, sourceUserUrl, getSourceIssueExpanded, getSourceUsers } from './jira-bridge-utils.js';

export const injectAtcComments = async (sourceIssueKey, targetIssueKey) => {

    // Skip execution if already injected and source issue is expanded.
    // After atc-x cache clear source issue is not expanded and atc comments should be re-injected.
    const elementId = 'atc-comments-module';
    const sourceIssuesMap = JSON.parse(sessionStorage.getItem(atcxCacheKey) ?? '{}');
    const sourceIssueExpanded = sourceIssuesMap[sourceIssueKey]?.fields?.comment || sourceIssuesMap[sourceIssueKey]?.fields?.attachment;
    if (document.getElementById(elementId) && sourceIssueExpanded) {
        return;
    }
    
    console.log('atc-x: injecting atc comments');
    const sourceIssue = await getSourceIssueExpanded(sourceIssueKey, targetIssueKey);
    
    const atcComments = sortBy(sourceIssue.fields.comment.comments, (comment) => new Date(comment.created), 'desc');
    const atcAttachments = keyBy(sourceIssue.fields.attachment, 'filename');
    
    // Create template for the atc comments module.
    let atcCommentsTemplate = moduleTemplate(elementId, 'ATC Comments', atcComments.map((comment) => {
        comment.relativeDateLabel = formatRelativeDate(new Date(comment.created));
        comment.dateLabel = formatDate(new Date(comment.created));
        return commentTemplate(comment);
    }).join('\n'));

    // Replace attachment references with links to atc.
    const imgRefs = atcCommentsTemplate.match(/!.*!/g) ?? [];
    const filenames = atcCommentsTemplate.match(/(?<=\!)[^|!]*(?=[|!])/g) ?? [];
    const base64images = keyBy(await Promise.all(filenames.filter((filename) => atcAttachments[filename]).map((filename) => Promise.all([
        sendAsyncMessage({
            function: 'fetchImage',
            url: atcAttachments[filename].content,
            contentType: atcAttachments[filename].mimeType,
        }),
        sendAsyncMessage({
            function: 'fetchImage',
            url: atcAttachments[filename].thumbnail,
            contentType: atcAttachments[filename].mimeType,
        }),
    ]).then(([content, thumbnail]) => ({ id: atcAttachments[filename].id, filename, content, thumbnail })))), 'filename');
    for (const imgRef of imgRefs) {
        const filename =  firstMatch(imgRef, /(?<=\!)[^|!]*(?=[|!])/g);
        if (filename && base64images[filename]) {
            atcCommentsTemplate = atcCommentsTemplate.replace(imgRef, commentImageTemplate(base64images[filename]));
        } else if (filename) {
            console.log(filename);
        }
    }

    // Replace user references with links to atc.
    const userRefs = atcCommentsTemplate.match(/\[~[A-Za-z0-9]+\]/g) ?? [];
    const usernames = atcCommentsTemplate.match(/(?<=\[~)[A-Za-z0-9]+(?=\])/g) ?? [];
    const atcUsers = keyBy(await getSourceUsers(usernames), 'name');
    for (const userRef of userRefs) {
        const username = firstMatch(userRef, /(?<=\[~)[A-Za-z0-9]+(?=\])/);
        if (username && atcUsers[username]) {
            const user = atcUsers[username];
            atcCommentsTemplate = atcCommentsTemplate.replace(userRef, `<a href="${sourceUserUrl(username)}" target="_blank">${user.displayName}</a>`);
        } else if (username) {
            console.log(username);
        }
    }

    // Replace ticket references with links to atc.
    const referencedSourceIssueKeys = atcCommentsTemplate.match(/ABC-\d+/g) ?? [];
    const referencedSourceIssueKeysReplaced = JSON.parse(sessionStorage.getItem('atc-x-replaced-reference-keys') ?? '{}');
    for (const referencedSourceIssueKey of referencedSourceIssueKeys) {
        const referenceKey = `${sourceIssueKey}-${referencedSourceIssueKey}`;
        if (!referencedSourceIssueKeysReplaced[referenceKey]) {
            atcCommentsTemplate = atcCommentsTemplate.replace(referencedSourceIssueKey, `<a href="source-jira-url/browse/${referencedSourceIssueKey}" target="_blank">${referencedSourceIssueKey}</a>`);
            referencedSourceIssueKeysReplaced[referenceKey] = true;
            sessionStorage.setItem('atc-x-replaced-reference-keys', JSON.stringify(referencedSourceIssueKeysReplaced));
        }
    }

    // Inject the atc comments module before the default comments.
    const anchorElement = document.getElementById('COMMENT') ?? document.getElementById('activitymodule');
    document.getElementById(elementId)?.remove();
    const atcCommentsModule = parseHTML(atcCommentsTemplate);
    atcCommentsModule.style.position = 'relative';
    atcCommentsModule.style.zIndex = 1;
    // Wrap text nodes in pre-wrap wrapper to preserve formatting.
    Array.from(atcCommentsModule.querySelectorAll('.action-body.flooded')).forEach((commentNode) => {
        commentNode.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
                const wrapper = document.createElement('p');
                wrapper.style.whiteSpace = 'pre-wrap';
                wrapper.textContent = node.nodeValue.trim().replace(/[\r\n]+/g, '\r\n');
                node.replaceWith(wrapper);
            }
        });
    })
    anchorElement.parentElement.insertBefore(atcCommentsModule, anchorElement);
};