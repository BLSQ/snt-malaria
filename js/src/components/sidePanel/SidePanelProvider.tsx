import React, { FC, ReactNode } from 'react';
import {
    SidePanelActionsContext,
    SidePanelMode,
    SidePanelStateContext,
} from './SidePanelContext';
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
    const { state, actions } = useSidePanelState({ storageKey, defaultMode });
    return (
        <SidePanelActionsContext.Provider value={actions}>
            <SidePanelStateContext.Provider value={state}>
                {children}
            </SidePanelStateContext.Provider>
        </SidePanelActionsContext.Provider>
    );
};
