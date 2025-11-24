import React, { FC, useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { Map } from '../../../../components/Map';
import { formatBigNumber } from '../../libs/cost-utils';
import { defaultLegend, getColorForShape } from '../../libs/map-utils';
import { BudgetOrgUnit } from '../../types/budget';

const styles: SxStyles = {
    mainBox: {
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
    },
};

// TODO Move this to utils, along with other fixed colors
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
            return {
                color: fillColor as string,
                label: formatBigNumber(ouc.total_cost),
            };
        },
        [orgUnitCosts, legendConfig],
    );

    return (
        <Box height="100%" width="100%" sx={styles.mainBox}>
            <Map
                id="org_unit_cost_map"
                orgUnits={orgUnits}
                getOrgUnitMapMisc={getOrgUnitMapMisc}
                legendConfig={legendConfig}
            />
        </Box>
    );
};
