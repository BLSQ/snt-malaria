import { createContext, FocusEvent, useContext } from 'react';

export type SidePanelMode = 'docked' | 'undocked';
export type SidePanelPhase = 'lifting' | 'docking' | null;
export type SidePanelFloating = 'closed' | 'peek' | 'pinned';

export type SidePanelLabel = {
    title: string;
    hint?: string;
};

export type ToggleOrigin = {
    top: number;
    left: number;
    width: number;
    height: number;
};

export type SidePanelContextValue = {
    mode: SidePanelMode;
    phase: SidePanelPhase;
    floating: SidePanelFloating;
    canUndock: boolean;
    hasHeaderToggle: boolean;
    toggleOrigin: ToggleOrigin | null;
    label: SidePanelLabel | null;
    dock: () => void;
    undock: () => void;
    openFloating: (peek?: boolean) => void;
    closeFloating: () => void;
    hold: () => void;
    reveal: () => void;
    setLabel: (key: string, label: SidePanelLabel | null) => void;
    panelRef: (element: HTMLElement | null) => void;
    registerToggle: (element: HTMLElement, isFallback: boolean) => () => void;
    onEnterToggle: () => void;
    onBlurPanel: (event: FocusEvent<HTMLElement>) => void;
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
