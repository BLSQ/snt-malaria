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
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { GetCoverage, Point, Rect, Side } from './computePlacement';
import { FloatingLayer, FloatingLayerHandle } from './FloatingLayer';
import {
    getHoverCardPlannedSize,
    HoverCard,
    HoverCardExpansion,
} from './HoverCard';

const HIDE_DELAY_MS = 50;
const COVERAGE_CELL_PX = 16;

let unpinPinnedCard: (() => void) | undefined;

export type MapHoverCardContent = {
    body?: ReactNode;
    headerExtra?: ReactNode;
};

export type MapHoverCardActions = {
    hint?: string;
    /** Runs on click, without pinning the card. */
    onClick?: () => void;
    /** Opens on click and pins the card until it is closed. */
    expansion?: HoverCardExpansion;
};

export type GetMapHoverCardContent = (orgUnit: OrgUnit) => MapHoverCardContent;

export type GetMapHoverCardActions = (orgUnit: OrgUnit) => MapHoverCardActions;

export type MapHover = { orgUnit: OrgUnit; point: Point };

export type MapHoverCardHandle = {
    update: (hover: MapHover | null) => void;
    click: (hover: MapHover) => void;
    unpin: () => void;
    /** Call when the map's shapes move on screen, e.g. on pan or zoom. */
    forgetCoverage: () => void;
};

type Props = {
    getContent: GetMapHoverCardContent;
    getActions?: GetMapHoverCardActions;
    onPinChange?: (orgUnitId: number | undefined) => void;
};

const isMapShapeAt = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    return (
        element instanceof SVGPathElement &&
        element.classList.contains('leaflet-interactive')
    );
};

const createMapShapeCoverage = () => {
    const shapeByCell = new Map<number, boolean>();
    const getCoverage: GetCoverage = (rect: Rect) => {
        let covered = 0;
        const firstColumn = Math.ceil(rect.left / COVERAGE_CELL_PX);
        const firstRow = Math.ceil(rect.top / COVERAGE_CELL_PX);
        for (
            let column = firstColumn;
            column * COVERAGE_CELL_PX < rect.right;
            column += 1
        ) {
            for (
                let row = firstRow;
                row * COVERAGE_CELL_PX < rect.bottom;
                row += 1
            ) {
                const key = column * 100_000 + row;
                let isShape = shapeByCell.get(key);
                if (isShape === undefined) {
                    isShape = isMapShapeAt(
                        column * COVERAGE_CELL_PX,
                        row * COVERAGE_CELL_PX,
                    );
                    shapeByCell.set(key, isShape);
                }
                if (isShape) {
                    covered += COVERAGE_CELL_PX * COVERAGE_CELL_PX;
                }
            }
        }
        return covered;
    };
    return { getCoverage, forget: () => shapeByCell.clear() };
};

export const MapHoverCard = forwardRef<MapHoverCardHandle, Props>(
    ({ getContent, getActions, onPinChange }, ref) => {
        const layerRef = useRef<FloatingLayerHandle>(null);
        const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
        const isPinnedRef = useRef(false);
        const [orgUnit, setOrgUnit] = useState<OrgUnit>();
        const [isPinned, setIsPinned] = useState(false);
        const [coverage] = useState(createMapShapeCoverage);

        const unpinRef = useRef<() => void>();
        const [unpinThisCard] = useState(() => () => unpinRef.current?.());

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

        const unpin = useCallback(() => {
            if (!isPinnedRef.current) return;
            setPinned(undefined);
            layerRef.current?.setAnchor(null);
        }, [setPinned]);
        unpinRef.current = unpin;

        const click = useCallback(
            (hover: MapHover) => {
                const actions = getActions?.(hover.orgUnit);
                if (actions?.expansion) {
                    clearTimeout(hideTimeoutRef.current);
                    const isRepin = isPinnedRef.current;
                    setOrgUnit(hover.orgUnit);
                    setPinned(hover.orgUnit);
                    if (isRepin) {
                        layerRef.current?.placeAt(hover.point);
                    } else {
                        layerRef.current?.setAnchor(hover.point);
                    }
                    return;
                }
                unpin();
                actions?.onClick?.();
            },
            [getActions, setPinned, unpin],
        );

        const update = useCallback((hover: MapHover | null) => {
            if (isPinnedRef.current) return;
            clearTimeout(hideTimeoutRef.current);
            if (!hover) {
                hideTimeoutRef.current = setTimeout(
                    () => layerRef.current?.setAnchor(null),
                    HIDE_DELAY_MS,
                );
                return;
            }
            setOrgUnit(hover.orgUnit);
            layerRef.current?.setAnchor(hover.point);
        }, []);

        useImperativeHandle(
            ref,
            () => ({ update, click, unpin, forgetCoverage: coverage.forget }),
            [update, click, unpin, coverage],
        );

        useEffect(() => {
            const handleViewportChange = () => {
                coverage.forget();
                unpin();
            };
            window.addEventListener('scroll', handleViewportChange, true);
            window.addEventListener('resize', handleViewportChange);
            return () => {
                window.removeEventListener(
                    'scroll',
                    handleViewportChange,
                    true,
                );
                window.removeEventListener('resize', handleViewportChange);
            };
        }, [coverage, unpin]);

        useEffect(
            () => () => {
                clearTimeout(hideTimeoutRef.current);
                if (unpinPinnedCard === unpinThisCard) {
                    unpinPinnedCard = undefined;
                }
            },
            [unpinThisCard],
        );

        useEffect(() => {
            if (!isPinned) return undefined;
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') unpin();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [isPinned, unpin]);

        const content = useMemo(
            () => orgUnit && getContent(orgUnit),
            [orgUnit, getContent],
        );
        const actions = useMemo(
            () => orgUnit && getActions?.(orgUnit),
            [orgUnit, getActions],
        );

        const renderCard = useCallback(
            (side: Side) =>
                orgUnit &&
                content && (
                    <HoverCard
                        title={orgUnit.short_name ?? orgUnit.name}
                        subtitle={orgUnit.parent_name}
                        headerExtra={content.headerExtra}
                        hint={actions?.hint}
                        expansion={actions?.expansion}
                        isExpanded={isPinned}
                        onClose={unpin}
                        side={side}
                    >
                        {content.body}
                    </HoverCard>
                ),
            [orgUnit, content, actions, isPinned, unpin],
        );

        return (
            <FloatingLayer
                ref={layerRef}
                getCoverage={coverage.getCoverage}
                getPlannedSize={getHoverCardPlannedSize}
                isPinned={isPinned}
            >
                {renderCard}
            </FloatingLayer>
        );
    },
);

MapHoverCard.displayName = 'MapHoverCard';
