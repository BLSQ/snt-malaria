import React, { FC, ReactElement, ReactNode } from 'react';
import { Box, Card } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { CardStyled } from '../../../components/CardStyled';
import { PaperFullHeight } from '../../../components/styledComponents';
import { usePlanningContext } from '../contexts/PlanningContext';
import { ScenarioRule } from '../types/scenarioRule';
import { BudgetTable } from './budgeting/BudgetTable';
import { ScenarioComparisonTab } from './comparisonTab/ScenarioComparisonTab';
import { InterventionPlanMap } from './interventionPlanMap/InterventionPlanMap';
import { ScenarioSummaryTab } from './ScenarioSummaryTab';

const styles = {
    card: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    overridesScroll: {
        position: 'absolute',
        inset: 0,
        overflow: 'auto',
        px: 2,
        pb: 2,
    },
} satisfies SxStyles;

type Props = {
    renderHeader: (tabActions?: ReactNode) => ReactElement;
    matchedOrgUnitIds: number[];
    previewRule?: Partial<ScenarioRule>;
    isBudgetLoaded: boolean;
};

export const PlanningMainColumn: FC<Props> = ({
    renderHeader,
    matchedOrgUnitIds,
    previewRule,
    isBudgetLoaded,
}) => {
    const { activeTab, setOverridesTabContainer } = usePlanningContext();

    if (activeTab === 'summary') {
        return <ScenarioSummaryTab header={renderHeader()} />;
    }
    if (activeTab === 'comparison') {
        return <ScenarioComparisonTab header={renderHeader} />;
    }
    return (
        <PaperFullHeight>
            <Card sx={styles.card}>
                <CardStyled
                    header={renderHeader()}
                    flushContent={activeTab === 'overrides'}
                >
                    {activeTab === 'map' && (
                        <InterventionPlanMap
                            matchedOrgUnitIds={matchedOrgUnitIds}
                            previewRule={previewRule}
                        />
                    )}
                    {activeTab === 'overrides' && (
                        <Box
                            ref={setOverridesTabContainer}
                            sx={styles.overridesScroll}
                        />
                    )}
                    {activeTab === 'budget' && isBudgetLoaded && (
                        <BudgetTable />
                    )}
                </CardStyled>
            </Card>
        </PaperFullHeight>
    );
};
