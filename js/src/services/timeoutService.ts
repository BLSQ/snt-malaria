type TimeoutId = ReturnType<typeof setTimeout>;

export type TimeoutService = {
    schedule: (callback: () => void, delayMs: number) => TimeoutId;
    debounce: (key: string, callback: () => void, delayMs: number) => void;
    clearKey: (key: string) => void;
    clearAll: () => void;
};

export const createTimeoutService = (): TimeoutService => {
    const keyedTimeouts = new Map<string, TimeoutId>();
    const allTimeouts = new Set<TimeoutId>();

    const removeTimeout = (timeoutId: TimeoutId) => {
        allTimeouts.delete(timeoutId);
    };

    const schedule = (callback: () => void, delayMs: number) => {
        const timeoutId = setTimeout(() => {
            removeTimeout(timeoutId);
            callback();
        }, delayMs);
        allTimeouts.add(timeoutId);
        return timeoutId;
    };

    const clearKey = (key: string) => {
        const existing = keyedTimeouts.get(key);
        if (!existing) {
            return;
        }
        clearTimeout(existing);
        keyedTimeouts.delete(key);
        removeTimeout(existing);
    };

    const debounce = (key: string, callback: () => void, delayMs: number) => {
        clearKey(key);
        const timeoutId = schedule(() => {
            keyedTimeouts.delete(key);
            callback();
        }, delayMs);
        keyedTimeouts.set(key, timeoutId);
    };

    const clearAll = () => {
        allTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        allTimeouts.clear();
        keyedTimeouts.clear();
    };

    return {
        schedule,
        debounce,
        clearKey,
        clearAll,
    };
};
