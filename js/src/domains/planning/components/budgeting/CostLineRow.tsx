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
    costDriver: 'population' | 'fixed_cost';
    totalCost: number;
    coverageByYear: Record<number, CostLineYearlyCoverage>;
};

type Props = {
    costLine: CostLineRowData;
    yearRange: number[];
    isEditable: boolean;
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

export const CostLineRow: FC<Props> = ({ costLine, yearRange, isEditable }) => {
    const { saveYearlyCoverage } = usePlanningContext();
    const [coverageInputsByYear, setCoverageInputsByYear] = React.useState<
        Record<number, string>
    >({});

    const defaultCoverage = costLine.costDriver === 'fixed_cost' ? 0 : 100;

    React.useEffect(() => {
        const nextCoverageInputsByYear: Record<number, string> = {};
        yearRange.forEach(year => {
            nextCoverageInputsByYear[year] = String(
                costLine.coverageByYear[year]?.value ?? defaultCoverage,
            );
        });
        setCoverageInputsByYear(nextCoverageInputsByYear);
    }, [costLine.coverageByYear, yearRange, defaultCoverage]);

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
                assignmentId: costLine.coverageByYear[year]?.id,
                costLineId: costLine.id,
                year,
                value: parsedValue,
            });
        },
        [costLine, saveYearlyCoverage],
    );

    const normalizeCoverageValue = React.useCallback(
        (year: number) => {
            if (costLine.costDriver === 'fixed_cost') return;

            setCoverageInputsByYear(current => {
                const rawValue = current[year] ?? '';
                if (rawValue.trim() === '') {
                    return {
                        ...current,
                        [year]: String(
                            costLine.coverageByYear[year]?.value ??
                                defaultCoverage,
                        ),
                    };
                }

                const parsedValue = Number(rawValue);
                if (!Number.isFinite(parsedValue)) {
                    return {
                        ...current,
                        [year]: String(
                            costLine.coverageByYear[year]?.value ??
                                defaultCoverage,
                        ),
                    };
                }

                return {
                    ...current,
                    [year]: String(clampPercentage(parsedValue)),
                };
            });
        },
        [costLine, defaultCoverage],
    );

    return (
        <TableRow sx={styles.costLineRow}>
            <TableCell align="left" colSpan={2} sx={styles.buffer}>
                <Typography variant="body2" component="span">
                    {costLine.label}
                </Typography>
            </TableCell>
            {yearRange.map(year => (
                <TableCell
                    key={`cost_line_${costLine.label}_${year}`}
                    align="center"
                >
                    <YearlyCoverageInput
                        value={coverageInputsByYear[year]}
                        onChange={nextValue =>
                            handleCoverageChange(year, nextValue)
                        }
                        onBlur={() => normalizeCoverageValue(year)}
                        disabled={!isEditable}
                        percentage={costLine.costDriver !== 'fixed_cost'}
                    />
                </TableCell>
            ))}
            <TableCell align="right">
                <Typography variant="body2" component="span">
                    {formatBigNumber(costLine.totalCost)}
                </Typography>
            </TableCell>
            <TableCell></TableCell>
        </TableRow>
    );
};
