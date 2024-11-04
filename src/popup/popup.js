import { LitElement, html, css } from '../../lib/lit-all.min.js';
import { importOrUpdateBySourceIssueKeys } from '../service.js';

class ATCXPopupElement extends LitElement {
  static styles = css`
    div.container {
      width: 200px;
      display: flex;
      flex-direction: column;
      padding: 0 10px 10px 10px;
      margin: 0;
    }

    div.button-container {
      display: flex;
      margin-top: 2px;
    }

    div.header-container {
      width: 100%;
      display: flex;
      align-items: center;
      margin-top: 0;
      margin-bottom: 4px;
    }

    #header {
      margin: 0;
      margin-right: auto;
    }

    #settings-button {
      cursor: pointer;
      margin: 0;
      margin-left: auto;
    }

    #settings-button:hover {
      color: darkslategrey;
    }

    input {
      height: 16px;
      outline: none !important;
      text-transform: uppercase;
    }
  `;

  static properties = {
    input: { type: String, state: true },
  };

  render() {
    return html`
      <div class="container">
        <div class="header-container">
          <h1 id="header">atc-x</h1>
          <h2 id="settings-button" @click=${this.openSettings}>⚙</h2>
        </div>
        <label for="keys">ATC Issue keys (comma-separated): </label>
        <input autofocus id="keys" type="text" .value=${this.input || ''} @input=${this.onInput} />
        <div class="button-container">
          <button @click=${this.onSubmit}>Submit</button>
          <button style="margin-left: 2px" @click=${this.onClear}>Clear</button>
        </div>
      </div>
    `;
  }

  openSettings() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  }

  onInput(event) {
    this.input = event.target.value;
  }

  onClear() {
    this.input = '';
  }

  async onSubmit() {
    if (this.input) {
      try {
        const issueKeys = this.input.split(/,\s*/).map((key) => key.toUpperCase());
        const importedIssues = await importOrUpdateBySourceIssueKeys(issueKeys);
        if (importedIssues.length) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '/assets/icon.png',
            title: 'Success',
            message: 'Successfuly synced: ' + importedIssues.map((issue) => issue.key),
            priority: 1,
          });
        } else {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '/assets/icon.png',
            title: 'Success',
            message: 'Issue is already up to date',
            priority: 1,
          });
        }
      } catch (err) {
        console.error(err);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/assets/icon.png',
          title: `Error while processing`,
          message: String(err),
          priority: 1,
        });
      }
    }
  }
}

customElements.define('atc-x-popup', ATCXPopupElement);
