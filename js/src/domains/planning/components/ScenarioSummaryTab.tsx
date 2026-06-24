import React, { FC, ReactNode } from 'react';
import { Box, Card, CardHeader } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { PaperFullHeight } from '../../../components/styledComponents';
import { BudgetSummary } from './budgeting/BudgetSummary';
import { CostPerDistrictSummary } from './budgeting/CostPerDistrictSummary';
import { CostPerInterventionSummary } from './budgeting/CostPerInterventionSummary';
import { PrevalenceSummary } from './budgeting/PrevalenceSummary';

const styles = {
    // Fill the main column exactly; widgets flex inside with no page-level
    // scroll (overflow is handled inside chart bodies if needed).
    column: {
        flex: 1,
        width: '100%',
        // Override PaperFullHeight's viewport height; flex fills MainColumn.
        height: 0,
        minHeight: 0,
        maxHeight: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    headerCard: {
        mb: 1,
        flexShrink: 0,
    },
    // Equal py keeps the controls symmetric; minHeight 81px matches the other
    // tabs' content box so they don't jump when switching.
    header: {
        py: 2,
        minHeight: '81px',
    },
    // Two columns (1/3 + 2/3 wide); left split 50/50, right split 1/3 + 2/3.
    grid: {
        flex: 1,
        width: '100%',
        minHeight: 0,
        display: 'flex',
        gap: 1,
    },
    leftColumn: {
        flex: 4,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
    },
    rightColumn: {
        flex: 8,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
    },
    widget: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
    },
    widgetThird: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
    },
    widgetTwoThirds: {
        flex: 2,
        minHeight: 0,
        overflow: 'hidden',
    },
} satisfies SxStyles;

type Props = {
    header: ReactNode;
};

export const ScenarioSummaryTab: FC<Props> = ({ header }) => (
    <PaperFullHeight sx={styles.column}>
        <Card sx={styles.headerCard}>
            <CardHeader sx={styles.header} title={header} />
        </Card>
        <Box sx={styles.grid}>
            <Box sx={styles.leftColumn}>
                <Box sx={styles.widget}>
                    <BudgetSummary />
                </Box>
                <Box sx={styles.widget}>
                    <CostPerInterventionSummary />
                </Box>
            </Box>
            <Box sx={styles.rightColumn}>
                <Box sx={styles.widgetThird}>
                    <PrevalenceSummary />
                </Box>
                <Box sx={styles.widgetTwoThirds}>
                    <CostPerDistrictSummary />
                </Box>
            </Box>
        </Box>
    </PaperFullHeight>
);
