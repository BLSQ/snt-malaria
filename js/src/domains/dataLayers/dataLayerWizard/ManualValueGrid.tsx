import React, { FC, useCallback, useMemo } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
    Box,
    IconButton,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { SxStyles } from 'Iaso/types/general';
import { DataLayerYearOptions } from '../../../constants/shared';
import { MESSAGES } from '../messages';
import { OrgUnitRow, toOrgUnitRows } from './orgUnitRows';

const styles = {
    toolbar: { mb: 1, alignItems: 'center' },
    count: { flexGrow: 1 },
    container: { maxHeight: '100%', overflow: 'auto' },
    valueCell: { width: 140 },
    yearHeader: { alignItems: 'center', whiteSpace: 'nowrap' },
    addYearSelect: { fontSize: 'body2.fontSize' },
    warnIcon: { color: 'warning.main', fontSize: 18, ml: 0.5 },
} satisfies SxStyles;

const isPercentUnit = (units?: string, symbol?: string): boolean =>
    symbol === '%' || (units ?? '').toLowerCase().includes('percent');

const noop = () => {};

type GridRowProps = {
    row: OrgUnitRow;
    years: number[];
    valuesByYear: Record<number, string> | undefined;
    onChange: (orgUnitId: number, year: number, value: string) => void;
    percent: boolean;
    readOnly: boolean;
};

const GridRow: FC<GridRowProps> = ({
    row,
    years,
    valuesByYear,
    onChange,
    percent,
    readOnly,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <TableRow hover>
            <TableCell>{row.adm1Name}</TableCell>
            <TableCell>{row.adm2Name}</TableCell>
            {years.map(year => {
                const raw = valuesByYear?.[year] ?? '';
                const num = Number(raw);
                const aboveHundred =
                    percent &&
                    raw.trim() !== '' &&
                    Number.isFinite(num) &&
                    num > 100;
                return (
                    <TableCell key={year} sx={styles.valueCell}>
                        <Stack direction="row" alignItems="center">
                            <TextField
                                variant="standard"
                                size="small"
                                value={raw}
                                onChange={event =>
                                    onChange(
                                        row.orgUnitId,
                                        year,
                                        event.target.value,
                                    )
                                }
                                InputProps={{ readOnly }}
                                inputProps={{
                                    inputMode: 'decimal',
                                    'aria-label': `${row.adm2Name} ${year}`,
                                }}
                            />
                            {aboveHundred && (
                                <Tooltip
                                    title={formatMessage(
                                        MESSAGES.wizardValueAboveHundred,
                                    )}
                                >
                                    <WarningAmberIcon sx={styles.warnIcon} />
                                </Tooltip>
                            )}
                        </Stack>
                    </TableCell>
                );
            })}
        </TableRow>
    );
};

const MemoGridRow = React.memo(GridRow);

type Props = {
    orgUnits: OrgUnit[];
    /** Org unit id -> year -> raw text. */
    values: Record<number, Record<number, string>>;
    years: number[];
    /** Omit along with `onAddYear`/`onRemoveYear` for a `readOnly` grid. */
    onChange?: (orgUnitId: number, year: number, value: string) => void;
    onAddYear?: (year: number) => void;
    onRemoveYear?: (year: number) => void;
    units?: string;
    unitSymbol?: string;
    readOnly?: boolean;
};

export const ManualValueGrid: FC<Props> = ({
    orgUnits,
    values,
    years,
    onChange = noop,
    onAddYear = noop,
    onRemoveYear = noop,
    units,
    unitSymbol,
    readOnly = false,
}) => {
    const { formatMessage } = useSafeIntl();
    const rows = useMemo(() => toOrgUnitRows(orgUnits), [orgUnits]);
    const percent = isPercentUnit(units, unitSymbol);

    const filled = useMemo(
        () =>
            rows.reduce(
                (count, row) =>
                    count +
                    years.filter(
                        year =>
                            (values[row.orgUnitId]?.[year] ?? '').trim() !== '',
                    ).length,
                0,
            ),
        [rows, years, values],
    );
    const total = rows.length * years.length;

    const addableYears = useMemo(
        () =>
            DataLayerYearOptions.filter(
                option => !years.includes(option.value),
            ),
        [years],
    );

    const onPasteIntoYear = useCallback(
        async (year: number) => {
            if (readOnly || !navigator.clipboard?.readText) return;
            let text: string;
            try {
                // Rejects in Firefox, insecure contexts, or when permission is denied.
                text = await navigator.clipboard.readText();
            } catch {
                return;
            }
            text.split(/\r?\n/)
                .map(cell => cell.trim())
                .forEach((cell, index) => {
                    if (cell !== '' && rows[index]) {
                        onChange(rows[index].orgUnitId, year, cell);
                    }
                });
        },
        [rows, onChange, readOnly],
    );

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" spacing={1} sx={styles.toolbar}>
                <Typography variant="body2" sx={styles.count}>
                    {formatMessage(MESSAGES.wizardManualFilledCount, {
                        filled: String(filled),
                        total: String(total),
                    })}
                </Typography>
                {!readOnly && addableYears.length > 0 && (
                    <Select
                        size="small"
                        displayEmpty
                        value=""
                        onChange={event =>
                            onAddYear(Number(event.target.value))
                        }
                        renderValue={() => (
                            <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                            >
                                <AddIcon fontSize="small" />
                                <span>
                                    {formatMessage(MESSAGES.wizardAddYear)}
                                </span>
                            </Stack>
                        )}
                        sx={styles.addYearSelect}
                    >
                        {addableYears.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                )}
            </Stack>
            {!readOnly && (
                <Typography variant="caption" color="text.secondary" mb={1}>
                    {formatMessage(MESSAGES.wizardManualPasteHelp)}
                </Typography>
            )}
            <TableContainer sx={styles.container}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                {formatMessage(MESSAGES.wizardGridRegion)}
                            </TableCell>
                            <TableCell>
                                {formatMessage(MESSAGES.wizardGridDistrict)}
                            </TableCell>
                            {years.map(year => (
                                <TableCell key={year} sx={styles.valueCell}>
                                    <Stack
                                        direction="row"
                                        sx={styles.yearHeader}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{ flexGrow: 1 }}
                                        >
                                            {year}
                                        </Typography>
                                        {!readOnly && (
                                            <>
                                                <Tooltip
                                                    title={formatMessage(
                                                        MESSAGES.wizardManualPaste,
                                                    )}
                                                >
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            onPasteIntoYear(
                                                                year,
                                                            )
                                                        }
                                                    >
                                                        <ContentPasteIcon fontSize="inherit" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip
                                                    title={formatMessage(
                                                        MESSAGES.wizardRemoveYear,
                                                        {
                                                            year: String(year),
                                                        },
                                                    )}
                                                >
                                                    <IconButton
                                                        size="small"
                                                        onClick={() =>
                                                            onRemoveYear(year)
                                                        }
                                                    >
                                                        <RemoveCircleOutlineIcon fontSize="inherit" />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </Stack>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => (
                            <MemoGridRow
                                key={row.orgUnitId}
                                row={row}
                                years={years}
                                valuesByYear={values[row.orgUnitId]}
                                onChange={onChange}
                                percent={percent}
                                readOnly={readOnly}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};
