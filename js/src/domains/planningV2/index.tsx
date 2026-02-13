import React, { FC } from 'react';
import { Grid } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { useParamsObject } from 'Iaso/routing/hooks/useParamsObject';
import {
    PaperFullHeight,
    PageContainer,
} from '../../components/styledComponents';

import { baseUrls } from '../../constants/urls';
import { MESSAGES } from '../messages';
import { ScenarioTopBar } from '../planning/components/ScenarioTopBar';
import { useGetInterventionCategories } from '../planning/hooks/useGetInterventionCategories';
import { useGetMetricCategories } from '../planning/hooks/useGetMetrics';
import { useGetScenario } from '../scenarios/hooks/useGetScenarios';
import { ScenarioRulesContainer } from './components/scenarioRule/ScenarioRulesContainer';
import { ScenarioRule } from './types/scenarioRule';

type PlanningParams = {
    scenarioId: number;
};

const scenarioRules: ScenarioRule[] = [
    {
        id: 1,
        name: 'Rule 1',
        priority: 1,
        matching_criterion: {},
        org_unit_scope: [] as number[],
        color: '#ff0000',
        org_units_excluded: [] as number[],
        org_units_included: [] as number[],
        interventions: [] as number[],
    },
];

export const PlanningV2: FC = () => {
    const params = useParamsObject(
        baseUrls.planning,
    ) as unknown as PlanningParams;
    const { data: scenario } = useGetScenario(params.scenarioId);
    const { formatMessage } = useSafeIntl();

    const { data: metricTypeCategories } = useGetMetricCategories();
    const { data: interventionCategories } = useGetInterventionCategories();

    return metricTypeCategories && interventionCategories ? (
        <>
            <TopBar title={formatMessage(MESSAGES.title)} disableShadow />
            <PageContainer>
                {scenario && <ScenarioTopBar scenario={scenario} />}
                <Grid container spacing={1}>
                    <Grid item xs={12} md={4}>
                        <PaperFullHeight>
                            <ScenarioRulesContainer
                                onApplyRules={() => {}}
                                rules={scenarioRules}
                                metricTypeCategories={metricTypeCategories}
                                interventionCategories={interventionCategories}
                            />
                        </PaperFullHeight>
                    </Grid>
                </Grid>
            </PageContainer>
        </>
    ) : null;
};
