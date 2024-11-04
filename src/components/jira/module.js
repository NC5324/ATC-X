export const moduleTemplate = (id, header, body) => `
    <div id="${id}" class="module toggle-wrap ghx-detail-section">
        <div id="${id}_heading" class="mod-header">
            <ul class="ops"></ul>
            <a href="#" class="aui-button toggle-title" resolved="">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                    <g fill="none" fill-rule="evenodd">
                        <path
                            d="M3.29175 4.793c-.389.392-.389 1.027 0 1.419l2.939 2.965c.218.215.5.322.779.322s.556-.107.769-.322l2.93-2.955c.388-.392.388-1.027 0-1.419-.389-.392-1.018-.392-1.406 0l-2.298 2.317-2.307-2.327c-.194-.195-.449-.293-.703-.293-.255 0-.51.098-.703.293z"
                            fill="#344563">
                        </path>
                    </g>
                </svg>
            </a>
            <h4 class="toggle-title">
                ${header}
            </h4>
        </div>
        <div class="mod-content">
            <!-- <div class="tabwrap aui-tabs horizontal-tabs aui-tabs-disabled">
                <ul id="issue-tabs" class="tabs-menu"></ul>
                <div class="sortwrap">
                    <a class="issue-activity-sort-link ajax-activity-content" rel="nofollow" data-tab-sort=""
                        data-order="desc" href="#" onclick="() => sort"
                        title="Ascending order - Click to sort in descending order">
                        <span class="aui-icon aui-icon-small aui-iconfont-up">Ascending order - Click to sort in descending
                            order</span>
                    </a>
                </div>
                <div class="tabs-pane active-pane"></div>
            </div> -->
            <div class="issuePanelWrapper">
                <div class="issuePanelProgress"></div>
                <div class="issuePanelContainer" id="issue_actions_container">
                    <!-- <div class="message-container">
                        <a class="collapsed-comments" href="#"><span
                                class="collapsed-comments-line"></span><span class="collapsed-comments-line"></span><span
                                class="show-more-comments" data-collapsed-count="13">13 older comments</span></a>
                    </div> -->
                    ${body}
                </div>
            </div>
        </div>
    </div>
`;
