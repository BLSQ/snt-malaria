import React, { FC, ReactNode } from 'react';
import { Box, Card, CardHeader } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { PaperFullHeight } from '../../../components/styledComponents';
import { BudgetSummary } from './budgeting/BudgetSummary';
import { CommoditiesSummary } from './budgeting/CommoditiesSummary';
import { CostPerDistrictSummary } from './budgeting/CostPerDistrictSummary';
import { CostPerInterventionSummary } from './budgeting/CostPerInterventionSummary';
import { PrevalenceSummary } from './budgeting/PrevalenceSummary';

// Minimum widget heights so charts (ResponsiveContainer height="100%") get a
// concrete height now that the page scrolls instead of fitting the viewport.
const CHART_HEIGHT = 360;
const MAP_HEIGHT = 560;

const styles = {
    // Fill the main column; the header stays put while only the widgets below
    // scroll (see scrollArea).
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
    // Scrolls the widgets while the header card above stays fixed.
    scrollArea: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
    },
    // Equal py keeps the controls symmetric; minHeight 81px matches the other
    // tabs' content box so they don't jump when switching.
    header: {
        py: 2,
        minHeight: '81px',
    },
    // Two columns (1/3 + 2/3 wide). Default align-items (stretch) keeps both
    // columns the same height; minHeight fills at least the visible area.
    grid: {
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        gap: 1,
    },
    leftColumn: {
        flex: 4,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
    },
    // The right column never contributes intrinsic height (its content lives
    // in an absolutely positioned layer), so the grid height is driven only by
    // the viewport, the left column, and this explicit minimum.
    rightColumn: {
        flex: 8,
        minWidth: 0,
        position: 'relative',
        minHeight: CHART_HEIGHT + MAP_HEIGHT + 8,
    },
    rightColumnContent: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
    },
    // Growing widgets absorb the slack in their column so both columns always
    // end at the same height, whichever one is naturally taller.
    growChartWidget: {
        position: 'relative',
        flex: 1,
        minHeight: CHART_HEIGHT,
    },
    growMapWidget: {
        flex: 2,
        minHeight: MAP_HEIGHT,
    },
    // Pins the widget content to the box resolved by flex, so the chart's own
    // rendered height can never feed back into the column height.
    growWidgetContent: {
        position: 'absolute',
        inset: 0,
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
        <Box sx={styles.scrollArea}>
            <Box sx={styles.grid}>
                <Box sx={styles.leftColumn}>
                    <Box sx={styles.growChartWidget}>
                        <Box sx={styles.growWidgetContent}>
                            <BudgetSummary />
                        </Box>
                    </Box>
                    <CommoditiesSummary />
                    <Box sx={styles.growChartWidget}>
                        <Box sx={styles.growWidgetContent}>
                            <CostPerInterventionSummary />
                        </Box>
                    </Box>
                </Box>
                <Box sx={styles.rightColumn}>
                    <Box sx={styles.rightColumnContent}>
                        <Box sx={styles.growChartWidget}>
                            <PrevalenceSummary />
                        </Box>
                        <Box sx={styles.growMapWidget}>
                            <CostPerDistrictSummary />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    </PaperFullHeight>
);
