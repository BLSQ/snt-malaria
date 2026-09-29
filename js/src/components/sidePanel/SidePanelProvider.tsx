import React, { FC, ReactNode } from 'react';
import { SidePanelContext } from './SidePanelContext';
import { useSidePanelState } from './useSidePanelState';

type Props = {
    defaultOpen?: boolean;
    locked?: boolean;
    children: ReactNode;
};

export const SidePanelProvider: FC<Props> = ({
    defaultOpen = true,
    locked = false,
    children,
}) => {
    const value = useSidePanelState(defaultOpen, locked);
    return (
        <SidePanelContext.Provider value={value}>
            {children}
        </SidePanelContext.Provider>
    );
};
