import { useEffect, useRef } from 'react';
import { useSidePanelContext } from './SidePanelContext';

export const useSidePanelHold = (key: unknown): void => {
    const { hold } = useSidePanelContext();
    const holdRef = useRef(hold);
    holdRef.current = hold;

    useEffect(() => {
        holdRef.current();
    }, [key]);
};
