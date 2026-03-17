import React, { FC, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
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
import { SxStyles } from 'Iaso/types/general';
import { noOp } from 'Iaso/utils';
import { Bounds, orderOrgUnitsByDepth } from 'Iaso/utils/map/mapUtils';
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

const styles = {
    root: {
        height: '100%',
        width: '100%',
        backgroundColor: mapTheme.backgroundColor,
        '& .leaflet-control-zoom': {
            border: 'none',
            boxShadow: 'none',
            backgroundColor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: theme => theme.spacing(0.25),
            marginBottom: 1,
            marginRight: 1,
        },
        '& .leaflet-control-zoom a': {
            backgroundColor: theme => alpha(theme.palette.text.primary, 0.75),
            color: 'common.white',
            border: 'none',
            minWidth: theme => theme.spacing(3.5),
            minHeight: theme => theme.spacing(3.5),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme => `${theme.shape.borderRadius}px !important`,
            fontSize: theme => theme.typography.pxToRem(22),
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
    },
    bordered: {
        borderRadius: theme => `${theme.shape.borderRadius * 2}px`,
        overflow: 'hidden',
        border: theme => `1px solid ${theme.palette.divider}`,
    },
} satisfies SxStyles;

type Props = {
    id: string;
    orgUnits: OrgUnit[];
    getOrgUnitMapMisc: (orgUnitId: number) => {
        label: string | undefined;
        color: string | undefined;
    };
    RenderTooltip?: (props: { orgUnit: OrgUnit }) => React.ReactNode;
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
    RenderTooltip,
}) => {
    const [currentTile] = useState<Tile>(tiles.osm);

    const boundsOptions: Record<string, any> = {
        padding: [-10, -10],
        maxZoom: currentTile.maxZoom,
    };

    const orderedOrgUnits = useMemo(
        () => orderOrgUnitsByDepth(orgUnits || []),
        [orgUnits],
    );

    const bounds: Bounds | undefined = useMemo(() => {
        const geoJsonFeatures = orderedOrgUnits
            ?.filter(orgUnit => orgUnit?.geo_json)
            .map(orgUnit => orgUnit?.geo_json);
        if (geoJsonFeatures?.length === 0) return undefined;
        const shape = L.geoJSON(geoJsonFeatures);
        return shape.getBounds();
    }, [orderedOrgUnits]);

    return (
        <Box sx={border ? [styles.root, styles.bordered] : styles.root}>
            <MapContainer
                id={id}
                style={{
                    height: '100%',
                    width: '100%',
                }}
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
                {orderedOrgUnits?.map(orgUnit => {
                    const orgUnitMapMisc = getOrgUnitMapMisc(orgUnit.id);

                    let weight = mapTheme.shapeWeight;
                    let color = mapTheme.borderColor;
                    if (selectedOrgUnits.includes(orgUnit.id)) {
                        weight = mapTheme.selectedShapeWeight;
                        color = mapTheme.selectedShapeColor;
                    }
                    return (
                        <GeoJSON
                            key={
                                dataKey
                                    ? `${orgUnit.id}-${dataKey}`
                                    : orgUnit.id
                            }
                            data={orgUnit.geo_json as unknown as GeoJson}
                            style={{
                                color: color,
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
                                {RenderTooltip ? (
                                    RenderTooltip({ orgUnit })
                                ) : (
                                    <>
                                        <b>{orgUnit.short_name}</b>
                                        {orgUnitMapMisc.label && (
                                            <>
                                                <br />
                                                {orgUnitMapMisc.label}
                                            </>
                                        )}
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
        </Box>
    );
};
