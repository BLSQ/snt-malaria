import React, { FC, useCallback } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Box,
    MenuItem,
    Select,
    SelectChangeEvent,
    Tooltip,
    alpha,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../../messages';
import { MetricTypeCriterion } from '../../../types/scenarioRule';
import { compactInputStyles, operatorSymbolStyles } from './styles';

type Operator = MetricTypeCriterion['operator'];

export const EQUAL_OPERATOR: Operator = '==';

const operatorOptions: {
    value: Operator;
    symbol: string;
    label: typeof MESSAGES.operatorEqual;
}[] = [
    { value: '>=', symbol: '≥', label: MESSAGES.operatorGreaterThanOrEqual },
    { value: '>', symbol: '>', label: MESSAGES.operatorGreaterThan },
    { value: '<=', symbol: '≤', label: MESSAGES.operatorLessThanOrEqual },
    { value: '<', symbol: '<', label: MESSAGES.operatorLessThan },
    { value: EQUAL_OPERATOR, symbol: '=', label: MESSAGES.operatorEqual },
];

const getOperatorSymbol = (operator: string) =>
    operatorOptions.find(option => option.value === operator)?.symbol ??
    operator;

const SYMBOL_CLASS = 'operatorToken-symbol';
const HOVER_CHEVRON_CLASS = 'operatorToken-hoverChevron';
const HOVER_TURN_PROPERTY = '--operator-hover-turn';
const COUNTER_CLOCKWISE_OPERATORS: Operator[] = ['<', '<='];
const HOVER_SWAP_TRANSITION = 'opacity 200ms, transform 200ms';

const tokenStyles = {
    ...compactInputStyles,
    flex: `0 0 ${compactInputStyles.height}px`,
    width: compactInputStyles.height,
    borderRadius: 1,
    backgroundColor: 'primary.light',
    color: 'primary.main',
};

const styles = {
    selectableToken: {
        ...tokenStyles,
        cursor: 'pointer',
        transition: 'background-color 150ms',
        '&:hover, &.Mui-focused': {
            backgroundColor: theme => alpha(theme.palette.primary.main, 0.16),
        },
        '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
        },
        '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            border: 1,
            borderColor: 'error.main',
        },
        '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            height: '100%',
            minHeight: 0,
            p: '0 !important',
            cursor: 'pointer',
        },
        '& .MuiSelect-icon': {
            display: 'none',
        },
        [`&:hover .${SYMBOL_CLASS}`]: {
            opacity: 0,
            transform: `rotate(var(${HOVER_TURN_PROPERTY})) scale(0.5)`,
        },
        [`&:hover .${HOVER_CHEVRON_CLASS}`]: {
            opacity: 1,
            transform: 'none',
        },
    },
    fixedToken: {
        ...tokenStyles,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tokenSymbol: {
        ...operatorSymbolStyles,
        fontWeight: 'bold',
    },
    selectableTokenContent: {
        [HOVER_TURN_PROPERTY]: '90deg',
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterClockwiseTokenContent: {
        [HOVER_TURN_PROPERTY]: '-90deg',
    },
    selectableTokenSymbol: {
        transition: HOVER_SWAP_TRANSITION,
    },
    hoverChevron: {
        position: 'absolute',
        fontSize: 20,
        stroke: 'currentColor',
        strokeWidth: 0.75,
        opacity: 0,
        transform: `rotate(calc(-1 * var(${HOVER_TURN_PROPERTY}))) scale(0.5)`,
        transition: HOVER_SWAP_TRANSITION,
    },
    option: {
        gap: 1.5,
        typography: 'body2',
    },
    optionSymbol: {
        ...operatorSymbolStyles,
        width: 16,
        textAlign: 'center',
        fontWeight: 'medium',
    },
} satisfies SxStyles;

const OperatorTokenSymbol: FC<{ operator: string }> = ({ operator }) => (
    <Box component="span" sx={styles.tokenSymbol}>
        {getOperatorSymbol(operator)}
    </Box>
);

const SelectableOperatorToken: FC<{ operator: Operator }> = ({ operator }) => (
    <Box
        component="span"
        sx={[
            styles.selectableTokenContent,
            COUNTER_CLOCKWISE_OPERATORS.includes(operator) &&
                styles.counterClockwiseTokenContent,
        ]}
    >
        <Box
            component="span"
            className={SYMBOL_CLASS}
            sx={[styles.tokenSymbol, styles.selectableTokenSymbol]}
        >
            {getOperatorSymbol(operator)}
        </Box>
        <ExpandMoreIcon
            className={HOVER_CHEVRON_CLASS}
            sx={styles.hoverChevron}
        />
    </Box>
);

type Props = {
    value: Operator;
    onChange: (operator: Operator) => void;
    errors: string[];
    isEqualOnly?: boolean;
};

export const CriterionOperatorSelect: FC<Props> = ({
    value,
    onChange,
    errors,
    isEqualOnly = false,
}) => {
    const { formatMessage } = useSafeIntl();

    const handleChange = useCallback(
        (event: SelectChangeEvent<Operator>) =>
            onChange(event.target.value as Operator),
        [onChange],
    );

    const renderValue = useCallback(
        (operator: Operator) => <SelectableOperatorToken operator={operator} />,
        [],
    );

    if (isEqualOnly) {
        return (
            <Box sx={styles.fixedToken}>
                <OperatorTokenSymbol operator={EQUAL_OPERATOR} />
            </Box>
        );
    }

    return (
        <Tooltip title={errors.join(', ')}>
            <Select
                size="small"
                value={value}
                onChange={handleChange}
                error={errors.length > 0}
                sx={styles.selectableToken}
                renderValue={renderValue}
            >
                {operatorOptions.map(option => (
                    <MenuItem
                        key={option.value}
                        value={option.value}
                        sx={styles.option}
                    >
                        <Box component="span" sx={styles.optionSymbol}>
                            {option.symbol}
                        </Box>
                        {formatMessage(option.label)}
                    </MenuItem>
                ))}
            </Select>
        </Tooltip>
    );
};
