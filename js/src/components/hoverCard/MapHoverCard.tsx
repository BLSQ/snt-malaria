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
import { HoverCard } from './HoverCard';

const HIDE_DELAY_MS = 50;
const COVERAGE_CELL_PX = 16;

export type MapHoverCardContent = {
    body?: ReactNode;
    headerExtra?: ReactNode;
    hint?: string;
};

export type MapHover = { orgUnit: OrgUnit; point: Point };

export type MapHoverCardHandle = {
    update: (hover: MapHover | null) => void;
    /** Call when the map's shapes move on screen, e.g. on pan or zoom. */
    forgetCoverage: () => void;
};

type Props = {
    getContent: (orgUnit: OrgUnit) => MapHoverCardContent;
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
    ({ getContent }, ref) => {
        const layerRef = useRef<FloatingLayerHandle>(null);
        const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
        const [orgUnit, setOrgUnit] = useState<OrgUnit>();
        const [coverage] = useState(createMapShapeCoverage);

        const update = useCallback((hover: MapHover | null) => {
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
            () => ({ update, forgetCoverage: coverage.forget }),
            [update, coverage],
        );

        useEffect(() => {
            window.addEventListener('scroll', coverage.forget, true);
            window.addEventListener('resize', coverage.forget);
            return () => {
                window.removeEventListener('scroll', coverage.forget, true);
                window.removeEventListener('resize', coverage.forget);
                clearTimeout(hideTimeoutRef.current);
            };
        }, [coverage]);

        const content = useMemo(
            () => orgUnit && getContent(orgUnit),
            [orgUnit, getContent],
        );

        const renderCard = useCallback(
            (side: Side) =>
                orgUnit &&
                content && (
                    <HoverCard
                        title={orgUnit.short_name ?? orgUnit.name}
                        subtitle={orgUnit.parent_name}
                        headerExtra={content.headerExtra}
                        hint={content.hint}
                        side={side}
                    >
                        {content.body}
                    </HoverCard>
                ),
            [orgUnit, content],
        );

        return (
            <FloatingLayer ref={layerRef} getCoverage={coverage.getCoverage}>
                {renderCard}
            </FloatingLayer>
        );
    },
);

MapHoverCard.displayName = 'MapHoverCard';
