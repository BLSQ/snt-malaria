import React, {
    FC,
    ReactNode,
    useCallback,
    useLayoutEffect,
    useRef,
} from 'react';
import { Box, useTheme } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { MainColumn, SidebarColumn, SidebarLayout } from '../styledComponents';
import {
    CLOSE_MS,
    LIFT_MS,
    OPEN_MS,
    PANEL_GAP,
    PANEL_WIDTH,
    FALLBACK_TOGGLE_Z_INDEX,
    PANEL_Z_INDEX,
    SCRIM_Z_INDEX,
    SLIDE_MS,
} from './constants';
import { ToggleOrigin, useSidePanelContext } from './SidePanelContext';
import { SidePanelToggle } from './SidePanelToggle';

const LIFTED_SHADOW =
    'drop-shadow(0 12px 24px rgba(31,43,61,0.22)) drop-shadow(0 2px 6px rgba(31,43,61,0.12))';
const FLAT_SHADOW =
    'drop-shadow(0 0 0 rgba(31,43,61,0)) drop-shadow(0 0 0 rgba(31,43,61,0))';
const OPEN_CLIP = 'inset(0px 0px 0px 0px round 16px)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const noMotion = { [`@media ${REDUCED_MOTION}`]: { transition: 'none' } };

const styles = {
    root: {
        position: 'relative',
        display: 'flex',
        gap: 1,
        height: '100%',
        minHeight: 0,
    },
    content: {
        position: 'relative',
        flex: 7,
        minWidth: 0,
        display: 'flex',
    },
    spacer: {
        position: 'relative',
        flexShrink: 0,
        ...noMotion,
    },
    panel: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: PANEL_WIDTH,
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        zIndex: PANEL_Z_INDEX,
        ...noMotion,
    },
    layer: {
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        minHeight: 0,
        ...noMotion,
    },
    clipLayer: {
        borderRadius: '16px',
        overflow: 'hidden',
    },
    main: {
        position: 'relative',
        flex: 1,
    },
    fallbackToggle: {
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: FALLBACK_TOGGLE_Z_INDEX,
    },
    scrim: {
        position: 'absolute',
        inset: 0,
        zIndex: SCRIM_Z_INDEX,
        backgroundColor: 'rgba(31,43,61,0.16)',
        ...noMotion,
    },
} satisfies SxStyles;

const closedClip = (origin: ToggleOrigin | null): string => {
    if (!origin) {
        return 'inset(0px 100% 100% 0px round 4px)';
    }
    const { top, left, width, height } = origin;
    return `inset(${top}px calc(100% - ${left + width}px) calc(100% - ${top + height}px) ${left}px round 4px)`;
};

const prefersReducedMotion = (): boolean =>
    window.matchMedia?.(REDUCED_MOTION).matches ?? false;

const usePanelHeightTransition = (hugsContent: boolean, easing: string) => {
    const panelElement = useRef<HTMLElement | null>(null);
    const lastHeight = useRef<number>(0);
    const observer = useRef<ResizeObserver>();

    const observe = useCallback((element: HTMLElement | null) => {
        observer.current?.disconnect();
        panelElement.current = element;
        if (element) {
            observer.current = new ResizeObserver(() => {
                lastHeight.current = element.getBoundingClientRect().height;
            });
            observer.current.observe(element);
        }
    }, []);

    useLayoutEffect(() => {
        const element = panelElement.current;
        const from = lastHeight.current;
        if (!element || !from || prefersReducedMotion()) {
            return undefined;
        }
        const to = element.getBoundingClientRect().height;
        if (Math.abs(from - to) < 1) {
            return undefined;
        }
        const reset = () => {
            element.style.height = '';
            element.style.transition = '';
        };
        element.style.height = `${from}px`;
        element.getBoundingClientRect();
        element.style.transition = `height ${SLIDE_MS}ms ${easing}`;
        element.style.height = `${to}px`;
        const timer = window.setTimeout(reset, SLIDE_MS);
        return () => {
            window.clearTimeout(timer);
            reset();
        };
    }, [hugsContent, easing]);

    return observe;
};

type Props = {
    panel: ReactNode;
    before?: ReactNode;
    children: ReactNode;
};

export const SidePanelLayout: FC<Props> = ({ panel, before, children }) => {
    const {
        mode,
        phase,
        floating,
        canUndock,
        hasHeaderToggle,
        toggleOrigin,
        panelRef,
        closeFloating,
        onBlurPanel,
    } = useSidePanelContext();
    const { transitions } = useTheme();
    const easing = transitions.easing.easeInOut;
    const { easeOut, easeIn } = transitions.easing;

    const isDocked = mode === 'docked';
    const isOpen = isDocked || floating !== 'closed';
    const isLifted = (!isDocked && floating !== 'closed') || phase !== null;
    const isMainPushed = isDocked || phase === 'docking';
    const hugsContent = !isDocked && !phase;
    const showScrim = !isDocked && floating === 'pinned' && !phase;

    const observeHeight = usePanelHeightTransition(hugsContent, easing);
    const setPanelElement = useCallback(
        (element: HTMLElement | null) => {
            panelRef(element);
            observeHeight(element);
        },
        [panelRef, observeHeight],
    );

    if (!canUndock) {
        return (
            <SidebarLayout>
                {before}
                <SidebarColumn>{panel}</SidebarColumn>
                <MainColumn>{children}</MainColumn>
            </SidebarLayout>
        );
    }

    return (
        <Box sx={styles.root}>
            {before}
            <Box sx={styles.content}>
                <Box
                    sx={[
                        styles.spacer,
                        {
                            width: isMainPushed ? PANEL_WIDTH + PANEL_GAP : 0,
                            transition: `width ${SLIDE_MS}ms ${easing}`,
                        },
                    ]}
                >
                    <Box
                        ref={setPanelElement}
                        onBlur={onBlurPanel}
                        aria-hidden={!isOpen}
                        sx={[
                            styles.panel,
                            {
                                height: hugsContent ? 'auto' : '100%',
                                visibility: isOpen ? 'visible' : 'hidden',
                                pointerEvents: isOpen ? 'auto' : 'none',
                                transition: `visibility 0ms linear ${isOpen ? 0 : CLOSE_MS}ms`,
                            },
                        ]}
                    >
                        <Box
                            sx={[
                                styles.layer,
                                {
                                    filter: isLifted
                                        ? LIFTED_SHADOW
                                        : FLAT_SHADOW,
                                    transform: `translateY(${isLifted ? -2 : 0}px)`,
                                    transition: `filter ${LIFT_MS}ms ${easing}, transform ${LIFT_MS}ms ${easing}`,
                                },
                            ]}
                        >
                            <Box
                                sx={[
                                    styles.layer,
                                    styles.clipLayer,
                                    {
                                        clipPath: isOpen
                                            ? OPEN_CLIP
                                            : closedClip(toggleOrigin),
                                        opacity: isOpen ? 1 : 0,
                                        transition: isOpen
                                            ? `clip-path ${OPEN_MS}ms ${easeOut}, opacity 0ms`
                                            : `clip-path ${CLOSE_MS}ms ${easeIn}, opacity 60ms linear ${CLOSE_MS - 60}ms`,
                                    },
                                ]}
                            >
                                <Box
                                    sx={[
                                        styles.layer,
                                        {
                                            opacity: isOpen ? 1 : 0,
                                            transition: isOpen
                                                ? `opacity 160ms linear ${OPEN_MS / 2}ms`
                                                : 'opacity 100ms linear',
                                        },
                                    ]}
                                >
                                    {panel}
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Box>
                <MainColumn sx={styles.main}>
                    {children}
                    {!isDocked && !hasHeaderToggle && (
                        <Box sx={styles.fallbackToggle}>
                            <SidePanelToggle fallback />
                        </Box>
                    )}
                </MainColumn>
            </Box>
            <Box
                aria-hidden
                onClick={closeFloating}
                sx={[
                    styles.scrim,
                    {
                        opacity: showScrim ? 1 : 0,
                        pointerEvents: showScrim ? 'auto' : 'none',
                        transition: `opacity 225ms ${easing}`,
                    },
                ]}
            />
        </Box>
    );
};
