import React, { FC, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../../../../constants/overrideColors';
import { MESSAGES } from '../../../messages';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { CostLineValueField } from '../../libs/override-utils';
import { ScenarioRule } from '../../types/scenarioRule';
import { AssignmentMatrix } from './AssignmentMatrix';
import { AssignmentTableFooter } from './AssignmentTableFooter';
import { getRuleDotSize } from './assignmentTableLayout';
import { AssignmentTableToolbar } from './AssignmentTableToolbar';
import {
    AssignmentTableFilter,
    AssignmentTableMode,
    filterAssignmentRows,
} from './buildAssignmentTable';
import { useAssignmentTableData } from './useAssignmentTableData';

const styles = {
    root: {
        position: 'absolute',
        inset: theme => theme.spacing(2),
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
    },
    frame: {
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
    },
    empty: {
        py: 4,
        px: 2,
        textAlign: 'center',
        color: 'text.secondary',
        border: `1px dashed ${overrideColors.inputBorder}`,
        borderRadius: 2,
    },
} satisfies SxStyles;

type Props = {
    matchedOrgUnitIds: number[];
    previewRule?: Partial<ScenarioRule>;
    scenarioRules: ScenarioRule[];
};

export const InterventionAssignmentTable: FC<Props> = ({
    matchedOrgUnitIds,
    previewRule,
    scenarioRules,
}) => {
    const { formatMessage } = useSafeIntl();
    const {
        isEditing: isRuleView,
        scenarioYears,
        currency,
    } = usePlanningContext();

    const [mode, setMode] = useState<AssignmentTableMode>('interventions');
    const [field, setField] = useState<CostLineValueField>('unit_cost');
    const [selectedYear, setSelectedYear] = useState<number | undefined>();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<AssignmentTableFilter>('all');

    const year =
        selectedYear !== undefined && scenarioYears.includes(selectedYear)
            ? selectedYear
            : scenarioYears[0];

    const { table, legendRules } = useAssignmentTableData({
        matchedOrgUnitIds,
        previewRule,
        scenarioRules,
        mode,
        field,
        year,
    });

    const visibleRows = useMemo(
        () => filterAssignmentRows(table.rows, filter, query),
        [table.rows, filter, query],
    );

    return (
        <Box sx={styles.root}>
            <AssignmentTableToolbar
                mode={mode}
                onModeChange={setMode}
                field={field}
                onFieldChange={setField}
                years={scenarioYears}
                year={year}
                onYearChange={setSelectedYear}
                filter={filter}
                onFilterChange={setFilter}
            />
            {table.groups.length === 0 ? (
                <Typography variant="body2" sx={styles.empty}>
                    {formatMessage(
                        isRuleView
                            ? MESSAGES.assignmentTableEmptyRule
                            : MESSAGES.assignmentTableEmptyScenario,
                    )}
                </Typography>
            ) : (
                <Box sx={styles.frame}>
                    <AssignmentMatrix
                        groups={table.groups}
                        rows={visibleRows}
                        mode={mode}
                        field={field}
                        year={year}
                        currency={currency}
                        isRuleView={isRuleView}
                        query={query}
                        onQueryChange={setQuery}
                    />
                    <AssignmentTableFooter
                        assignedCount={table.assignedCount}
                        totalCount={table.rows.length}
                        legendRules={legendRules}
                        isRuleView={isRuleView}
                        showDeployedLegend={mode === 'interventions'}
                        ruleDotSize={getRuleDotSize(mode)}
                    />
                </Box>
            )}
        </Box>
    );
};
