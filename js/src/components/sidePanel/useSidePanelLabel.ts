import { useEffect, useId } from 'react';
import { SidePanelLabel, useSidePanelContext } from './SidePanelContext';

export const useSidePanelLabel = (
    { title, hint }: SidePanelLabel,
    key?: string,
): void => {
    const { setLabel } = useSidePanelContext();
    const generatedKey = useId();
    const labelKey = key ?? generatedKey;

    useEffect(() => {
        setLabel(labelKey, { title, hint });
    }, [setLabel, labelKey, title, hint]);

    useEffect(() => () => setLabel(labelKey, null), [setLabel, labelKey]);
};
