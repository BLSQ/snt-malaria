import React, { FC, useCallback } from 'react';

import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { Map as SNTMap } from '../../../components/Map';
import { mapTheme } from '../../../constants/map-theme';
import {
    getMapStyleForOrgUnit,
    useGetOrgUnitMetric,
} from '../../planning/libs/map-utils';
import { MetricType, MetricValue } from '../types/metrics';

/** Just the fields the choropleth + legend need — a persisted `MetricType` is a
 *  superset, and the creation wizard can supply only these while its layer is
 *  still being built. */
export type MapLegendConfig = Pick<
    MetricType,
    'units' | 'unit_symbol' | 'legend_type' | 'legend_config'
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

    return (
        <SNTMap
            id={'data-layer-map'}
            border
            orgUnits={orgUnits}
            legendConfig={legendConfig}
            getOrgUnitMapMisc={getOrgUnitMapMisc}
        />
    );
};
