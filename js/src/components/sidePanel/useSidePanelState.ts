import {
    FocusEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import useTheme from '@mui/material/styles/useTheme';
import useMediaQuery from '@mui/material/useMediaQuery';
import { safeRead, safeWrite } from '../../utils/safeStorage';
import { LIFT_MS, PEEK_CLOSE_DELAY_MS, SLIDE_MS } from './constants';
import {
    SidePanelActions,
    SidePanelFloating,
    SidePanelLabel,
    SidePanelLabelSlot,
    SidePanelMode,
    SidePanelPhase,
    SidePanelState,
    ToggleOrigin,
} from './SidePanelContext';

const OVERLAY_SELECTOR = '.MuiPopover-root, .MuiPopper-root, .MuiModal-root';

type Options = {
    storageKey: string;
    defaultMode?: SidePanelMode;
};

const readStoredMode = (storageKey: string): SidePanelMode | null => {
    const stored = safeRead(storageKey);
    return stored === 'docked' || stored === 'undocked' ? stored : null;
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
    toggle: HTMLElement | undefined,
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

const isSameOrigin = (a: ToggleOrigin | null, b: ToggleOrigin): boolean =>
    Boolean(
        a &&
        a.top === b.top &&
        a.left === b.left &&
        a.width === b.width &&
        a.height === b.height,
    );

const isPeeking = ({
    floating,
    phase,
}: {
    floating: SidePanelFloating;
    phase: SidePanelPhase;
}): boolean => floating === 'peek' && !phase;

const lastKey = <K>(map: Map<K, unknown>): K | undefined => {
    let last: K | undefined;
    map.forEach((_value, key) => {
        last = key;
    });
    return last;
};

export const useSidePanelState = ({
    storageKey,
    defaultMode = 'docked',
}: Options): { state: SidePanelState; actions: SidePanelActions } => {
    const theme = useTheme();
    const canUndock = useMediaQuery(theme.breakpoints.up('md'));
    const [storedMode, setStoredMode] = useState<SidePanelMode>(
        () => readStoredMode(storageKey) ?? defaultMode,
    );
    const [phase, setPhase] = useState<SidePanelPhase>(null);
    const [floating, setFloating] = useState<SidePanelFloating>('closed');
    const [toggleOrigin, setToggleOrigin] = useState<ToggleOrigin | null>(null);
    const [labels, setLabels] = useState<
        Partial<Record<SidePanelLabelSlot, SidePanelLabel>>
    >({});
    const [hasHeaderToggle, setHasHeaderToggle] = useState(false);

    const toggleElements = useRef(new Map<HTMLElement, boolean>());
    const panelElement = useRef<HTMLElement | null>(null);
    const phaseTimer = useRef<number>();
    const closeTimer = useRef<number>();
    const pointerInside = useRef(false);
    const isHeld = useRef(false);

    const mode: SidePanelMode = canUndock ? storedMode : 'docked';
    const current = useRef({ mode, phase, floating });
    current.current = { mode, phase, floating };

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
        const origin = measureOrigin(
            lastKey(toggleElements.current),
            panelElement.current,
        );
        if (origin) {
            setToggleOrigin(previous =>
                isSameOrigin(previous, origin) ? previous : origin,
            );
        }
    }, []);

    const setMode = useCallback(
        (next: SidePanelMode) => {
            setStoredMode(next);
            safeWrite(storageKey, next);
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
        if (current.current.phase) {
            return;
        }
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
        if (current.current.phase) {
            return;
        }
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
        const { mode: currentMode, floating: currentFloating } =
            current.current;
        if (currentMode === 'undocked' && currentFloating !== 'closed') {
            clearCloseTimer();
            isHeld.current = true;
        }
    }, [clearCloseTimer]);

    const reveal = useCallback(() => {
        const { mode: currentMode, floating: currentFloating } =
            current.current;
        if (currentMode === 'undocked' && currentFloating === 'closed') {
            openFloating(true);
            isHeld.current = true;
        }
    }, [openFloating]);

    const setLabel = useCallback(
        (slot: SidePanelLabelSlot, label: SidePanelLabel | null) =>
            setLabels(previous => ({
                ...previous,
                [slot]: label ?? undefined,
            })),
        [],
    );

    const label = labels.override ?? labels.base ?? null;

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
        const {
            mode: currentMode,
            phase: currentPhase,
            floating: currentFloating,
        } = current.current;
        if (
            currentMode === 'undocked' &&
            !currentPhase &&
            currentFloating === 'closed'
        ) {
            openFloating(true);
        }
    }, [clearCloseTimer, openFloating]);

    const tracksPointer = mode === 'undocked' || phase === 'lifting';

    useEffect(() => {
        if (!tracksPointer) {
            return undefined;
        }
        const isInside = (target: EventTarget | null): boolean => {
            if (!(target instanceof Element)) {
                return false;
            }
            if (panelElement.current?.contains(target)) {
                return true;
            }
            let inToggle = false;
            toggleElements.current.forEach((_fallback, toggle) => {
                inToggle = inToggle || toggle.contains(target);
            });
            return inToggle || Boolean(target.closest(OVERLAY_SELECTOR));
        };
        const updatePointer = (inside: boolean) => {
            const wasInside = pointerInside.current;
            pointerInside.current = inside;
            if (inside) {
                isHeld.current = false;
                clearCloseTimer();
            } else if (
                wasInside &&
                isPeeking(current.current) &&
                !isHeld.current
            ) {
                scheduleClose(PEEK_CLOSE_DELAY_MS);
            }
        };
        const onPointerOver = (event: PointerEvent) =>
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
        document.addEventListener('pointerover', onPointerOver, options);
        document.addEventListener('pointerdown', onPointerDown, options);
        document.addEventListener('mouseout', onPointerLeaveWindow, options);
        return () => {
            document.removeEventListener('pointerover', onPointerOver, options);
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
                isPeeking(current.current) &&
                !isHeld.current &&
                !pointerInside.current &&
                !focusStaysInPanel
            ) {
                scheduleClose(PEEK_CLOSE_DELAY_MS);
            }
        },
        [scheduleClose],
    );

    const state = useMemo(
        () => ({
            mode,
            phase,
            floating,
            canUndock,
            hasHeaderToggle,
            toggleOrigin,
            label,
        }),
        [
            mode,
            phase,
            floating,
            canUndock,
            hasHeaderToggle,
            toggleOrigin,
            label,
        ],
    );

    const actions = useMemo(
        () => ({
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

    return { state, actions };
};
