import React, { FC } from 'react';
import { TableCell, TableRow, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { usePlanningContext } from '../../contexts/PlanningContext';
import { formatBigNumber } from '../../libs/cost-utils';
import { YearlyCoverageInput } from './YearlyCoverageInput';

export type CostLineYearlyCoverage = {
    id: number;
    value: number;
};

export type CostLineRowData = {
    id: number;
    label: string;
    subLabel: string;
    totalCost: number;
    coverageByYear: Record<number, CostLineYearlyCoverage>;
};

type Props = {
    yearRange: number[];
    costLineId: number;
    isEditable: boolean;
    coverageByYear: Record<number, CostLineYearlyCoverage>;
    totalCost: number;
    label: string;
};

const styles = {
    costLineRow: { backgroundColor: '#f9f9f9', p: 1 },
    buffer: { pl: 7.275 },
} satisfies SxStyles;

const clampPercentage = (value: number) => {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.min(100, Math.max(0, value));
};

export const CostLineRow: FC<Props> = ({
    yearRange,
    costLineId,
    isEditable,
    coverageByYear,
    totalCost,
    label,
}) => {
    const { saveYearlyCoverage } = usePlanningContext();
    const [coverageInputsByYear, setCoverageInputsByYear] = React.useState<
        Record<number, string>
    >({});

    React.useEffect(() => {
        const nextCoverageInputsByYear: Record<number, string> = {};
        yearRange.forEach(year => {
            nextCoverageInputsByYear[year] = String(
                coverageByYear[year]?.value ?? 100,
            );
        });
        setCoverageInputsByYear(nextCoverageInputsByYear);
    }, [coverageByYear, yearRange]);

    const handleCoverageChange = React.useCallback(
        (year: number, nextValue: string) => {
            setCoverageInputsByYear(current => ({
                ...current,
                [year]: nextValue,
            }));

            if (nextValue.trim() === '') {
                return;
            }

            const parsedValue = Number(nextValue);
            if (!Number.isFinite(parsedValue)) {
                return;
            }

            saveYearlyCoverage({
                assignmentId: coverageByYear[year]?.id,
                costLineId,
                year,
                value: parsedValue,
            });
        },
        [costLineId, coverageByYear, saveYearlyCoverage],
    );

    const normalizeCoverageValue = React.useCallback(
        (year: number) => {
            setCoverageInputsByYear(current => {
                const rawValue = current[year] ?? '';
                if (rawValue.trim() === '') {
                    return {
                        ...current,
                        [year]: String(coverageByYear[year]?.value ?? 100),
                    };
                }

                const parsedValue = Number(rawValue);
                if (!Number.isFinite(parsedValue)) {
                    return {
                        ...current,
                        [year]: String(coverageByYear[year]?.value ?? 100),
                    };
                }

                return {
                    ...current,
                    [year]: String(clampPercentage(parsedValue)),
                };
            });
        },
        [coverageByYear],
    );

    return (
        <TableRow sx={styles.costLineRow}>
            <TableCell align="left" colSpan={2} sx={styles.buffer}>
                <Typography variant="body2" component="span">
                    {label}
                </Typography>
            </TableCell>
            {yearRange.map(year => (
                <TableCell key={`cost_line_${label}_${year}`} align="center">
                    <YearlyCoverageInput
                        value={coverageInputsByYear[year] ?? '100'}
                        onChange={nextValue =>
                            handleCoverageChange(year, nextValue)
                        }
                        onBlur={() => normalizeCoverageValue(year)}
                        disabled={!isEditable}
                    />
                </TableCell>
            ))}
            <TableCell align="center">
                <Typography variant="body2" component="span">
                    {formatBigNumber(totalCost)}
                </Typography>
            </TableCell>
            <TableCell></TableCell>
        </TableRow>
    );
};
