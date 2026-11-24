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
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import {
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
                    showAt(hover);
                    return;
                }
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = setTimeout(
                    () => setOpen(false),
                    HIDE_DELAY_MS,
                );
            },
            [showAt, setOpen],
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

        return (
            <Popper
                open={isOpen && Boolean(orgUnit)}
                anchorEl={anchor}
                placement={placement}
                popperRef={popperRef}
                modifiers={[
                    { name: 'offset', options: { offset: offsetFromPointer } },
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
                                    isSwitchingSide && styles.switchingSideCard,
                                ]}
                            >
                                {orgUnit && (
                                    <HoverCard
                                        title={
                                            orgUnit.short_name ?? orgUnit.name
                                        }
                                        subtitle={orgUnit.parent_name}
                                        headerExtra={getHeaderExtra?.(orgUnit)}
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
        );
    },
);

MapHoverCard.displayName = 'MapHoverCard';
