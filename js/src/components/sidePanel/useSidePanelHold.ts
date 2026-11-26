import { useEffect } from 'react';
import { useSidePanelActions } from './SidePanelContext';

export const useSidePanelHold = (key: unknown): void => {
    const { hold } = useSidePanelActions();

    useEffect(() => {
        hold();
    }, [hold, key]);
};
