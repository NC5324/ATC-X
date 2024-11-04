const url = (apiBaseUrl, apiUrl) => `${apiBaseUrl}/${apiUrl}`;

const headers = (auth) => ({ Authorization: `Basic ${auth}`, 'X-Atlassian-Token': 'no-check' });

export const httpClient = (apiBaseUrl, auth) => ({
  get: (apiUrl, responseType) =>
    fetch(url(apiBaseUrl, apiUrl), { headers: headers(auth) }).then((response) => (responseType === 'blob' ? response.blob() : response.json())),
  put: (apiUrl, body) =>
    fetch(url(apiBaseUrl, apiUrl), { method: 'PUT', headers: { ...headers(auth), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  post: (apiUrl, body) =>
    fetch(url(apiBaseUrl, apiUrl), {
      method: 'POST',
      headers: { ...headers(auth), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((response) => response.json()),
  postFormData: (apiUrl, body) => fetch(url(apiBaseUrl, apiUrl), { method: 'POST', headers: headers(auth), body }),
});