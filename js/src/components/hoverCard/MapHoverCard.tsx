import React, {
    forwardRef,
    ReactNode,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import Box from '@mui/material/Box/Box';
import Fade from '@mui/material/Fade/Fade';
import Popper from '@mui/material/Popper/Popper';
import useTheme from '@mui/material/styles/useTheme';
import { Instance } from '@popperjs/core';
import { createPortal } from 'react-dom'; // DEBUG
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import {
    DEAD_ZONE_PX, // DEBUG
    fitPlacement,
    getQuadrantPlacement,
    Point,
    QuadrantPlacement,
} from './getQuadrantPlacement';
import {
    getExpansionGrowth,
    HoverCard,
    HoverCardExpansion,
    toSide,
} from './HoverCard';

const POINTER_OFFSET_PX = 16;
const FADE_MS = 120;
const HIDE_DELAY_MS = 50;

const styles = {
    card: {
        transition: `opacity ${FADE_MS}ms`,
    },
    switchingSideCard: {
        opacity: 0,
    },
} satisfies SxStyles;

let unpinPinnedCard: (() => void) | undefined;

export type MapHoverCardActions = {
    hint?: string;
    /** Runs on click, without pinning the card. */
    onClick?: () => void;
    /** Opens on click and pins the card until it is closed. */
    expansion?: HoverCardExpansion;
};

export type GetMapHoverCardActions = (orgUnit: OrgUnit) => MapHoverCardActions;

export type MapHover = { orgUnit: OrgUnit; point: Point };

export type MapHoverCardHandle = {
    update: (hover: MapHover | null) => void;
    click: (hover: MapHover) => void;
    unpin: () => void;
};

type Props = {
    getContent: (orgUnit: OrgUnit) => ReactNode;
    getHeaderExtra?: (orgUnit: OrgUnit) => ReactNode;
    getActions?: GetMapHoverCardActions;
    getCountryRect: () => DOMRect | undefined;
    onPinChange?: (orgUnitId: number | undefined) => void;
};

const offsetFromPointer = ({ placement }: { placement: string }) => [
    placement.endsWith('end') ? -POINTER_OFFSET_PX : POINTER_OFFSET_PX,
    POINTER_OFFSET_PX,
];

export const MapHoverCard = forwardRef<MapHoverCardHandle, Props>(
    (
        { getContent, getHeaderExtra, getActions, getCountryRect, onPinChange },
        ref,
    ) => {
        const theme = useTheme();
        const popperRef = useRef<Instance>(null);
        const pointerRef = useRef<Point>({ x: 0, y: 0 });
        const placementRef = useRef<QuadrantPlacement>('bottom-start');
        const plannedSizeRef = useRef({ width: 0, height: 0 });
        const isOpenRef = useRef(false);
        const isPinnedRef = useRef(false);
        const unpinRef = useRef<() => void>();
        const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
        const switchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
        const stopMovingRef = useRef<() => void>();
        const [anchor] = useState(() => ({
            getBoundingClientRect: () =>
                new DOMRect(pointerRef.current.x, pointerRef.current.y, 0, 0),
        }));
        const [unpinThisCard] = useState(() => () => unpinRef.current?.());
        const [orgUnit, setOrgUnit] = useState<OrgUnit>();
        const [isOpen, setIsOpen] = useState(false);
        const [isPinned, setIsPinned] = useState(false);
        const [placement, setPlacement] =
            useState<QuadrantPlacement>('bottom-start');
        const [isSwitchingSide, setIsSwitchingSide] = useState(false);
        const [card, setCard] = useState<HTMLDivElement | null>(null);
        const [debugRect, setDebugRect] = useState<DOMRect>(); // DEBUG
        const [debugPlannedRect, setDebugPlannedRect] = useState<DOMRect>(); // DEBUG

        const setOpen = useCallback((open: boolean) => {
            isOpenRef.current = open;
            setIsOpen(open);
        }, []);

        const setPinned = useCallback(
            (pinnedOrgUnit: OrgUnit | undefined) => {
                if (pinnedOrgUnit) {
                    if (unpinPinnedCard !== unpinThisCard) unpinPinnedCard?.();
                    unpinPinnedCard = unpinThisCard;
                } else if (unpinPinnedCard === unpinThisCard) {
                    unpinPinnedCard = undefined;
                }
                isPinnedRef.current = Boolean(pinnedOrgUnit);
                setIsPinned(Boolean(pinnedOrgUnit));
                onPinChange?.(pinnedOrgUnit?.id);
            },
            [onPinChange, unpinThisCard],
        );

        const switchSide = useCallback((next: QuadrantPlacement) => {
            placementRef.current = next;
            clearTimeout(switchTimeoutRef.current);
            if (!isOpenRef.current) {
                setPlacement(next);
                return;
            }
            setIsSwitchingSide(true);
            switchTimeoutRef.current = setTimeout(() => {
                setPlacement(next);
                setIsSwitchingSide(false);
            }, FADE_MS);
        }, []);

        const placeCard = useCallback(() => {
            const countryRect = getCountryRect();
            if (!countryRect) return;
            // DEBUG: only re-render when the box actually moved
            setDebugRect(current =>
                current &&
                current.x === countryRect.x &&
                current.y === countryRect.y &&
                current.width === countryRect.width &&
                current.height === countryRect.height
                    ? current
                    : countryRect,
            );
            const next = fitPlacement(
                getQuadrantPlacement(
                    pointerRef.current,
                    countryRect,
                    placementRef.current,
                ),
                pointerRef.current,
                plannedSizeRef.current,
                { width: window.innerWidth, height: window.innerHeight },
                POINTER_OFFSET_PX,
            );
            if (next !== placementRef.current) {
                switchSide(next);
            }
            // DEBUG: the expanded size fitPlacement checked, on the chosen side
            const { x, y } = pointerRef.current;
            const { width, height } = plannedSizeRef.current;
            setDebugPlannedRect(
                new DOMRect(
                    next.endsWith('end')
                        ? x - POINTER_OFFSET_PX - width
                        : x + POINTER_OFFSET_PX,
                    next.startsWith('top')
                        ? y - POINTER_OFFSET_PX - height
                        : y + POINTER_OFFSET_PX,
                    width,
                    height,
                ),
            );
        }, [getCountryRect, switchSide]);

        const showAt = useCallback(
            (hover: MapHover) => {
                clearTimeout(hideTimeoutRef.current);
                pointerRef.current = hover.point;
                placeCard();
                setOrgUnit(hover.orgUnit);
                setOpen(true);
                popperRef.current?.update();
            },
            [placeCard, setOpen],
        );

        const moveFromHandle = useCallback((event: React.PointerEvent) => {
            event.preventDefault();
            const start = { x: event.clientX, y: event.clientY };
            const anchorStart = pointerRef.current;
            const move = (moveEvent: PointerEvent) => {
                pointerRef.current = {
                    x: anchorStart.x + moveEvent.clientX - start.x,
                    y: anchorStart.y + moveEvent.clientY - start.y,
                };
                popperRef.current?.forceUpdate();
            };
            const stop = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', stop);
                stopMovingRef.current = undefined;
            };
            stopMovingRef.current?.();
            stopMovingRef.current = stop;
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', stop);
        }, []);

        const unpin = useCallback(() => {
            if (!isPinnedRef.current) return;
            stopMovingRef.current?.();
            setPinned(undefined);
            setOpen(false);
        }, [setPinned, setOpen]);
        unpinRef.current = unpin;

        const update = useCallback(
            (hover: MapHover | null) => {
                if (isPinnedRef.current) return;
                if (hover) {
                    if (unpinPinnedCard !== unpinThisCard) unpinPinnedCard?.();
                    showAt(hover);
                    return;
                }
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = setTimeout(
                    () => setOpen(false),
                    HIDE_DELAY_MS,
                );
            },
            [showAt, setOpen, unpinThisCard],
        );

        const click = useCallback(
            (hover: MapHover) => {
                const actions = getActions?.(hover.orgUnit);
                if (actions?.expansion) {
                    showAt(hover);
                    setPinned(hover.orgUnit);
                    return;
                }
                unpin();
                actions?.onClick?.();
            },
            [getActions, showAt, setPinned, unpin],
        );

        useImperativeHandle(ref, () => ({ update, click, unpin }), [
            update,
            click,
            unpin,
        ]);

        useEffect(() => {
            window.addEventListener('scroll', unpin, true);
            window.addEventListener('resize', unpin);
            return () => {
                window.removeEventListener('scroll', unpin, true);
                window.removeEventListener('resize', unpin);
            };
        }, [unpin]);

        useEffect(() => {
            if (!isPinned) return undefined;
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') unpin();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [isPinned, unpin]);

        useEffect(
            () => () => {
                clearTimeout(hideTimeoutRef.current);
                clearTimeout(switchTimeoutRef.current);
                stopMovingRef.current?.();
                if (unpinPinnedCard === unpinThisCard) {
                    unpinPinnedCard = undefined;
                }
            },
            [unpinThisCard],
        );

        const actions = useMemo(
            () => orgUnit && getActions?.(orgUnit),
            [orgUnit, getActions],
        );

        useEffect(() => {
            if (!card) return undefined;
            const observer = new ResizeObserver(() => {
                const growth = getExpansionGrowth(card);
                plannedSizeRef.current = {
                    width: card.offsetWidth + growth.width,
                    height: card.offsetHeight + growth.height,
                };
                if (!isPinnedRef.current) placeCard();
                popperRef.current?.update();
            });
            observer.observe(card);
            return () => observer.disconnect();
        }, [card, placeCard]);

        // DEBUG: country bounding box, quadrant axes and dead zones
        const debugOverlay =
            debugRect &&
            createPortal(
                <div
                    style={{
                        position: 'fixed',
                        left: debugRect.left,
                        top: debugRect.top,
                        width: debugRect.width,
                        height: debugRect.height,
                        border: '2px dashed red',
                        pointerEvents: 'none',
                        zIndex: 2000,
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `calc(50% - ${DEAD_ZONE_PX}px)`,
                            width: DEAD_ZONE_PX * 2,
                            background: 'rgba(255,0,0,0.12)',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: `calc(50% - ${DEAD_ZONE_PX}px)`,
                            height: DEAD_ZONE_PX * 2,
                            background: 'rgba(0,0,255,0.12)',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: '50%',
                            borderLeft: '1px solid red',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: '50%',
                            borderTop: '1px solid blue',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            padding: '2px 6px',
                            background: 'rgba(255,255,255,0.85)',
                            font: '12px monospace',
                        }}
                    >
                        {placement}
                        {isPinned ? ' (pinned)' : ''}
                    </div>
                </div>,
                document.body,
            );

        // DEBUG: planned expanded outline
        const debugPlannedOverlay =
            debugPlannedRect &&
            isOpen &&
            createPortal(
                <div
                    style={{
                        position: 'fixed',
                        left: debugPlannedRect.left,
                        top: debugPlannedRect.top,
                        width: debugPlannedRect.width,
                        height: debugPlannedRect.height,
                        outline: '2px dashed #00a000',
                        pointerEvents: 'none',
                        zIndex: 2001,
                    }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            bottom: -18,
                            right: 0,
                            padding: '0 4px',
                            background: 'rgba(255,255,255,0.85)',
                            color: '#00a000',
                            font: '11px monospace',
                        }}
                    >
                        planned {Math.round(debugPlannedRect.width)}×
                        {Math.round(debugPlannedRect.height)}
                    </span>
                </div>,
                document.body,
            );

        return (
            <>
                {debugOverlay}
                {debugPlannedOverlay}
                <Popper
                    open={isOpen && Boolean(orgUnit)}
                    anchorEl={anchor}
                    placement={placement}
                    popperRef={popperRef}
                    modifiers={[
                        {
                            name: 'offset',
                            options: { offset: offsetFromPointer },
                        },
                        { name: 'flip', enabled: false },
                    ]}
                    transition
                    style={{
                        zIndex: theme.zIndex.tooltip,
                        pointerEvents: isPinned ? 'auto' : 'none',
                    }}
                >
                    {({ TransitionProps }) => (
                        <Fade {...TransitionProps} timeout={FADE_MS}>
                            <Box>
                                <Box
                                    ref={setCard}
                                    sx={[
                                        styles.card,
                                        isSwitchingSide &&
                                            styles.switchingSideCard,
                                    ]}
                                >
                                    {orgUnit && (
                                        <HoverCard
                                            title={
                                                orgUnit.short_name ??
                                                orgUnit.name
                                            }
                                            subtitle={orgUnit.parent_name}
                                            headerExtra={getHeaderExtra?.(
                                                orgUnit,
                                            )}
                                            hint={actions?.hint}
                                            expansion={actions?.expansion}
                                            isExpanded={isPinned}
                                            onClose={unpin}
                                            onMoveStart={moveFromHandle}
                                            side={toSide(placement)}
                                        >
                                            {getContent(orgUnit)}
                                        </HoverCard>
                                    )}
                                </Box>
                            </Box>
                        </Fade>
                    )}
                </Popper>
            </>
        );
    },
);

MapHoverCard.displayName = 'MapHoverCard';
