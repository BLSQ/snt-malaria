import React, { FC, useCallback, useMemo, useState } from 'react';
import { Box, Theme } from '@mui/material';

import L from 'leaflet';
import {
    GeoJSON,
    MapContainer,
    TileLayer,
    Tooltip,
    ZoomControl,
} from 'react-leaflet';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import { GeoJson } from 'Iaso/components/maps/types';
import tiles from 'Iaso/constants/mapTiles';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { Bounds } from 'Iaso/utils/map/mapUtils';

import {
    FitBounds,
    InvalidateOnResize,
} from '../../../../components/InvalidateOnResize';
import { mapTheme } from '../../../../constants/map-theme';
import { useGetMetricValues } from '../../hooks/useGetMetrics';
import {
    defaultZoomDelta,
    defaultZoomSnap,
    getStyleForShape,
    useGetOrgUnitMetric,
} from '../../libs/map-utils';
import { MetricType } from '../../types/metrics';
import { MapLegend } from '../MapLegend';
import { LayerSelect } from './LayerSelect';

const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        borderRadius: theme.spacing(2),
        marginBottom: theme.spacing(1),
        overflow: 'hidden',
        position: 'relative',
    }),
    layerSelectBox: (theme: Theme) => ({
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        zIndex: 500,
    }),
};

type Props = {
    orgUnits: OrgUnit[];
    initialDisplayedMetric: MetricType;
};
export const SideMap: FC<Props> = ({ orgUnits, initialDisplayedMetric }) => {
    // Map config
    const [currentTile] = useState<Tile>(tiles.osm);
    const boundsOptions: Record<string, any> = {
        padding: [-10, -10],
        maxZoom: currentTile.maxZoom,
    };
    const bounds: Bounds | undefined = useMemo(() => {
        const geoJsonFeatures = orgUnits
            .filter(orgUnit => orgUnit.geo_json)
            .map(orgUnit => orgUnit.geo_json);
        if (geoJsonFeatures.length === 0) return undefined;
        const shape = L.geoJSON(geoJsonFeatures);
        return shape.getBounds();
    }, [orgUnits]);

    // LayerSelect
    const [displayedMetric, setDisplayedMetric] = useState<MetricType>(
        initialDisplayedMetric,
    );
    const handleLayerChange = useCallback((metric: MetricType) => {
        setDisplayedMetric(metric);
    }, []);

    // Displaying selected metric on the map along with its legend
    const { data: displayedMetricValues } = useGetMetricValues({
        metricTypeId: displayedMetric?.id || null,
    });
    const getSelectedMetric = useGetOrgUnitMetric(displayedMetricValues);

    // Selecting an org unit on the map

    const getMapStyleForOrgUnit = useCallback(
        (orgUnitId: number) => {
            const selectedMetric = getSelectedMetric(orgUnitId);
            return getStyleForShape(
                selectedMetric?.value,
                displayedMetric?.legend_type,
                displayedMetric?.legend_config,
            );
        },
        [getSelectedMetric, displayedMetric],
    );

    return (
        <Box height="280px" sx={styles.mainBox}>
            <MapContainer
                id="side_map"
                doubleClickZoom
                scrollWheelZoom={false}
                maxZoom={currentTile.maxZoom}
                style={{
                    height: '100%',
                    backgroundColor: mapTheme.backgroundColor,
                }}
                center={[0, 0]}
                keyboard={false}
                bounds={bounds}
                boundsOptions={boundsOptions}
                zoomControl={false}
                zoomSnap={defaultZoomSnap}
                zoomDelta={defaultZoomDelta}
            >
                <InvalidateOnResize />
                <FitBounds
                    bounds={bounds}
                    boundsOptions={boundsOptions}
                />
                <ZoomControl position="bottomright" />
                <TileLayer url="" attribution="" />
                {orgUnits.map(orgUnit => (
                    <GeoJSON
                        key={orgUnit.id}
                        style={getMapStyleForOrgUnit(orgUnit.id)}
                        data={orgUnit.geo_json as unknown as GeoJson}
                    >
                        <Tooltip>
                            {getSelectedMetric(orgUnit.id)?.label}
                        </Tooltip>
                    </GeoJSON>
                ))}
                {displayedMetric && (
                    <MapLegend legendConfig={displayedMetric} />
                )}

                <Box sx={styles.layerSelectBox}>
                    <LayerSelect
                        initialSelection={initialDisplayedMetric}
                        onLayerChange={handleLayerChange}
                    />
                </Box>
            </MapContainer>
        </Box>
    );
};
