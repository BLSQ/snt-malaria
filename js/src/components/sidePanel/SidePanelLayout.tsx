import React, {
    FC,
    ReactNode,
    useCallback,
    useLayoutEffect,
    useRef,
} from 'react';
import Box from '@mui/material/Box/Box';
import Grow from '@mui/material/Grow/Grow';
import useTheme from '@mui/material/styles/useTheme';
import useMediaQuery from '@mui/material/useMediaQuery';
import { SxStyles } from 'Iaso/types/general';
import { MainColumn, SidebarColumn, SidebarLayout } from '../styledComponents';
import {
    LIFT_MS,
    noMotion,
    PANEL_GAP,
    PANEL_WIDTH,
    FALLBACK_TOGGLE_Z_INDEX,
    PANEL_Z_INDEX,
    REDUCED_MOTION,
    SCRIM_Z_INDEX,
    SLIDE_MS,
} from './constants';
import {
    ToggleOrigin,
    useSidePanelActions,
    useSidePanelContext,
} from './SidePanelContext';
import { SidePanelToggle } from './SidePanelToggle';

const LIFTED_SHADOW =
    'drop-shadow(0 12px 24px rgba(31,43,61,0.22)) drop-shadow(0 2px 6px rgba(31,43,61,0.12))';

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

const transformOriginAt = (origin: ToggleOrigin | null): string =>
    origin
        ? `${origin.left + origin.width / 2}px ${origin.top + origin.height / 2}px`
        : '0 0';

const usePanelHeightTransition = (
    hugsContent: boolean,
    easing: string,
    isReducedMotion: boolean,
) => {
    const panelElement = useRef<HTMLElement | null>(null);
    const lastHeight = useRef<number>(0);
    const observer = useRef<ResizeObserver>();

    const observe = useCallback((element: HTMLElement | null) => {
        observer.current?.disconnect();
        panelElement.current = element;
        if (element) {
            observer.current = new ResizeObserver(([entry]) => {
                lastHeight.current = entry.borderBoxSize[0].blockSize;
            });
            observer.current.observe(element);
        }
    }, []);

    useLayoutEffect(() => {
        const element = panelElement.current;
        const from = lastHeight.current;
        if (!element || !from || isReducedMotion) {
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
    }, [hugsContent, easing, isReducedMotion]);

    return observe;
};

type Props = {
    panel: ReactNode;
    before?: ReactNode;
    children: ReactNode;
};

export const SidePanelLayout: FC<Props> = ({ panel, before, children }) => {
    const { mode, phase, floating, canUndock, hasHeaderToggle, toggleOrigin } =
        useSidePanelContext();
    const { panelRef, closeFloating, onBlurPanel } = useSidePanelActions();
    const { transitions } = useTheme();
    const easing = transitions.easing.easeInOut;
    const isReducedMotion = useMediaQuery(REDUCED_MOTION);
    const growTimeout = isReducedMotion
        ? 0
        : {
              enter: transitions.duration.enteringScreen,
              exit: transitions.duration.leavingScreen,
          };

    const isDocked = mode === 'docked';
    const isOpen = isDocked || floating !== 'closed';
    const isLifted = (!isDocked && floating !== 'closed') || phase !== null;
    const isMainPushed = isDocked || phase === 'docking';
    const hugsContent = !isDocked && !phase;
    const showScrim = !isDocked && floating === 'pinned' && !phase;

    const observeHeight = usePanelHeightTransition(
        hugsContent,
        easing,
        isReducedMotion,
    );
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
                                pointerEvents: isOpen ? 'auto' : 'none',
                            },
                        ]}
                    >
                        <Box
                            sx={[
                                styles.layer,
                                {
                                    filter: isLifted ? LIFTED_SHADOW : 'none',
                                    transform: `translateY(${isLifted ? -2 : 0}px)`,
                                    transition: `filter ${LIFT_MS}ms ${easing}, transform ${LIFT_MS}ms ${easing}`,
                                },
                            ]}
                        >
                            <Grow
                                in={isOpen}
                                appear={false}
                                timeout={growTimeout}
                                style={{
                                    transformOrigin:
                                        transformOriginAt(toggleOrigin),
                                }}
                            >
                                <Box sx={styles.layer}>{panel}</Box>
                            </Grow>
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
