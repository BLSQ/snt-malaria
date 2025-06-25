import React, { FunctionComponent, useMemo, useState } from 'react';
import { Box, MenuItem, Select, Theme, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import L from 'leaflet';
import { MapContainer, GeoJSON, ZoomControl } from 'react-leaflet';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import { GeoJson } from 'Iaso/components/maps/types';
import tiles from 'Iaso/constants/mapTiles';
import { SxStyles } from 'Iaso/types/general';
import { Bounds } from 'Iaso/utils/map/mapUtils';
import { useGetInterventionsPlan } from '../../hooks/UseGetInterventionsPlan';
import { useGetOrgUnits } from '../../hooks/useGetOrgUnits';
import { MESSAGES } from '../../messages';

type Props = {
    scenarioId: number | undefined;
};
const styles: SxStyles = {
    mainBox: (theme: Theme) => ({
        borderRadius: theme.spacing(2),
        marginBottom: theme.spacing(1),
        overflow: 'hidden',
        position: 'relative',
    }),
    select: (theme: Theme) => ({
        minWidth: 120,
        '& .MuiSelect-select': { padding: '8px 12px' },
        backgroundColor: 'white',
        borderRadius: theme.spacing(1),
        height: '32px',
        '& .MuiOutlinedInput-notchedOutline': {
            border: 0,
        },
    }),
    legendBox: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        height: '25px',
        width: '100px',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
    },
    legendShape: {
        backgroundColor: '#9575CD',
        height: '12px',
        width: '12px',
        marginRight: '8px',
        borderRadius: '2px',
    },
    selectBox: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 1000,
        backgroundColor: 'white',
        borderRadius: 2,
        border: 'none',
    },
};
export const InterventionsPlanMap: FunctionComponent<Props> = ({
    scenarioId,
}) => {
    const { formatMessage } = useSafeIntl();
    const { data: orgUnits } = useGetOrgUnits();
    const [currentTile] = useState<Tile>(tiles.osm);

    const boundsOptions: Record<string, any> = {
        padding: [-10, -10],
        maxZoom: currentTile.maxZoom,
    };
    const bounds: Bounds | undefined = useMemo(() => {
        const geoJsonFeatures = orgUnits
            ?.filter(orgUnit => orgUnit.geo_json)
            .map(orgUnit => orgUnit.geo_json);
        if (geoJsonFeatures?.length === 0) return undefined;
        const shape = L.geoJSON(geoJsonFeatures);
        return shape.getBounds();
    }, [orgUnits]);

    const { data: interventionPlans, isLoading: isLoadingPlans } =
        useGetInterventionsPlan(scenarioId);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(
        interventionPlans?.[0]?.id ?? null,
    );

    const [highlightedOrgUnits, setHighlightedOrgUnits] = useState<number[]>(
        interventionPlans?.[0]?.org_units?.map(org_unit => org_unit.id) ?? [],
    );
    const handleChange = event => {
        const selectedId = event.target.value;
        setSelectedPlanId(selectedId);
        const selectedPlan = interventionPlans?.filter(
            interventionPlan => interventionPlan.id === selectedId,
        )[0];

        setHighlightedOrgUnits(
            selectedPlan?.org_units.map(org_unit => org_unit.id) ?? [],
        );
    };
    return (
        <Box height="390px" width="100%" sx={styles.mainBox}>
            <MapContainer
                id="side_map"
                doubleClickZoom
                scrollWheelZoom={false}
                maxZoom={currentTile.maxZoom}
                style={{
                    height: '100%',
                    width: '100%',
                    backgroundColor: '#ECEFF1',
                }}
                center={[0, 0]}
                keyboard={false}
                zoomControl={false}
                boundsOptions={boundsOptions}
                bounds={bounds}
            >
                <ZoomControl
                    position="bottomright"
                    backgroundColor="#1F2B3DBF"
                />
                {orgUnits?.map(orgUnit => (
                    <GeoJSON
                        key={orgUnit.id}
                        data={orgUnit.geo_json as unknown as GeoJson}
                        style={{
                            color: 'var(--text-primary,#1F2B3DDE)',
                            weight: 1,
                            fillColor: highlightedOrgUnits.includes(orgUnit.id)
                                ? 'var(--deepPurple-300, #9575CD)'
                                : '#ECEFF1',
                            fillOpacity: 2,
                        }}
                    />
                ))}
            </MapContainer>
            <Box sx={styles.selectBox}>
                <Select
                    value={selectedPlanId}
                    onChange={handleChange}
                    displayEmpty
                    sx={styles.select}
                >
                    {!isLoadingPlans &&
                        interventionPlans &&
                        interventionPlans.map(intervention => {
                            return (
                                <MenuItem
                                    key={intervention.id}
                                    value={intervention.id}
                                >
                                    <Typography variant="body2">
                                        {intervention.name}
                                    </Typography>
                                </MenuItem>
                            );
                        })}
                </Select>
            </Box>
            <Box sx={styles.legendBox}>
                <Box sx={styles.legendShape} />
                <Typography variant="caption" sx={{ color: 'white' }}>
                    {`${highlightedOrgUnits.length} ${formatMessage(MESSAGES.orgUnitDistrict)}`}
                </Typography>
            </Box>
        </Box>
    );
};
