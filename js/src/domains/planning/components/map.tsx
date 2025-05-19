import React, { FC, useCallback, useMemo, useState } from 'react';
import { Box, useTheme, Theme } from '@mui/material';
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
import { MetricType, MetricValue } from '../types/metrics';
import { MapLegend } from './MapLegend';
import { MapOrgUnitDetails } from './MapOrgUnitDetails';
import { LayerSelect } from './maps/LayerSelect';
import { MapSelectionWidget } from './MapSelectionWidget';

const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        borderRadius: theme.spacing(2),
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
    orgUnits?: OrgUnit[];
    displayedMetric: MetricType | null;
    displayedMetricValues?: MetricValue[];
    selectedOrgUnits: OrgUnit[];
    onAddRemoveOrgUnitToMix: (orgUnit: any) => void;
    onChangeMetricLayer: (MetricType) => void;
    onClearSelection: () => void;
};

export const Map: FC<Props> = ({
    orgUnits,
    displayedMetric,
    displayedMetricValues,
    selectedOrgUnits,
    onAddRemoveOrgUnitToMix,
    onChangeMetricLayer,
    onClearSelection,
}) => {
    const [currentTile] = useState<Tile>(tiles.osm);
    const theme = useTheme();
    const boundsOptions: Record<string, any> = {
        padding: [10, 10],
        maxZoom: currentTile.maxZoom,
    };
    const bounds: Bounds | undefined = useMemo(() => {
        if (!orgUnits?.length) return undefined;
        const geoJsonFeatures = orgUnits
            .filter(orgUnit => orgUnit.geo_json)
            .map(orgUnit => orgUnit.geo_json);
        if (geoJsonFeatures.length === 0) return undefined;
        const shape = L.geoJSON(geoJsonFeatures);
        return shape.getBounds();
    }, [orgUnits]);

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
    const [clickedOrgUnit, setClickedOrgUnit] = useState<OrgUnit | null>(null);
    const onOrgUnitClick = (orgUnitId: number) => {
        const orgUnit = orgUnits?.find(ou => ou.id === orgUnitId);
        setClickedOrgUnit(orgUnit || null);
    };
    const onClearOrgUnitSelection = () => {
        setClickedOrgUnit(null);
    };
    const onUnclickAndAddRemoveOrgUnitToMix = orgUnit => {
        onClearOrgUnitSelection();
        onAddRemoveOrgUnitToMix(orgUnit);
    };

    const selectedOrgUnitIds = useMemo(
        () => selectedOrgUnits.map(ou => ou.id),
        [selectedOrgUnits],
    );

    const getStyleForShape = (orgUnitId: number) => {
        let color: string;
        let weight: number;

        if (orgUnitId === clickedOrgUnit?.id) {
            color = theme.palette.secondary.main;
            weight = 4;
        } else if (selectedOrgUnitIds.includes(orgUnitId)) {
            color = '#000000';
            weight = 3;
        } else {
            color = '#546E7A';
            weight = 1;
        }

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
        <Box height="100%" sx={styles.mainBox}>
            <MapSelectionWidget
                selectionCount={8}
                onAddToMix={() => console.log('onAddToMix')}
                onClearSelection={onClearSelection}
                onOpenQueryBuilderModal={() =>
                    console.log('onOpenQueryBuilderModal')
                }
            />
            {orgUnits && (
                <>
                    <MapContainer
                        id="main_map"
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
                                eventHandlers={{
                                    click: () => onOrgUnitClick(orgUnit.id),
                                }}
                            >
                                <Tooltip>
                                    {getSelectedMetricValue(orgUnit.id)}
                                </Tooltip>
                            </GeoJSON>
                        ))}
                        {displayedMetric && (
                            <MapLegend metric={displayedMetric} />
                        )}
                    </MapContainer>
                    {clickedOrgUnit && (
                        <MapOrgUnitDetails
                            clickedOrgUnit={clickedOrgUnit}
                            onAddRemoveOrgUnitToMix={
                                onUnclickAndAddRemoveOrgUnitToMix
                            }
                            onClear={onClearOrgUnitSelection}
                            selectedOrgUnits={selectedOrgUnits}
                        />
                    )}
                    <Box sx={styles.layerSelectBox}>
                        <LayerSelect
                            initialSelection={displayedMetric || ''}
                            onLayerChange={onChangeMetricLayer}
                        />
                    </Box>
                </>
            )}
        </Box>
    );
};
