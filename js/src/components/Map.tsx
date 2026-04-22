import React, { FC, useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import L from 'leaflet';
import { MapContainer, ZoomControl, Pane } from 'react-leaflet';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import tiles from 'Iaso/constants/mapTiles';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { noOp } from 'Iaso/utils';
import { Bounds, orderOrgUnitsByDepth } from 'Iaso/utils/map/mapUtils';
import { MapLegend } from '../components/MapLegend';
import { mapTheme } from '../constants/map-theme';
import {
    defaultZoomDelta,
    defaultZoomSnap,
} from '../domains/planning/libs/map-utils';
import { FitBounds } from './FitBounds';
import { InvalidateOnResize } from './InvalidateOnResize';
import { MapGeoJSON } from './MapGeoJSON';
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
        '& .leaflet-tooltip': {
            maxWidth: '300px !important',
            width: 'max-content',
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
        label: string | number | undefined;
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
    selectedOrgUnitIds?: number[];
    onOrgUnitClick?: (orgUnitId: number) => void;
    /** Optional key fragment appended to each GeoJSON key to force style refresh. */
    dataKey?: string;
    /** When true, adds rounded corners and a border around the map. */
    border?: boolean;
    /** When set, overrides the border color of selected org units (e.g. rule color perimeter). */
    selectedBorderColor?: string;
};
export const Map: FC<Props> = ({
    id,
    orgUnits,
    getOrgUnitMapMisc,
    legendConfig,
    hideLegend = false,
    defaultColor = 'var(--deepPurple-300, #9575CD)',
    selectedOrgUnitIds,
    onOrgUnitClick = noOp,
    dataKey,
    border = false,
    selectedBorderColor,
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

    // Only render the leaf org units (deepest depth level) to avoid stacking
    // semi-transparent shapes from multiple hierarchy levels on top of each
    // other, which compounds opacity and hides the tile layer.
    const leafOrgUnits = useMemo(() => {
        if (orderedOrgUnits.length === 0) return orderedOrgUnits;
        const maxDepth = orderedOrgUnits.reduce(
            (max, ou) => Math.max(max, ou.org_unit_type_depth ?? 0),
            0,
        );
        return orderedOrgUnits.filter(
            ou => (ou.org_unit_type_depth ?? 0) === maxDepth,
        );
    }, [orderedOrgUnits]);

    const bounds: Bounds | undefined = useMemo(() => {
        const geoJsonFeatures = leafOrgUnits
            ?.filter(orgUnit => orgUnit?.geo_json)
            .map(orgUnit => orgUnit?.geo_json);
        if (geoJsonFeatures?.length === 0) return undefined;
        const shape = L.geoJSON(geoJsonFeatures);
        return shape.getBounds();
    }, [leafOrgUnits]);

    const [pristineOrgUnits, setPristineOrgUnits] = useState<OrgUnit[]>([]);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<OrgUnit[]>([]);

    useEffect(() => {
        if (!selectedOrgUnitIds) {
            setPristineOrgUnits(leafOrgUnits);
            setSelectedOrgUnits([]);
            return;
        }

        const orgUnitsToSelect: OrgUnit[] = [];
        const unselectedOrgUnits: OrgUnit[] = [];
        leafOrgUnits.forEach(orgUnit => {
            if (selectedOrgUnitIds.includes(orgUnit.id)) {
                orgUnitsToSelect.push(orgUnit);
            } else {
                unselectedOrgUnits.push(orgUnit);
            }
        });

        setPristineOrgUnits(unselectedOrgUnits);
        setSelectedOrgUnits(orgUnitsToSelect);
    }, [leafOrgUnits, selectedOrgUnitIds]);

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
                <Pane name="root">
                    {pristineOrgUnits?.map(orgUnit => {
                        const orgUnitMapMisc = getOrgUnitMapMisc(orgUnit.id);
                        return (
                            <MapGeoJSON
                                key={orgUnit.id}
                                dataKey={dataKey}
                                orgUnit={orgUnit}
                                orgUnitMapMisc={orgUnitMapMisc}
                                color={mapTheme.borderColor}
                                weight={mapTheme.shapeWeight}
                                defaultColor={defaultColor}
                                onOrgUnitClick={onOrgUnitClick}
                                RenderTooltip={RenderTooltip}
                            />
                        );
                    })}
                </Pane>
                <Pane name="active" style={{ zIndex: 401 }}>
                    {selectedOrgUnits?.map(orgUnit => {
                        const orgUnitMapMisc = getOrgUnitMapMisc(orgUnit.id);
                        return (
                            <MapGeoJSON
                                key={orgUnit.id}
                                dataKey={dataKey}
                                orgUnit={orgUnit}
                                orgUnitMapMisc={orgUnitMapMisc}
                                color={
                                    selectedBorderColor ??
                                    mapTheme.selectedShapeColor
                                }
                                weight={mapTheme.selectedShapeWeight}
                                defaultColor={defaultColor}
                                onOrgUnitClick={onOrgUnitClick}
                                RenderTooltip={RenderTooltip}
                            />
                        );
                    })}
                </Pane>
                {legendConfig && !hideLegend && (
                    <MapLegend legendConfig={legendConfig} />
                )}
            </MapContainer>
        </Box>
    );
};
