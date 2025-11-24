import React, { FC, useCallback, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import L from 'leaflet';
import {
    GeoJSON,
    MapContainer,
    Tooltip as LeafletTooltip,
    ZoomControl,
} from 'react-leaflet';
import { Tile } from 'Iaso/components/maps/tools/TilesSwitchControl';
import { GeoJson } from 'Iaso/components/maps/types';
import tiles from 'Iaso/constants/mapTiles';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { Bounds } from 'Iaso/utils/map/mapUtils';
import { mapTheme } from '../../../../constants/map-theme';
import { formatBigNumber } from '../../libs/cost-utils';
import {
    defaultZoomSnap,
    defaultZoomDelta,
    defaultLegend,
    getColorRange,
    getColorForShape,
} from '../../libs/map-utils';
import { BudgetOrgUnit } from '../../types/budget';
import { MapLegend } from '../MapLegend';

const styles: SxStyles = {
    mainBox: {
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
    },
};

// TODO Move this to utils, along with other fixed colors
const defaultColor = 'var(--deepPurple-300, #9575CD)';
const colorRange = [
    '#ACDF9B',
    '#6BD39D',
    '#F5F1A0',
    '#F2B16E',
    '#E4754F',
    '#A93A42',
];

type Props = {
    orgUnitCosts?: BudgetOrgUnit[];
    orgUnits: OrgUnit[];
};

export const OrgUnitCostMap: FC<Props> = ({ orgUnitCosts, orgUnits }) => {
    const [currentTile] = useState<Tile>(tiles.osm);
    // TODO: Move this to utils
    const boundsOptions: Record<string, any> = {
        padding: [-10, -10],
        maxZoom: currentTile.maxZoom,
    };
    // TODO: Move this to utils
    const bounds: Bounds | undefined = useMemo(() => {
        const geoJsonFeatures = orgUnits
            ?.filter(orgUnit => orgUnit?.geo_json)
            .map(orgUnit => orgUnit?.geo_json);
        if (geoJsonFeatures?.length === 0) return undefined;
        const shape = L.geoJSON(geoJsonFeatures);
        return shape.getBounds();
    }, [orgUnits]);

    const legendConfig = useMemo(() => {
        const costs = orgUnitCosts?.map(ouc => ouc.total_cost) ?? [];
        const maxCost = Math.max(...costs);
        const stepSize = maxCost / 6;
        const legend = {
            range: colorRange,
            domain: Array.from({ length: 5 }, (_, i) => (i + 1) * stepSize),
        };

        return {
            units: '',
            legend_type: 'threshold',
            legend_config: legend,
            unit_symbol: '',
        };
    }, [orgUnitCosts]);

    const getOrgUnitMapMisc = useCallback(
        orgUnitId => {
            const ouc = orgUnitCosts?.find(c => c.org_unit_id === orgUnitId);
            if (!ouc || ouc.total_cost <= 0) {
                return { color: defaultLegend, label: '0' };
            }

            const fillColor = getColorForShape(
                ouc.total_cost,
                legendConfig.legend_type,
                legendConfig.legend_config,
            );
            return { color: fillColor, label: formatBigNumber(ouc.total_cost) };
        },
        [orgUnitCosts, legendConfig],
    );

    return (
        <Box height="100%" width="100%" sx={styles.mainBox}>
            <MapContainer
                id="org_unit_cost_map"
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
                zoomSnap={defaultZoomSnap}
                zoomDelta={defaultZoomDelta}
            >
                <ZoomControl
                    position="bottomright"
                    backgroundColor="#1F2B3DBF"
                />
                {orgUnits?.map(orgUnit => {
                    const orgUnitMapMisc = getOrgUnitMapMisc(orgUnit.id);
                    return (
                        <GeoJSON
                            key={orgUnit.id}
                            data={orgUnit.geo_json as unknown as GeoJson}
                            style={{
                                color: 'var(--text-primary,#1F2B3DDE)',
                                weight: 1,
                                fillColor:
                                    orgUnitMapMisc?.color ?? defaultColor,
                                fillOpacity: 2,
                            }}
                        >
                            <LeafletTooltip>
                                <b>{orgUnit.short_name}</b>
                                {orgUnitMapMisc.label && (
                                    <>
                                        <br />
                                        {orgUnitMapMisc.label}
                                    </>
                                )}
                            </LeafletTooltip>
                        </GeoJSON>
                    );
                })}
                <MapLegend legendConfig={legendConfig} />
            </MapContainer>
        </Box>
    );
};
