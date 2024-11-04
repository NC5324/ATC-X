const toasts = {
};

const showToast = (toast) => {
    toasts[toast.id] = AJS.flag(toast);
}

const clearToast = (toastId) => {
    if (toasts[toastId]) {
        toasts[toastId]?.remove();
        delete toasts[toastId];
    }
}

window.addEventListener('message', (event) => {
    if (event.data.type === 'atcx.toast') {
        const toast = event.data.toast;
        if (!toasts[toast.id]) {
            showToast(toast);
            setTimeout(() => clearToast(toast.id), 3000);
        }
    }
});