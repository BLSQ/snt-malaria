import { RefObject, useCallback, useEffect, useRef } from 'react';

type KeepInViewWhileAnimating<T extends HTMLElement> = {
    ref: RefObject<T>;
    onEnter: () => void;
    onEntered: () => void;
    onExit: () => void;
};

/**
 * Keeps the referenced element scrolled into view on every frame of an enter
 * transition, so its scroll containers follow it as it grows.
 * The handlers map onto MUI transition callbacks (e.g. `<Collapse>`).
 */
export const useKeepInViewWhileAnimating = <
    T extends HTMLElement,
>(): KeepInViewWhileAnimating<T> => {
    const ref = useRef<T>(null);
    const frameRef = useRef<number>();

    const scrollIntoView = useCallback(
        () => ref.current?.scrollIntoView({ block: 'nearest' }),
        [],
    );

    const onExit = useCallback(() => {
        if (frameRef.current !== undefined) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = undefined;
        }
    }, []);

    const onEnter = useCallback(() => {
        onExit();
        const scrollIntoViewEachFrame = () => {
            scrollIntoView();
            frameRef.current = requestAnimationFrame(scrollIntoViewEachFrame);
        };
        scrollIntoViewEachFrame();
    }, [onExit, scrollIntoView]);

    const onEntered = useCallback(() => {
        onExit();
        scrollIntoView();
    }, [onExit, scrollIntoView]);

    useEffect(() => onExit, [onExit]);

    return { ref, onEnter, onEntered, onExit };
};
