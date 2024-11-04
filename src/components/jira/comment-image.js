export const commentImageTemplate = (attachment) => `
    <p>
        <span class="image-wrap" style="">
            <a id="atc-${attachment.id}_thumb" href="${attachment.content}" title="${attachment.filename}"
                file-preview-type="image" file-preview-id="atc-${attachment.id}" file-preview-title="${attachment.filename}" resolved="">
                <img src="${attachment.thumbnail}"
                    style="border: 0px solid black">
            </a>
        </span>
    </p>
`;
