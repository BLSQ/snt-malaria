import { createContext, FocusEvent, useContext } from 'react';

export type SidePanelMode = 'docked' | 'undocked';
export type SidePanelPhase = 'lifting' | 'docking' | null;
export type SidePanelFloating = 'closed' | 'peek' | 'pinned';
export type SidePanelLabelSlot = 'base' | 'override';

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

export type SidePanelState = {
    mode: SidePanelMode;
    phase: SidePanelPhase;
    floating: SidePanelFloating;
    canUndock: boolean;
    hasHeaderToggle: boolean;
    toggleOrigin: ToggleOrigin | null;
    label: SidePanelLabel | null;
};

export type SidePanelActions = {
    dock: () => void;
    undock: () => void;
    openFloating: (peek?: boolean) => void;
    closeFloating: () => void;
    hold: () => void;
    reveal: () => void;
    setLabel: (slot: SidePanelLabelSlot, label: SidePanelLabel | null) => void;
    panelRef: (element: HTMLElement | null) => void;
    registerToggle: (element: HTMLElement, isFallback: boolean) => () => void;
    onEnterToggle: () => void;
    onBlurPanel: (event: FocusEvent<HTMLElement>) => void;
};

export const SidePanelStateContext = createContext<SidePanelState | undefined>(
    undefined,
);
export const SidePanelActionsContext = createContext<
    SidePanelActions | undefined
>(undefined);

const required = <T>(value: T | undefined, hook: string): T => {
    if (!value) {
        throw new Error(`${hook} must be used within a SidePanelProvider`);
    }
    return value;
};

export const useSidePanelContext = (): SidePanelState =>
    required(useContext(SidePanelStateContext), 'useSidePanelContext');

export const useSidePanelActions = (): SidePanelActions =>
    required(useContext(SidePanelActionsContext), 'useSidePanelActions');
