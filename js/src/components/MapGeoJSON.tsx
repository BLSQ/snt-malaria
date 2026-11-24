import React, { FC } from 'react';
import { LeafletMouseEvent } from 'leaflet';
import { GeoJSON } from 'react-leaflet';
import { GeoJson } from 'Iaso/components/maps/types';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { mapTheme } from '../constants/map-theme';
import { MapHover } from './hoverCard/MapHoverCard';

type Props = {
    dataKey?: string;
    orgUnit: OrgUnit;
    orgUnitMapMisc: {
        label: string | number | undefined;
        color: string | undefined;
    };
    defaultColor: string;
    /** Undefined when no selection is active. */
    isSelected?: boolean;
    onOrgUnitClick: (orgUnitId: number) => void;
    onOrgUnitHover?: (hover: MapHover | null) => void;
};

export const MapGeoJSON: FC<Props> = ({
    dataKey,
    orgUnit,
    orgUnitMapMisc,
    defaultColor,
    isSelected,
    onOrgUnitClick,
    onOrgUnitHover,
}) => {
    const handleHover = (event: LeafletMouseEvent) =>
        onOrgUnitHover?.({
            orgUnit,
            point: {
                x: event.originalEvent.clientX,
                y: event.originalEvent.clientY,
            },
        });
    return (
        <GeoJSON
            key={dataKey ? `${orgUnit.id}-${dataKey}` : orgUnit.id}
            data={orgUnit.geo_json as unknown as GeoJson}
            style={{
                color: mapTheme.borderColor,
                weight: mapTheme.shapeWeight,
                fillColor: orgUnitMapMisc?.color ?? defaultColor,
                fillOpacity:
                    isSelected === false
                        ? mapTheme.paleFillOpacity
                        : mapTheme.fillOpacity,
            }}
            eventHandlers={{
                click: () => onOrgUnitClick(orgUnit.id),
                mouseover: handleHover,
                mousemove: handleHover,
                mouseout: () => onOrgUnitHover?.(null),
            }}
        />
    );
};
