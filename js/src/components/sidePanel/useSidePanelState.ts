import { useCallback, useEffect, useMemo, useState } from 'react';
import { SidePanelContextValue } from './SidePanelContext';

export const useSidePanelState = (
    defaultOpen = true,
    locked = false,
): SidePanelContextValue => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    // Getting locked while collapsed (e.g. starting a create/edit flow from the collapsed
    // rail) must still reveal the form it protects.
    useEffect(() => {
        if (locked) {
            setIsOpen(true);
        }
    }, [locked]);

    const toggle = useCallback(() => {
        if (!locked) {
            setIsOpen(current => !current);
        }
    }, [locked]);
    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => {
        if (!locked) {
            setIsOpen(false);
        }
    }, [locked]);
    return useMemo(
        () => ({ isOpen, toggle, open, close, locked }),
        [isOpen, toggle, open, close, locked],
    );
};
