import React, { FC, MouseEvent, ReactNode, useCallback } from 'react';
import {
    Box,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { IntlMessage, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { YearStepper } from '../../../../components/YearStepper';
import { MESSAGES } from '../../../messages';
import { CostLineValueField } from '../../libs/override-utils';
import { AssignmentDataControl } from './AssignmentDataControl';
import {
    AssignmentTableFilter,
    AssignmentTableMode,
} from './buildAssignmentTable';
import { compactToggleGroupStyles } from './controlStyles';

const DIVIDER_GUTTER = 16;

const styles = {
    root: {
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
    },
    dividerClip: {
        overflow: 'hidden',
        py: 1,
        my: -1,
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px 16px',
        minWidth: 0,
        ml: `-${DIVIDER_GUTTER + 1}px`,
    },
    leftGroup: {
        flex: '0 1 auto',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px 16px',
    },
    labelledControl: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    dividedControl: {
        flex: '0 0 auto',
        alignItems: 'flex-start',
        borderLeft: 1,
        borderLeftColor: 'divider',
        pl: `${DIVIDER_GUTTER}px`,
    },
    spacer: { flex: '1 1 0', minWidth: 0 },
    filterControl: {
        flex: '0 1 auto',
        minWidth: 0,
        pl: `${DIVIDER_GUTTER + 1}px`,
    },
    label: {
        display: 'block',
        lineHeight: '16px',
        fontWeight: 'medium',
        color: 'text.secondary',
    },
    toggle: compactToggleGroupStyles,
} satisfies SxStyles;

const FILTERS: { value: AssignmentTableFilter; message: IntlMessage }[] = [
    { value: 'all', message: MESSAGES.assignmentTableFilterAll },
    { value: 'deployed', message: MESSAGES.assignmentTableFilterDeployed },
    { value: 'overridden', message: MESSAGES.assignmentTableFilterOverridden },
];

const ControlLabel: FC<{ children: ReactNode }> = ({ children }) => (
    <Typography variant="caption" sx={styles.label}>
        {children}
    </Typography>
);

type Props = {
    mode: AssignmentTableMode;
    onModeChange: (mode: AssignmentTableMode) => void;
    field: CostLineValueField;
    onFieldChange: (field: CostLineValueField) => void;
    years: number[];
    year: number;
    onYearChange: (year: number) => void;
    filter: AssignmentTableFilter;
    onFilterChange: (filter: AssignmentTableFilter) => void;
};

export const AssignmentTableToolbar: FC<Props> = ({
    mode,
    onModeChange,
    field,
    onFieldChange,
    years,
    year,
    onYearChange,
    filter,
    onFilterChange,
}) => {
    const { formatMessage } = useSafeIntl();

    const handleFilterChange = useCallback(
        (_: MouseEvent, value: AssignmentTableFilter | null) =>
            value && onFilterChange(value),
        [onFilterChange],
    );

    return (
        <Box sx={styles.root}>
            <Box sx={styles.dividerClip}>
                <Box sx={styles.row}>
                    <Box sx={styles.leftGroup}>
                        <Box
                            sx={[styles.labelledControl, styles.dividedControl]}
                        >
                            <ControlLabel>
                                {formatMessage(MESSAGES.assignmentTableData)}
                            </ControlLabel>
                            <AssignmentDataControl
                                mode={mode}
                                onModeChange={onModeChange}
                                field={field}
                                onFieldChange={onFieldChange}
                            />
                        </Box>
                    </Box>
                    {years.length > 0 && (
                        <Box
                            sx={[styles.labelledControl, styles.dividedControl]}
                        >
                            <ControlLabel>
                                {formatMessage(MESSAGES.assignmentTableYear)}
                            </ControlLabel>
                            <YearStepper
                                years={years}
                                value={year}
                                onChange={onYearChange}
                            />
                        </Box>
                    )}
                    <Box sx={styles.spacer} />
                    <Box sx={[styles.labelledControl, styles.filterControl]}>
                        <ControlLabel>
                            {formatMessage(MESSAGES.assignmentTableShow)}
                        </ControlLabel>
                        <ToggleButtonGroup
                            value={filter}
                            size="small"
                            onChange={handleFilterChange}
                            exclusive
                            sx={styles.toggle}
                        >
                            {FILTERS.map(({ value, message }) => (
                                <ToggleButton key={value} value={value}>
                                    {formatMessage(message)}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};
