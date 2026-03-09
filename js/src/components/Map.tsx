import React, { FC, useMemo, useState } from 'react';
import { alpha, styled } from '@mui/material/styles';
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
import { FitBounds } from './FitBounds';
import { InvalidateOnResize } from './InvalidateOnResize';
import { MapTypeLayer } from './MapTyleLayer';
import { ResetZoomControl } from './ResetZoomControl';

const StyledMapContainer = styled(MapContainer, {
    shouldForwardProp: prop => prop !== 'bordered',
})<{ bordered?: boolean }>(({ theme, bordered }) => ({
    height: '100%',
    width: '100%',
    backgroundColor: mapTheme.backgroundColor,
    ...(bordered && {
        borderRadius: theme.shape.borderRadius * 2,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
    }),
    '& .leaflet-control-zoom': {
        border: 'none',
        boxShadow: 'none',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(0.25),
        marginBottom: theme.spacing(1),
        marginRight: theme.spacing(1),
    },
    '& .leaflet-control-zoom a': {
        backgroundColor: alpha(theme.palette.text.primary, 0.75),
        color: theme.palette.common.white,
        border: 'none',
        minWidth: theme.spacing(3.5),
        minHeight: theme.spacing(3.5),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: `${theme.shape.borderRadius}px !important`,
        fontSize: theme.typography.pxToRem(22),
        lineHeight: '1 !important',
        textIndent: '0 !important',
        margin: 0,
        padding: 0,
    },
    '& .leaflet-control-zoom a span': {
        display: 'block',
        lineHeight: 0,
        transform: 'translateY(-2px)',
    },
    '& .leaflet-control-zoom-box': {
        display: 'none !important',
    },
    '& .leaflet-control-zoom-rect': {
        display: 'none !important',
    },
    '& .leaflet-control-zoom a img': {
        margin: '0 !important',
    },
    '& .leaflet-control-attribution': {
        display: 'none',
    },
}));

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
    /** Optional key fragment appended to each GeoJSON key to force style refresh. */
    dataKey?: string;
    /** When true, adds rounded corners and a border around the map. */
    border?: boolean;
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
    dataKey,
    border = false,
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
        <StyledMapContainer
            bordered={border}
            id={id}
            doubleClickZoom
            scrollWheelZoom={false}
            maxZoom={currentTile.maxZoom}
            center={[0, 0]}
            keyboard={false}
            zoomControl={false}
            boundsOptions={boundsOptions}
            bounds={bounds}
            zoomSnap={defaultZoomSnap}
            zoomDelta={defaultZoomDelta}
        >
            <MapTypeLayer />
            <InvalidateOnResize
                bounds={bounds}
                boundsOptions={boundsOptions}
            />
            <FitBounds bounds={bounds} boundsOptions={boundsOptions} />
            <ZoomControl position="bottomright" />
            <ResetZoomControl
                bounds={bounds}
                boundsOptions={boundsOptions}
            />
            {orgUnits?.map(orgUnit => {
                const orgUnitMapMisc = getOrgUnitMapMisc(orgUnit.id);
                const weight = selectedOrgUnits.includes(orgUnit.id)
                    ? mapTheme.selectedShapeWeight
                    : mapTheme.shapeWeight;
                return (
                    <GeoJSON
                        key={
                            dataKey
                                ? `${orgUnit.id}-${dataKey}`
                                : orgUnit.id
                        }
                        data={orgUnit.geo_json as unknown as GeoJson}
                        style={{
                            color: mapTheme.borderColor,
                            weight: weight,
                            fillColor:
                                orgUnitMapMisc?.color ?? defaultColor,
                            fillOpacity: mapTheme.fillOpacity,
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
        </StyledMapContainer>
    );
};
