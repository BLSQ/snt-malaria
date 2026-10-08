import React, { FC, useCallback, useMemo } from 'react';
import { Tooltip, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { NumberInput, NumberInputVariant } from '../../../../../components/NumberInput';
import { overrideColors } from '../../../../../constants/overrideColors';
import { MESSAGES } from '../../../../messages';
import { CostLineValueField } from '../../../libs/override-utils';
import { overridesGridStyles } from './overridesGrid';

const styles = {
    includedQuantityCell: {
        backgroundColor: overrideColors.progressFill,
    },
    notApplicable: {
        pl: '7px',
        color: overrideColors.notApplicableText,
    },
} satisfies SxStyles;

const getVariant = (value: number | null | undefined): NumberInputVariant => {
    if (value === null || value === undefined) return 'default';
    return value === 0 ? 'zero' : 'overridden';
};

type ValueCellProps = {
    field: CostLineValueField;
    label: string;
    value: number | null;
    defaultValue: number | null;
    lineName: string;
    onCommit: (field: CostLineValueField, value: number | null) => void;
    maxDecimals: number;
    minDecimals?: number;
    max?: number;
    prefix?: string;
    suffix?: string;
    compact?: boolean;
};

export const OverrideValueCell: FC<ValueCellProps> = ({
    field,
    label,
    value,
    defaultValue,
    lineName,
    onCommit,
    prefix,
    suffix,
    ...inputProps
}) => {
    const { formatMessage } = useSafeIntl();
    const handleCommit = useCallback(
        (next: number | null) => onCommit(field, next),
        [field, onCommit],
    );
    const defaultDisplay = `${prefix ?? ''}${defaultValue ?? ''}${suffix ?? ''}`;
    const variant =
        field === 'coverage'
            ? getVariant(value)
            : value === null
              ? 'default'
              : 'overridden';
    return (
        <NumberInput
            value={value}
            onCommit={handleCommit}
            isNullable
            min={0}
            prefix={prefix}
            suffix={suffix}
            placeholder={defaultValue === null ? '' : String(defaultValue)}
            variant={variant}
            hint={formatMessage(
                value === null
                    ? MESSAGES.valueDefaultTooltip
                    : MESSAGES.valueSetTooltip,
                { label, value: defaultDisplay },
            )}
            ariaLabel={formatMessage(MESSAGES.overrideCellLabel, {
                line: lineName,
                field: label,
            })}
            sx={overridesGridStyles.cellInput}
            {...inputProps}
        />
    );
};

export const NotApplicableCell: FC = () => {
    const { formatMessage } = useSafeIntl();
    return (
        <Tooltip title={formatMessage(MESSAGES.notApplicableToFixed)}>
            <Typography variant="body2" sx={styles.notApplicable}>
                –
            </Typography>
        </Tooltip>
    );
};

type YearCellProps = {
    year: number;
    yearCoverage?: number;
    isDeployed: boolean;
    deployedCoverage: number;
    isQuantity: boolean;
    lineName: string;
    onChange: (year: number, coverage: number | null) => void;
};

const COVERAGE_HINTS = {
    set: MESSAGES.yearCoverageSet,
    deployed: MESSAGES.yearCoverageDeployed,
    notDeployed: MESSAGES.yearCoverageNotDeployed,
};

const QUANTITY_HINTS = {
    set: MESSAGES.yearQuantitySet,
    deployed: MESSAGES.yearQuantityDeployed,
    notDeployed: MESSAGES.yearQuantityNotDeployed,
};

export const CoverageYearCell: FC<YearCellProps> = ({
    year,
    yearCoverage,
    isDeployed,
    deployedCoverage,
    isQuantity,
    lineName,
    onChange,
}) => {
    const { formatMessage } = useSafeIntl();
    const handleCommit = useCallback(
        (coverage: number | null) => onChange(year, coverage),
        [onChange, year],
    );
    const fallback = isDeployed ? deployedCoverage : 0;
    const suffix = isQuantity ? undefined : '%';
    const messages = isQuantity ? QUANTITY_HINTS : COVERAGE_HINTS;
    let hint;
    if (yearCoverage !== undefined) {
        hint = formatMessage(messages.set, {
            year: String(year),
            value: `${fallback}${suffix ?? ''}`,
        });
    } else if (isDeployed) {
        hint = formatMessage(messages.deployed, {
            year: String(year),
            value: `${deployedCoverage}${suffix ?? ''}`,
        });
    } else {
        hint = formatMessage(messages.notDeployed, { year: String(year) });
    }
    const effectiveCoverage = yearCoverage ?? fallback;
    const isIncludedByDefault =
        isQuantity && yearCoverage === undefined && effectiveCoverage > 0;
    const cellSx = useMemo(
        () => [
            overridesGridStyles.cellInput,
            isIncludedByDefault && styles.includedQuantityCell,
        ],
        [isIncludedByDefault],
    );
    return (
        <NumberInput
            value={yearCoverage ?? null}
            onCommit={handleCommit}
            isNullable
            min={0}
            max={isQuantity ? undefined : 100}
            maxDecimals={2}
            suffix={suffix}
            placeholder={String(fallback)}
            progress={isQuantity ? undefined : effectiveCoverage}
            variant={getVariant(yearCoverage)}
            hint={hint}
            ariaLabel={formatMessage(MESSAGES.overrideCellLabel, {
                line: lineName,
                field: String(year),
            })}
            sx={cellSx}
        />
    );
};
