import React, { FC, ReactNode } from 'react';
import { SidePanelContext, SidePanelMode } from './SidePanelContext';
import { useSidePanelState } from './useSidePanelState';

type Props = {
    storageKey: string;
    defaultMode?: SidePanelMode;
    children: ReactNode;
};

export const SidePanelProvider: FC<Props> = ({
    storageKey,
    defaultMode,
    children,
}) => {
    const value = useSidePanelState({ storageKey, defaultMode });
    return (
        <SidePanelContext.Provider value={value}>
            {children}
        </SidePanelContext.Provider>
    );
};
