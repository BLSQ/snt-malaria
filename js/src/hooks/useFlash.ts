import { useCallback, useEffect, useRef, useState } from 'react';

const FLASH_MS = 900;

/** A value that resets to undefined shortly after it is set. */
export const useFlash = <T>(): [T | undefined, (value: T) => void] => {
    const [value, setValue] = useState<T>();
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    const flash = useCallback((next: T) => {
        clearTimeout(timeoutRef.current);
        setValue(next);
        timeoutRef.current = setTimeout(() => setValue(undefined), FLASH_MS);
    }, []);

    return [value, flash];
};
