import {
    FocusEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { LIFT_MS, PEEK_CLOSE_DELAY_MS, SLIDE_MS } from './constants';
import {
    SidePanelContextValue,
    SidePanelFloating,
    SidePanelLabel,
    SidePanelMode,
    SidePanelPhase,
    ToggleOrigin,
} from './SidePanelContext';

export const BASE_LABEL_KEY = 'base';

const OVERLAY_SELECTOR = '.MuiPopover-root, .MuiPopper-root, .MuiModal-root';

type Options = {
    storageKey: string;
    defaultMode?: SidePanelMode;
};

const readStoredMode = (storageKey: string): SidePanelMode | null => {
    try {
        const stored = window.localStorage.getItem(storageKey);
        return stored === 'docked' || stored === 'undocked' ? stored : null;
    } catch {
        return null;
    }
};

const storeMode = (storageKey: string, mode: SidePanelMode) => {
    try {
        window.localStorage.setItem(storageKey, mode);
    } catch {
        // Storage unavailable: the mode just isn't remembered.
    }
};

const isTypingIn = (element: HTMLElement | null): boolean => {
    const active = document.activeElement;
    return Boolean(
        element &&
        active &&
        element.contains(active) &&
        /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName),
    );
};

const measureOrigin = (
    toggle: HTMLElement | null,
    panel: HTMLElement | null,
): ToggleOrigin | null => {
    if (!toggle || !panel) {
        return null;
    }
    const toggleRect = toggle.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return {
        top: toggleRect.top - panelRect.top,
        left: toggleRect.left - panelRect.left,
        width: toggleRect.width,
        height: toggleRect.height,
    };
};

export const useSidePanelState = ({
    storageKey,
    defaultMode = 'docked',
}: Options): SidePanelContextValue => {
    const theme = useTheme();
    const canUndock = useMediaQuery(theme.breakpoints.up('md'));
    const [storedMode, setStoredMode] = useState<SidePanelMode>(
        () => readStoredMode(storageKey) ?? defaultMode,
    );
    const [phase, setPhase] = useState<SidePanelPhase>(null);
    const [floating, setFloating] = useState<SidePanelFloating>('closed');
    const [toggleOrigin, setToggleOrigin] = useState<ToggleOrigin | null>(null);
    const [labels, setLabels] = useState<Record<string, SidePanelLabel>>({});

    const toggleElements = useRef(new Map<HTMLElement, boolean>());
    const [hasHeaderToggle, setHasHeaderToggle] = useState(false);
    const panelElement = useRef<HTMLElement | null>(null);
    const phaseTimer = useRef<number>();
    const closeTimer = useRef<number>();
    const pointerInside = useRef(false);
    const isHeld = useRef(false);

    const mode: SidePanelMode = canUndock ? storedMode : 'docked';

    const clearCloseTimer = useCallback(() => {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = undefined;
    }, []);

    const clearTimers = useCallback(() => {
        window.clearTimeout(phaseTimer.current);
        phaseTimer.current = undefined;
        clearCloseTimer();
    }, [clearCloseTimer]);

    useEffect(() => clearTimers, [clearTimers]);

    const updateOrigin = useCallback(() => {
        const elements = [...toggleElements.current.keys()];
        const origin = measureOrigin(
            elements[elements.length - 1] ?? null,
            panelElement.current,
        );
        if (origin) {
            setToggleOrigin(origin);
        }
    }, []);

    const setMode = useCallback(
        (next: SidePanelMode) => {
            setStoredMode(next);
            storeMode(storageKey, next);
        },
        [storageKey],
    );

    const closeFloating = useCallback(() => {
        clearCloseTimer();
        isHeld.current = false;
        updateOrigin();
        setFloating('closed');
    }, [clearCloseTimer, updateOrigin]);

    const scheduleClose = useCallback(
        (delay: number) => {
            clearCloseTimer();
            closeTimer.current = window.setTimeout(() => {
                closeTimer.current = undefined;
                if (!isTypingIn(panelElement.current)) {
                    closeFloating();
                }
            }, delay);
        },
        [clearCloseTimer, closeFloating],
    );

    const openFloating = useCallback(
        (peek = false) => {
            clearCloseTimer();
            updateOrigin();
            setFloating(peek ? 'peek' : 'pinned');
        },
        [clearCloseTimer, updateOrigin],
    );

    const undock = useCallback(() => {
        clearTimers();
        pointerInside.current = true;
        setPhase('lifting');
        phaseTimer.current = window.setTimeout(() => {
            phaseTimer.current = undefined;
            setMode('undocked');
            setPhase(null);
            setFloating('peek');
            if (!pointerInside.current) {
                scheduleClose(SLIDE_MS + 150);
            }
        }, LIFT_MS);
    }, [clearTimers, scheduleClose, setMode]);

    const dock = useCallback(() => {
        clearTimers();
        isHeld.current = false;
        setPhase('docking');
        phaseTimer.current = window.setTimeout(() => {
            phaseTimer.current = undefined;
            setMode('docked');
            setPhase(null);
            setFloating('closed');
        }, SLIDE_MS);
    }, [clearTimers, setMode]);

    const hold = useCallback(() => {
        if (mode === 'undocked' && floating !== 'closed') {
            clearCloseTimer();
            isHeld.current = true;
        }
    }, [mode, floating, clearCloseTimer]);

    const reveal = useCallback(() => {
        if (mode === 'undocked' && floating === 'closed') {
            openFloating(true);
            isHeld.current = true;
        }
    }, [mode, floating, openFloating]);

    const setLabel = useCallback(
        (key: string, label: SidePanelLabel | null) =>
            setLabels(current => {
                const next = { ...current };
                delete next[key];
                return label ? { ...next, [key]: label } : next;
            }),
        [],
    );

    const label = useMemo(() => {
        const overrides = Object.keys(labels).filter(
            key => key !== BASE_LABEL_KEY,
        );
        const key = overrides[overrides.length - 1] ?? BASE_LABEL_KEY;
        return labels[key] ?? null;
    }, [labels]);

    const panelRef = useCallback((element: HTMLElement | null) => {
        panelElement.current = element;
    }, []);

    const registerToggle = useCallback(
        (element: HTMLElement, isFallback: boolean) => {
            const elements = toggleElements.current;
            const syncHeaderToggle = () =>
                setHasHeaderToggle(
                    [...elements.values()].some(fallback => !fallback),
                );
            elements.set(element, isFallback);
            syncHeaderToggle();
            return () => {
                elements.delete(element);
                syncHeaderToggle();
            };
        },
        [],
    );

    const onEnterToggle = useCallback(() => {
        clearCloseTimer();
        if (mode === 'undocked' && !phase && floating === 'closed') {
            openFloating(true);
        }
    }, [clearCloseTimer, mode, phase, floating, openFloating]);

    const isPeeking = floating === 'peek' && !phase;
    const isPeekingRef = useRef(isPeeking);
    isPeekingRef.current = isPeeking;
    const tracksPointer = mode === 'undocked' || phase === 'lifting';

    useEffect(() => {
        if (!tracksPointer) {
            return undefined;
        }
        const isInside = (target: EventTarget | null): boolean =>
            target instanceof Element &&
            (Boolean(panelElement.current?.contains(target)) ||
                [...toggleElements.current.keys()].some(toggle =>
                    toggle.contains(target),
                ) ||
                Boolean(target.closest(OVERLAY_SELECTOR)));
        const updatePointer = (inside: boolean) => {
            const wasInside = pointerInside.current;
            pointerInside.current = inside;
            if (inside) {
                isHeld.current = false;
                clearCloseTimer();
            } else if (wasInside && isPeekingRef.current && !isHeld.current) {
                scheduleClose(PEEK_CLOSE_DELAY_MS);
            }
        };
        const onPointerMove = (event: PointerEvent) =>
            updatePointer(isInside(event.target));
        const onPointerLeaveWindow = (event: MouseEvent) => {
            if (!event.relatedTarget) {
                updatePointer(false);
            }
        };
        const onPointerDown = (event: PointerEvent) => {
            if (isHeld.current && !isInside(event.target)) {
                closeFloating();
            }
        };
        const options = { capture: true, passive: true };
        document.addEventListener('pointermove', onPointerMove, options);
        document.addEventListener('pointerdown', onPointerDown, options);
        document.addEventListener('mouseout', onPointerLeaveWindow, options);
        return () => {
            document.removeEventListener('pointermove', onPointerMove, options);
            document.removeEventListener('pointerdown', onPointerDown, options);
            document.removeEventListener(
                'mouseout',
                onPointerLeaveWindow,
                options,
            );
        };
    }, [tracksPointer, clearCloseTimer, scheduleClose, closeFloating]);

    const onBlurPanel = useCallback(
        (event: FocusEvent<HTMLElement>) => {
            const focusStaysInPanel = event.currentTarget.contains(
                event.relatedTarget as Node | null,
            );
            if (
                isPeeking &&
                !isHeld.current &&
                !pointerInside.current &&
                !focusStaysInPanel
            ) {
                scheduleClose(PEEK_CLOSE_DELAY_MS);
            }
        },
        [isPeeking, scheduleClose],
    );

    return useMemo(
        () => ({
            mode,
            phase,
            floating,
            canUndock,
            hasHeaderToggle,
            toggleOrigin,
            label,
            dock,
            undock,
            openFloating,
            closeFloating,
            hold,
            reveal,
            setLabel,
            panelRef,
            registerToggle,
            onEnterToggle,
            onBlurPanel,
        }),
        [
            mode,
            phase,
            floating,
            canUndock,
            hasHeaderToggle,
            toggleOrigin,
            label,
            dock,
            undock,
            openFloating,
            closeFloating,
            hold,
            reveal,
            setLabel,
            panelRef,
            registerToggle,
            onEnterToggle,
            onBlurPanel,
        ],
    );
};
