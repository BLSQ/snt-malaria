import React, { FC, useCallback, useMemo, useState } from 'react';
import { Box, Theme, Typography } from '@mui/material';

import L from 'leaflet';
import { GeoJSON, MapContainer, Tooltip, ZoomControl } from 'react-leaflet';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import { GeoJson } from 'Iaso/components/maps/types';
import tiles from 'Iaso/constants/mapTiles';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { Bounds } from 'Iaso/utils/map/mapUtils';
import { MapSelectionWidget } from '../../../components/MapSelectionWidget';
import { mapTheme } from '../../../constants/map-theme';
import {
    defaultZoomDelta,
    defaultZoomSnap,
    getStyleForShape,
    useGetOrgUnitMetric,
} from '../libs/map-utils';
import { MetricsFilters, MetricType, MetricValue } from '../types/metrics';
import { MapLegend } from './MapLegend';
import { MapOrgUnitDetails } from './MapOrgUnitDetails';
import { LayerSelect } from './maps/LayerSelect';

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
    mapSelectionWidgetBox: {
        position: 'absolute',
        top: 1,
        left: 1,
        zIndex: 500,
    },
};

type Props = {
    orgUnits?: OrgUnit[];
    disabled?: boolean;
    displayedMetric: MetricType | null;
    displayedMetricValues?: MetricValue[];
    orgUnitsOnMap: OrgUnit[];
    onAddRemoveOrgUnit: (orgUnit: any) => void;
    onApplyFilters: (filters: MetricsFilters) => void;
    onChangeMetricLayer: (metricType) => void;
    onClearSelection: () => void;
    onSelectAll: () => void;
    onInvertSelected: () => void;
};

export const Map: FC<Props> = ({
    orgUnits,
    disabled = false,
    displayedMetric,
    displayedMetricValues,
    orgUnitsOnMap,
    onAddRemoveOrgUnit,
    onApplyFilters,
    onChangeMetricLayer,
    onClearSelection,
    onSelectAll,
    onInvertSelected,
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
    const getSelectedMetric = useGetOrgUnitMetric(displayedMetricValues);

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
            const selectedMetric = getSelectedMetric(orgUnitId);
            return getStyleForShape(
                selectedMetric?.value,
                displayedMetric?.legend_type,
                displayedMetric?.legend_config,
                orgUnitId === clickedOrgUnit?.id,
                orgUnitIdsOnMap.includes(orgUnitId),
            );
        },
        [getSelectedMetric, displayedMetric, clickedOrgUnit, orgUnitIdsOnMap],
    );

    return (
        <Box height="100%" sx={styles.mainBox}>
            {!disabled && (
                <Box sx={styles.mapSelectionWidgetBox}>
                    <MapSelectionWidget
                        selectedOrgUnits={orgUnitIdsOnMap}
                        onApplyFilters={onApplyFilters}
                        onClearAll={onClearSelection}
                        onSelectAll={onSelectAll}
                        onInvertSelection={onInvertSelected}
                    />
                </Box>
            )}
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
                        zoomSnap={defaultZoomSnap}
                        zoomDelta={defaultZoomDelta}
                    >
                        <ZoomControl position="bottomright" />
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
                                    <Typography
                                        fontSize={12}
                                        sx={{
                                            fontWeight: 'bold',
                                            marginBottom: 0,
                                        }}
                                    >
                                        {orgUnit.name}
                                    </Typography>
                                    {getSelectedMetric(orgUnit.id)?.label ??
                                        'N/A'}
                                </Tooltip>
                            </GeoJSON>
                        ))}
                        {displayedMetric && (
                            <MapLegend legendConfig={displayedMetric} />
                        )}
                    </MapContainer>
                    {clickedOrgUnit && (
                        <MapOrgUnitDetails
                            clickedOrgUnit={clickedOrgUnit}
                            disabled={disabled}
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
