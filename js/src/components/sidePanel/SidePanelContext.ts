import { createContext, useContext } from 'react';

export type SidePanelContextValue = {
    isOpen: boolean;
    toggle: () => void;
    open: () => void;
    close: () => void;
    locked: boolean;
};

export const SidePanelContext = createContext<
    SidePanelContextValue | undefined
>(undefined);

export const useSidePanelContext = (): SidePanelContextValue => {
    const context = useContext(SidePanelContext);
    if (!context) {
        throw new Error(
            'useSidePanelContext must be used within a SidePanelContext.Provider',
        );
    }
    return context;
};
