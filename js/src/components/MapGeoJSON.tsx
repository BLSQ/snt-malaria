import React, { FC, memo, useEffect, useMemo, useRef, useState } from 'react';
import L, { LeafletMouseEvent } from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import { GeoJson } from 'Iaso/components/maps/types';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { mapTheme } from '../constants/map-theme';
import { MapHover } from './hoverCard/MapHoverCard';

const defaultOutline = {
    color: mapTheme.borderColor,
    weight: mapTheme.shapeWeight,
    opacity: 1,
};

const pinnedOutline = {
    color: mapTheme.selectedShapeColor,
    weight: mapTheme.selectedShapeWeight,
    opacity: mapTheme.pinnedShapeOpacity,
};

type Props = {
    dataKey?: string;
    orgUnit: OrgUnit;
    fillColor: string;
    /** Undefined when no selection is active. */
    isSelected?: boolean;
    isPinned?: boolean;
    onOrgUnitClick: (hover: MapHover) => void;
    onOrgUnitHover?: (hover: MapHover | null) => void;
    hasClickAction?: (orgUnit: OrgUnit) => boolean;
};

const MapGeoJSONComponent: FC<Props> = ({
    dataKey,
    orgUnit,
    fillColor,
    isSelected,
    isPinned = false,
    onOrgUnitClick,
    onOrgUnitHover,
    hasClickAction,
}) => {
    const layerRef = useRef<L.GeoJSON>(null);
    const [isHovered, setIsHovered] = useState(false);
    const isHoverFilled = isHovered && Boolean(hasClickAction?.(orgUnit));

    const style = useMemo(() => {
        const fillOpacity =
            isSelected === false
                ? mapTheme.paleFillOpacity
                : mapTheme.fillOpacity;
        return {
            ...(isPinned ? pinnedOutline : defaultOutline),
            fillColor,
            fillOpacity: isHoverFilled
                ? Math.min(1, fillOpacity + mapTheme.hoverFillOpacityStep)
                : fillOpacity,
        };
    }, [isPinned, fillColor, isSelected, isHoverFilled]);

    useEffect(() => {
        if (isPinned) {
            layerRef.current?.bringToFront();
        }
    }, [isPinned, dataKey]);

    const eventHandlers = useMemo(() => {
        const toHover = (event: LeafletMouseEvent): MapHover => ({
            orgUnit,
            point: {
                x: event.originalEvent.clientX,
                y: event.originalEvent.clientY,
            },
        });
        const handleHover = (event: LeafletMouseEvent) =>
            onOrgUnitHover?.(toHover(event));
        return {
            click: (event: LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(event);
                onOrgUnitClick(toHover(event));
            },
            mouseover: (event: LeafletMouseEvent) => {
                if (onOrgUnitHover) setIsHovered(true);
                handleHover(event);
            },
            mousemove: handleHover,
            mouseout: () => {
                setIsHovered(false);
                onOrgUnitHover?.(null);
            },
        };
    }, [orgUnit, onOrgUnitClick, onOrgUnitHover]);

    return (
        <GeoJSON
            ref={layerRef}
            key={dataKey ? `${orgUnit.id}-${dataKey}` : orgUnit.id}
            data={orgUnit.geo_json as unknown as GeoJson}
            style={style}
            eventHandlers={eventHandlers}
        />
    );
};

export const MapGeoJSON = memo(MapGeoJSONComponent);
