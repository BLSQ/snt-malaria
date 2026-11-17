import React, { FC, useCallback } from 'react';

import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { HoverCardValue } from '../../../components/hoverCard/HoverCardValue';
import { Map as SNTMap } from '../../../components/Map';
import { mapTheme } from '../../../constants/map-theme';
import {
    getMapStyleForOrgUnit,
    useGetOrgUnitMetric,
} from '../../planning/libs/map-utils';
import { MetricType, MetricValue } from '../types/metrics';

export type MapLegendConfig = Pick<
    MetricType,
    'name' | 'units' | 'unit_symbol' | 'legend_type' | 'legend_config'
>;

type Props = {
    legendConfig?: MapLegendConfig;
    metricValues?: MetricValue[];
    orgUnits: OrgUnit[];
};

const defaultOrgUnitStyle = {
    label: '',
    color: mapTheme.shapeColor,
};

export const DataLayerMap: FC<Props> = ({
    legendConfig,
    metricValues,
    orgUnits,
}) => {
    const getSelectedMetric = useGetOrgUnitMetric(metricValues);

    const getOrgUnitMapMisc = useCallback(
        (orgUnitId: number) => {
            if (!legendConfig) {
                return defaultOrgUnitStyle;
            }
            return getMapStyleForOrgUnit(
                legendConfig,
                getSelectedMetric(orgUnitId),
            );
        },
        [getSelectedMetric, legendConfig],
    );

    const getTooltipContent = useCallback(
        (orgUnit: OrgUnit) => {
            if (!legendConfig) {
                return {};
            }
            const { color, label } = getOrgUnitMapMisc(orgUnit.id);
            return {
                body: (
                    <HoverCardValue
                        caption={legendConfig.name}
                        value={
                            getSelectedMetric(orgUnit.id) ? label : undefined
                        }
                        unitSymbol={legendConfig.unit_symbol}
                        color={color}
                    />
                ),
            };
        },
        [getSelectedMetric, getOrgUnitMapMisc, legendConfig],
    );

    return (
        <SNTMap
            id={'data-layer-map'}
            border
            orgUnits={orgUnits}
            legendConfig={legendConfig}
            getOrgUnitMapMisc={getOrgUnitMapMisc}
            getTooltipContent={getTooltipContent}
        />
    );
};
