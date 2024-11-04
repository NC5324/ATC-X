export const sendAsyncMessage = (message) => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError));
        } else {
            resolve(response);
        }
    });
});

export const repeatAsync = (asyncFunction, delay) => {
    let isRunning = true;
    let controller = {
        onStart: noop,
        onStop: noop,
        onResolve: noop,
        onError: noop,
        start: undefined,
        stop: undefined,
    };
    const repeat = async () => {
        while (isRunning) {
            try {
                // Await the promise function to finish
                const result = await asyncFunction();
                controller.onResolve(result);
            } catch (error) {
                controller.onError(error);
            }
            // Wait for the specified delay before repeating
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    repeat();
    controller.stop = () => {
        isRunning = false;
        controller.onStop();
    };
    controller.start = () => {
        if (!isRunning) {
            isRunning = true;
            repeat();
        }
        controller.onStart();
    };
    return controller;
};

export const keyBy = (array, key) => array.reduce((dict, curr) => ({
    ...dict,
    [curr[key]]: curr,
}), {}
);

export const sortBy = (array, compareFn, order = 'asc') => array.sort((a, b) => (order === 'asc' || -1) * (compareFn(a) - compareFn(b)));

export const isEmpty = (value) => typeof value === 'undefined' || value === undefined || value === null;

export const isNotEmpty = (value) => !isEmpty(value);

export const noop = () => { };

export const runIf = (value, callback) => !!value ? callback(value) : noop;

export const formatRelativeDate = (date) => {
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else {
            return `${diffDays} days ago`;
        }
    }
    return formatDate(date);
}

export const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export const parseHTML = (html) => {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstElementChild;
}

export const firstMatch = (value, regex) => (value?.match(regex) ?? [])[0];

export const notifySuccess = (message) => notify('Success', message);

export const notifyError = (message) => notify('Error', message);

export const notify = (title, message) => chrome.notifications.create({
    type: 'basic',
    iconUrl: '/assets/icon.png',
    title,
    message,
    priority: 1,
});
