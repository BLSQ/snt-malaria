import React, { FC, useCallback, useMemo, useState } from 'react';
import { Box, useTheme, Button, styled, Theme } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import L from 'leaflet';
import {
    GeoJSON,
    MapContainer,
    Popup,
    TileLayer,
    ZoomControl,
} from 'react-leaflet';

import { useGetLegend } from 'Iaso/components/LegendBuilder/Legend';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import { GeoJson } from 'Iaso/components/maps/types';
import tiles from 'Iaso/constants/mapTiles';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { Bounds } from 'Iaso/utils/map/mapUtils';
import { MESSAGES } from '../messages';
import { MetricType, MetricValue, ScaleThreshold } from '../types/metrics';
import { MapLegend } from './MapLegend';
import { MapOrgUnitDetails } from './MapOrgUnitDetails';

const StyledButton = styled(Button)`
    background-color: white;
    color: ${({ theme }) => theme.palette.text.primary};
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 1000;
    border: 2px solid rgba(0, 0, 0, 0.2);
    &:hover {
        background-color: #f5f5f5;
        border: 2px solid rgba(0, 0, 0, 0.3);
    }
`;

const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        borderRadius: theme.spacing(2),
        overflow: 'hidden',
        position: 'relative',
    }),
};

type Props = {
    orgUnits?: OrgUnit[];
    toggleDrawer: () => void;
    displayedMetric: MetricType;
    displayedMetricValues?: MetricValue[];
    onAddOrgUnitToMix: (orgUnit: any) => void;
    selectedOrgUnits: OrgUnit[];
};

export const Map: FC<Props> = ({
    orgUnits,
    toggleDrawer,
    displayedMetric,
    displayedMetricValues,
    onAddOrgUnitToMix,
    selectedOrgUnits,
}) => {
    const [currentTile, setCurrentTile] = useState<Tile>(tiles.osm);
    const theme = useTheme();
    const { formatMessage } = useSafeIntl();
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
    const getLegend = useGetLegend(displayedMetric?.legend_threshold);
    const getLegendColor = useCallback(
        (value, _orgUnitId) => {
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
    const [selectedOrgUnit, setSelectedOrgUnit] = useState<OrgUnit | null>(
        null,
    );
    const onOrgUnitClick = (orgUnitId: number) => {
        const orgUnit = orgUnits?.find(ou => ou.id === orgUnitId);
        setSelectedOrgUnit(orgUnit || null);
    };
    const onClearOrgUnitSelection = () => {
        setSelectedOrgUnit(null);
    };

    return (
        <Box height="100%" sx={styles.mainBox}>
            <StyledButton
                variant="outlined"
                size="small"
                onClick={toggleDrawer}
            >
                {formatMessage(MESSAGES.layers)}
            </StyledButton>
            {orgUnits && (
                <>
                    <MapContainer
                        doubleClickZoom
                        scrollWheelZoom={false}
                        maxZoom={currentTile.maxZoom}
                        style={{ height: '100%', backgroundColor: '#546E7A' }}
                        center={[0, 0]}
                        keyboard={false}
                        bounds={bounds}
                        boundsOptions={boundsOptions}
                        zoomControl={false}
                    >
                        <ZoomControl position="bottomright" />
                        {/* <CustomTileLayer
                            currentTile={currentTile}
                            setCurrentTile={setCurrentTile}
                        /> */}
                        <TileLayer url="" attribution="" />
                        {orgUnits.map(orgUnit => (
                            <GeoJSON
                                key={orgUnit.id}
                                style={{
                                    color:
                                        orgUnit.id === selectedOrgUnit?.id
                                            ? theme.palette.primary.main
                                            : '#546E7A',
                                    fillColor: getLegendColor(
                                        getSelectedMetricValue(orgUnit.id),
                                        orgUnit.id,
                                    ),
                                    fillOpacity: 1,
                                    weight:
                                        orgUnit.id === selectedOrgUnit?.id
                                            ? 3
                                            : 1,
                                }}
                                data={orgUnit.geo_json as unknown as GeoJson}
                                eventHandlers={{
                                    click: () => onOrgUnitClick(orgUnit.id),
                                }}
                            >
                                {/* Temporary Popup, helpful during development */}
                                <Popup>
                                    <div>
                                        <h3>
                                            Org Unit: {orgUnit.name}{' '}
                                            {orgUnit.id}
                                        </h3>
                                        <p>
                                            {getSelectedMetricValue(orgUnit.id)}
                                        </p>
                                    </div>
                                </Popup>
                            </GeoJSON>
                        ))}
                        {displayedMetric && (
                            <MapLegend
                                title={displayedMetric.name}
                                threshold={displayedMetric.legend_threshold}
                            />
                        )}
                    </MapContainer>
                    {selectedOrgUnit && (
                        <MapOrgUnitDetails
                            selectedOrgUnit={selectedOrgUnit}
                            onAddToMix={onAddOrgUnitToMix}
                            onClear={onClearOrgUnitSelection}
                            selectedOrgUnits={selectedOrgUnits}
                        />
                    )}
                </>
            )}
        </Box>
    );
};
