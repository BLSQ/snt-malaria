import { useEffect } from 'react';
import {
    SidePanelLabel,
    SidePanelLabelSlot,
    useSidePanelActions,
} from './SidePanelContext';

export const useSidePanelLabel = (
    { title, hint }: SidePanelLabel,
    slot: SidePanelLabelSlot = 'override',
): void => {
    const { setLabel } = useSidePanelActions();

    useEffect(() => {
        setLabel(slot, { title, hint });
    }, [setLabel, slot, title, hint]);

    useEffect(() => () => setLabel(slot, null), [setLabel, slot]);
};
