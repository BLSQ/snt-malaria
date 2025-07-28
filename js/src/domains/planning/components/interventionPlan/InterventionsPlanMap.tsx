import React, {
    FunctionComponent,
    useCallback,
    useMemo,
    useState,
} from 'react';
import { Box, MenuItem, Select, Theme, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import L from 'leaflet';
import { MapContainer, GeoJSON, ZoomControl } from 'react-leaflet';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import { GeoJson } from 'Iaso/components/maps/types';
import tiles from 'Iaso/constants/mapTiles';
import { SxStyles } from 'Iaso/types/general';
import { Bounds } from 'Iaso/utils/map/mapUtils';
import { mapTheme } from '../../../../constants/map-theme';
import { useGetInterventionAssignments } from '../../hooks/UseGetInterventionAssignments';
import { useGetOrgUnits } from '../../hooks/useGetOrgUnits';
import { generateColorRange } from '../../libs/map-utils';
import { MESSAGES } from '../../messages';
import { Intervention, InterventionPlan } from '../../types/interventions';

const defaultLegend = {
    units: '',
    legend_type: 'ordinal', // 'linear' | 'ordinal' | 'threshold';
    legend_config: {
        domain: [],
        range: [],
    },
    unit_symbol: '',
};

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
        useGetInterventionAssignments(scenarioId);
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(0);

    // const [legend, setLegend] = useState<Record<string, string>>({});

    const getOrgUnitInterventions = (plans: InterventionPlan[]) => {
        return plans.reduce((acc, plan) => {
            plan.org_units.forEach(orgUnit => {
                let mapInterventions = acc.get(orgUnit.id);
                if (!mapInterventions) {
                    mapInterventions = [];
                }
                mapInterventions.push(plan.intervention);
                acc.set(orgUnit.id, mapInterventions);
            });
            return acc;
        }, new Map<number, Intervention[]>());
    };

    const orgUnitInterventionsMap = useMemo(() => {
        if (isLoadingPlans) return new Map<number, Intervention[]>();
        const orgUnitInterventions = getOrgUnitInterventions(
            interventionPlans ?? [],
        );
        // TODO Enrich data here, we want the color and maybe a key to the legend too.
        return orgUnitInterventions;
    }, [interventionPlans, isLoadingPlans]);

    const getSelectedOrgUnits = useCallback(
        (selectedId: number) => {
            if (!selectedId) {
                return [...orgUnitInterventionsMap.keys()];
            }

            const filteredOrgUnitIds = [...orgUnitInterventionsMap]
                .filter(([_key, value]) =>
                    value.some((v: { id: number }) => v.id === selectedId),
                )
                .map(([key, _value]) => key);

            return filteredOrgUnitIds;
        },
        [orgUnitInterventionsMap],
    );

    const handleSelectedPlanChange = event => {
        setSelectedPlanId(event.target.value ?? 0);
    };

    const highlightedOrgUnits = useMemo(() => {
        const selectedOrgUnits = getSelectedOrgUnits(selectedPlanId ?? 0);
        return selectedOrgUnits;
    }, [selectedPlanId, getSelectedOrgUnits]);

    // getLegendForInterventionPlans = generateColorRange => {
    //     return interventionPlans?.map(plan => ({
    //         id: plan.intervention.id,
    //         name: plan.intervention.name,
    //         color: 'var(--deepPurple-300, #9575CD)', // This should be dynamic based on the intervention.
    //     }));
    // };

    // We should also get org unit color based on the legend.
    // const getHighlightedOrgUnits = (
    //     interventionPlans: InterventionPlan[]
    // ) => {
    //     return interventionPlans.flatMap(plan =>
    //         plan.org_units.map(orgUnit => ({
    //             id: orgUnit.id,
    //             color: getOrgUnitColor(orgUnit.id),
    //         })),
    //     );
    // };

    // Need something to get the legend.
    // Need something to get highlightedOrgUnits.

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
                    backgroundColor: mapTheme.backgroundColor,
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
                    onChange={handleSelectedPlanChange}
                    displayEmpty
                    sx={styles.select}
                >
                    <MenuItem value={0}>
                        <Typography variant="body2">
                            {formatMessage(MESSAGES.allInterventions)}
                        </Typography>
                    </MenuItem>
                    {!isLoadingPlans &&
                        interventionPlans &&
                        interventionPlans.map(({ intervention }) => {
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
            {/* <MapLegend legendConfig={legendConfig} /> */}
        </Box>
    );
};
