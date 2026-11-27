import { SyntheticEvent, useCallback, useEffect, useRef } from 'react';

// React events bubble through portals, so menus opened from inside count as inside.
export const useDismissOnOutsideInteraction = (
    onDismiss?: () => void,
    isIgnored?: (event: Event) => boolean,
) => {
    const insideEvent = useRef<Event>();

    const markInside = useCallback((event: SyntheticEvent) => {
        insideEvent.current = event.nativeEvent;
    }, []);

    useEffect(() => {
        if (!onDismiss) return undefined;
        const handleInteraction = (event: Event) => {
            if (event !== insideEvent.current && !isIgnored?.(event)) {
                onDismiss();
            }
        };
        document.addEventListener('pointerdown', handleInteraction);
        document.addEventListener('focusin', handleInteraction);
        return () => {
            document.removeEventListener('pointerdown', handleInteraction);
            document.removeEventListener('focusin', handleInteraction);
        };
    }, [isIgnored, onDismiss]);

    return { onPointerDownCapture: markInside, onFocusCapture: markInside };
};
