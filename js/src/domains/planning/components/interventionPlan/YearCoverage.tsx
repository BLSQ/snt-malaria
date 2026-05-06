import React, { FC } from 'react';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { Box, IconButton, Collapse, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';
import { BudgetAssumptions } from '../../types/interventions';

type Props = {
    year: number;
    budgetAssumptions: BudgetAssumptions;
    disabled?: boolean;
    setCoverage: (year: number, coverage: number) => void;
};

const styles = {
    yearCoverageWrapper: {},
    inputRow: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignContent: 'center',
        gap: 2,
        marginBottom: 2,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 1,
    },
    content: {
        py: 1,
    },
    labelWrapper: {
        display: 'flex',
        alignItems: 'center',
    },
} satisfies SxStyles;

const percentageNumberOptions = {
    suffix: '%',
    decimalScale: 0,
};

export const YearCoverage: FC<Props> = ({
    year,
    budgetAssumptions,
    disabled,
    setCoverage,
}) => {
    const { formatMessage } = useSafeIntl();
    const [isCollapsed, setIsCollapsed] = React.useState(true);

    const toggleCollapse = () => {
        setIsCollapsed(prev => !prev);
    };

    const handleCoverageChange = (value: number) => {
        if (value >= 0 && value <= 100) {
            setCoverage(year, value);
        } else if (value < 0) {
            setCoverage(year, 0);
        } else if (value > 100) {
            setCoverage(year, 100);
        }
    };

    return (
        <Box sx={styles.yearCoverageWrapper}>
            <Box sx={styles.header}>
                <Typography variant="subtitle2">{year}</Typography>
                <IconButton onClick={toggleCollapse}>
                    {isCollapsed ? <ExpandMore /> : <ExpandLess />}
                </IconButton>
            </Box>
            <Collapse in={!isCollapsed}>
                <Box sx={styles.content}>
                    <Box sx={styles.inputRow}>
                        <Box sx={styles.labelWrapper}>
                            <Typography variant="body2" color="textSecondary">
                                {formatMessage(
                                    MESSAGES.budgetAssumptionsCoverage,
                                )}
                            </Typography>
                        </Box>
                        <InputComponent
                            type="number"
                            keyValue="coverage"
                            withMarginTop={false}
                            value={budgetAssumptions?.coverage ?? 0}
                            onChange={(_, value) => handleCoverageChange(value)}
                            labelString={''}
                            numberInputOptions={percentageNumberOptions}
                            disabled={disabled}
                        />
                    </Box>
                </Box>
            </Collapse>
        </Box>
    );
};
