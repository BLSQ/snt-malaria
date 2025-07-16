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
import { mapTheme } from '../../../constants/map-theme';
import { getStyleForShape } from '../libs/map-utils';
import { MetricsFilters, MetricType, MetricValue } from '../types/metrics';
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
    orgUnitsOnMap: OrgUnit[];
    onAddRemoveOrgUnit: (orgUnit: any) => void;
    onApplyFilters: (filters: MetricsFilters) => void;
    onAddToMix: () => void;
    onChangeMetricLayer: (metricType) => void;
    onClearSelection: () => void;
};

export const Map: FC<Props> = ({
    orgUnits,
    displayedMetric,
    displayedMetricValues,
    orgUnitsOnMap,
    onAddRemoveOrgUnit,
    onApplyFilters,
    onAddToMix,
    onChangeMetricLayer,
    onClearSelection,
}) => {
    const [currentTile] = useState<Tile>(tiles.osm);
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
    const getSelectedMetricValue = useCallback(
        (orgUnitId: number) => {
            const metricValue = displayedMetricValues?.find(
                m => m.org_unit === orgUnitId,
            );
            return metricValue?.value ?? metricValue?.string_value;
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
    const onUnclickAndAddRemoveOrgUnit = orgUnit => {
        onClearOrgUnitSelection();
        onAddRemoveOrgUnit(orgUnit);
    };

    const orgUnitIdsOnMap = useMemo(
        () => orgUnitsOnMap.map(ou => ou.id),
        [orgUnitsOnMap],
    );

    const getMapStyleForOrgUnit = useCallback(
        (orgUnitId: number) => {
            const selectedMetricValue = getSelectedMetricValue(orgUnitId);
            return getStyleForShape(
                selectedMetricValue,
                displayedMetric?.legend_type,
                displayedMetric?.legend_config,
                orgUnitId === clickedOrgUnit?.id,
                orgUnitIdsOnMap.includes(orgUnitId),
            );
        },
        [
            getSelectedMetricValue,
            displayedMetric,
            clickedOrgUnit,
            orgUnitIdsOnMap,
        ],
    );

    return (
        <Box height="100%" sx={styles.mainBox}>
            <MapSelectionWidget
                selectionCount={orgUnitIdsOnMap.length}
                onApplyFilters={onApplyFilters}
                onAddToMix={onAddToMix}
                onClearSelection={onClearSelection}
            />
            {orgUnits && (
                <>
                    <MapContainer
                        id="main_map"
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
                    >
                        <ZoomControl position="bottomright" />
                        <TileLayer url="" attribution="" />
                        {orgUnits.map(orgUnit => (
                            <GeoJSON
                                key={orgUnit.id}
                                style={getMapStyleForOrgUnit(orgUnit.id)}
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
                            onAddRemoveOrgUnit={onUnclickAndAddRemoveOrgUnit}
                            onClear={onClearOrgUnitSelection}
                            selectedOrgUnits={orgUnitsOnMap}
                            highlightMetricType={displayedMetric}
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
