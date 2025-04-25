import React, { FC, useCallback, useMemo, useState } from 'react';
import { Box, Theme, useTheme } from '@mui/material';
import * as d3 from 'd3-scale';

import { useGetLegend } from 'Iaso/components/LegendBuilder/Legend';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import { GeoJson } from 'Iaso/components/maps/types';
import tiles from 'Iaso/constants/mapTiles';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { Bounds } from 'Iaso/utils/map/mapUtils';
import L from 'leaflet';
import {
    GeoJSON,
    MapContainer,
    TileLayer,
    Tooltip,
    ZoomControl,
} from 'react-leaflet';
import { MetricType } from '../types/metrics';
import { useGetMetricValues } from '../hooks/useGetMetrics';
import { MapLegend } from './MapLegend';

const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        borderRadius: theme.spacing(2),
        marginBottom: theme.spacing(1),
        overflow: 'hidden',
        position: 'relative',
    }),
};

type Props = {
    orgUnits: OrgUnit[];
    displayedMetric: MetricType | null;
};
export const SideMap: FC<Props> = ({ orgUnits, displayedMetric }) => {
    const [currentTile, setCurrentTile] = useState<Tile>(tiles.osm);
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

    // Fetch metric values
    const { data: displayedMetricValues, isLoading } = useGetMetricValues({
        metricTypeId: displayedMetric?.id || null,
    });

    // Displaying metrics on the map
    const getLegend = useGetLegend(displayedMetric?.legend_config);
    const getColorForShape = useCallback(
        (value, _orgUnitId) => {
            if (displayedMetric?.legend_type === 'linear') {
                const legend = displayedMetric.legend_config;
                const colorScale = d3
                    .scaleLinear()
                    .domain(legend.domain)
                    .range(legend.range);
                return colorScale(value);
            }
            return getLegend(value);
        },
        [displayedMetric, displayedMetricValues, getLegend],
    );
    const getSelectedMetricValue = useCallback(
        (orgUnitId: number) => {
            const metricValue = displayedMetricValues?.find(
                m => m.org_unit === orgUnitId,
            );
            return metricValue?.value;
        },
        [displayedMetricValues],
    );

    // Selecting an org unit on the map

    const getStyleForShape = (orgUnitId: number) => {
        let color: string;
        let weight: number;

        color = '#546E7A';
        weight = 1;

        return {
            color,
            weight,
            fillColor: getColorForShape(
                getSelectedMetricValue(orgUnitId),
                orgUnitId,
            ),
            fillOpacity: 1,
        };
    };

    return (
        <Box height="250px" sx={styles.mainBox}>
            <MapContainer
                id="side_map"
                doubleClickZoom
                scrollWheelZoom={false}
                maxZoom={currentTile.maxZoom}
                style={{ height: '100%', backgroundColor: '#B0BEC5' }}
                center={[0, 0]}
                keyboard={false}
                bounds={bounds}
                boundsOptions={boundsOptions}
                zoomControl={false}
            >
                <ZoomControl position="bottomright" />
                <TileLayer url="" attribution="" />
                {orgUnits.map(orgUnit => (
                    <GeoJSON
                        key={orgUnit.id}
                        style={getStyleForShape(orgUnit.id)}
                        data={orgUnit.geo_json as unknown as GeoJson}
                    >
                        <Tooltip>{getSelectedMetricValue(orgUnit.id)}</Tooltip>
                    </GeoJSON>
                ))}
                {displayedMetric && <MapLegend metric={displayedMetric} />}
            </MapContainer>
        </Box>
    );
};
