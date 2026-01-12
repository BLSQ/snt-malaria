import React, { FC, useMemo, useState } from 'react';
import L from 'leaflet';
import {
    MapContainer,
    ZoomControl,
    Tooltip as LeafletTooltip,
    GeoJSON,
} from 'react-leaflet';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import { GeoJson } from 'Iaso/components/maps/types';
import tiles from 'Iaso/constants/mapTiles';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { noOp } from 'Iaso/utils';
import { Bounds } from 'Iaso/utils/map/mapUtils';
import { mapTheme } from '../constants/map-theme';
import { MapLegend } from '../domains/planning/components/MapLegend';
import {
    defaultZoomDelta,
    defaultZoomSnap,
} from '../domains/planning/libs/map-utils';

type Props = {
    id: string;
    orgUnits: OrgUnit[];
    getOrgUnitMapMisc: (orgUnitId: number) => {
        label: string | undefined;
        color: string | undefined;
    };
    legendConfig?: {
        units: string;
        legend_type: string; //'linear' | 'ordinal' | 'threshold';
        legend_config: {
            domain: number[] | string[];
            range: string[];
        };
        unit_symbol: string;
    };
    hideLegend?: boolean;
    defaultColor?: string;
    selectedOrgUnits?: number[];
    onOrgUnitClick?: (orgUnitId: number) => void;
};
export const Map: FC<Props> = ({
    id,
    orgUnits,
    getOrgUnitMapMisc,
    legendConfig,
    hideLegend = false,
    defaultColor = 'var(--deepPurple-300, #9575CD)',
    selectedOrgUnits = [],
    onOrgUnitClick = noOp,
}) => {
    const [currentTile] = useState<Tile>(tiles.osm);

    const boundsOptions: Record<string, any> = {
        padding: [-10, -10],
        maxZoom: currentTile.maxZoom,
    };

    const bounds: Bounds | undefined = useMemo(() => {
        const geoJsonFeatures = orgUnits
            ?.filter(orgUnit => orgUnit?.geo_json)
            .map(orgUnit => orgUnit?.geo_json);
        if (geoJsonFeatures?.length === 0) return undefined;
        const shape = L.geoJSON(geoJsonFeatures);
        return shape.getBounds();
    }, [orgUnits]);

    return (
        <MapContainer
            id={id}
            doubleClickZoom
            scrollWheelZoom={false}
            maxZoom={currentTile.maxZoom}
            style={{
                height: '100%',
                width: '100%',
                backgroundColor: mapTheme.backgroundColor,
            }}
            center={[0, 0]}
            keyboard={false}
            zoomControl={false}
            boundsOptions={boundsOptions}
            bounds={bounds}
            zoomSnap={defaultZoomSnap}
            zoomDelta={defaultZoomDelta}
        >
            <ZoomControl position="bottomright" />
            {orgUnits?.map(orgUnit => {
                const orgUnitMapMisc = getOrgUnitMapMisc(orgUnit.id);
                const weight = selectedOrgUnits.includes(orgUnit.id)
                    ? mapTheme.selectedShapeWeight
                    : mapTheme.shapeWeight;
                return (
                    <GeoJSON
                        key={orgUnit.id}
                        data={orgUnit.geo_json as unknown as GeoJson}
                        style={{
                            color: 'var(--text-primary,#1F2B3DDE)',
                            weight: weight,
                            fillColor: orgUnitMapMisc?.color ?? defaultColor,
                            fillOpacity: 2,
                        }}
                        eventHandlers={{
                            click: () => onOrgUnitClick(orgUnit.id),
                        }}
                    >
                        <LeafletTooltip>
                            <b>{orgUnit.short_name}</b>
                            {orgUnitMapMisc.label && (
                                <>
                                    <br />
                                    {orgUnitMapMisc.label}
                                </>
                            )}
                        </LeafletTooltip>
                    </GeoJSON>
                );
            })}
            {legendConfig && !hideLegend && (
                <MapLegend legendConfig={legendConfig} />
            )}
        </MapContainer>
    );
};
