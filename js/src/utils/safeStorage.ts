export const safeRead = (key: string): string | null => {
    try {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
};

export const safeWrite = (key: string, value: string): void => {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // ignore unavailable storage; in-memory state still drives the session
    }
};
