import React, { FC, useCallback, useMemo, useState } from 'react';
import { MapOutlined } from '@mui/icons-material';
import { Box } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { Map as SNTMap } from '../../../../components/Map';
import { WidgetCard } from '../../../../components/WidgetCard';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { aggregateOrgUnitCosts } from '../../libs/budget-aggregation';
import { defaultLegend, severityColorRange } from '../../libs/color-utils';
import { formatBigNumber } from '../../libs/cost-utils';
import { getColorForShape } from '../../libs/map-utils';
import { BudgetOrgUnit } from '../../types/budget';

const styles = {
    mapBody: {
        flex: 1,
        minHeight: 0,
        width: '100%',
    },
} satisfies SxStyles;

export const CostPerDistrictSummary: FC = () => {
    const { formatMessage } = useSafeIntl();
    const { budgets, orgUnits } = usePlanningContext();
    const [selectedInterventionId, setSelectedInterventionId] =
        useState<number>(0);

    const orgUnitIds = useMemo(
        () => new Set(orgUnits.map(ou => ou.id)),
        [orgUnits],
    );

    const orgUnitCosts = useMemo(
        () => aggregateOrgUnitCosts(budgets, orgUnitIds),
        [budgets, orgUnitIds],
    );

    const getActiveCost = useCallback(
        (orgUnitCost: BudgetOrgUnit) =>
            selectedInterventionId && selectedInterventionId !== 0
                ? (orgUnitCost.interventions.find(
                      i => i.id === selectedInterventionId,
                  )?.total_cost ?? 0)
                : orgUnitCost.total_cost,
        [selectedInterventionId],
    );

    const legendConfig = useMemo(() => {
        const costs = orgUnitCosts.map(ouc => getActiveCost(ouc));
        const maxCost = costs.length > 0 ? Math.max(...costs) : 0;
        const stepSize = maxCost / 6;
        return {
            units: '',
            legend_type: 'threshold',
            legend_config: {
                range: severityColorRange,
                domain: Array.from({ length: 5 }, (_, i) => (i + 1) * stepSize),
            },
            unit_symbol: '',
        };
    }, [orgUnitCosts, getActiveCost]);

    const getOrgUnitMapMisc = useCallback(
        (orgUnitId: number) => {
            const emptyOU = { color: defaultLegend, label: '0' };
            const ouc = orgUnitCosts.find(c => c.org_unit_id === orgUnitId);
            if (!ouc || ouc.total_cost <= 0) return emptyOU;
            const cost = getActiveCost(ouc);
            if (cost <= 0) return emptyOU;

            const fillColor = getColorForShape(
                cost,
                legendConfig.legend_type,
                legendConfig.legend_config,
            );
            return {
                color: fillColor as string,
                label: formatBigNumber(cost),
            };
        },
        [orgUnitCosts, legendConfig, getActiveCost],
    );

    const interventionOptions = useMemo(() => {
        const byId = new Map<number, string>();
        orgUnitCosts.forEach(ouc =>
            (ouc.interventions ?? []).forEach(intervention => {
                if (!byId.has(intervention.id)) {
                    byId.set(intervention.id, intervention.type);
                }
            }),
        );
        const options = Array.from(byId.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label));
        return [
            { value: 0, label: formatMessage(MESSAGES.allInterventions) },
            ...options,
        ];
    }, [orgUnitCosts, formatMessage]);

    return (
        <WidgetCard
            title={formatMessage(MESSAGES.costPerDistrictTitle)}
            icon={MapOutlined}
            dropdown={
                interventionOptions.length > 1
                    ? {
                          value: selectedInterventionId,
                          options: interventionOptions,
                          onChange: value =>
                              setSelectedInterventionId(Number(value) || 0),
                      }
                    : undefined
            }
            bodySx={{ display: 'flex', flexDirection: 'column' }}
        >
            <Box sx={styles.mapBody}>
                <SNTMap
                    id="cost_per_district_map"
                    border
                    orgUnits={orgUnits}
                    getOrgUnitMapMisc={getOrgUnitMapMisc}
                    legendConfig={legendConfig}
                    dataKey={String(selectedInterventionId)}
                />
            </Box>
        </WidgetCard>
    );
};
