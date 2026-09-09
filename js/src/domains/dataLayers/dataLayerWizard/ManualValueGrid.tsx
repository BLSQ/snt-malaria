import React, { FC, useCallback, useMemo } from 'react';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
    Box,
    Button,
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
import { MESSAGES } from '../messages';
import { toOrgUnitRows } from './orgUnitRows';

const styles = {
    toolbar: { mb: 1, alignItems: 'center' },
    count: { flexGrow: 1 },
    container: { maxHeight: '100%', overflow: 'auto' },
    valueCell: { width: 160 },
    warnIcon: { color: 'warning.main', fontSize: 18, ml: 0.5 },
} satisfies SxStyles;

const isPercentUnit = (units?: string, symbol?: string): boolean =>
    symbol === '%' || (units ?? '').toLowerCase().includes('percent');

type Props = {
    orgUnits: OrgUnit[];
    values: Record<number, string>;
    onChange: (orgUnitId: number, value: string) => void;
    units?: string;
    unitSymbol?: string;
};

export const ManualValueGrid: FC<Props> = ({
    orgUnits,
    values,
    onChange,
    units,
    unitSymbol,
}) => {
    const { formatMessage } = useSafeIntl();
    const rows = useMemo(() => toOrgUnitRows(orgUnits), [orgUnits]);
    const percent = isPercentUnit(units, unitSymbol);

    const filled = rows.filter(
        row => (values[row.orgUnitId] ?? '').trim() !== '',
    ).length;

    const onPaste = useCallback(async () => {
        if (!navigator.clipboard?.readText) return;
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
                    onChange(rows[index].orgUnitId, cell);
                }
            });
    }, [rows, onChange]);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" spacing={1} sx={styles.toolbar}>
                <Typography variant="body2" sx={styles.count}>
                    {formatMessage(MESSAGES.wizardManualFilledCount, {
                        filled: String(filled),
                        total: String(rows.length),
                    })}
                </Typography>
                <Button size="small" onClick={onPaste}>
                    {formatMessage(MESSAGES.wizardManualPaste)}
                </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" mb={1}>
                {formatMessage(MESSAGES.wizardManualPasteHelp)}
            </Typography>
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
                            <TableCell>
                                {formatMessage(MESSAGES.wizardGridValue)}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => {
                            const raw = values[row.orgUnitId] ?? '';
                            const num = Number(raw);
                            const aboveHundred =
                                percent &&
                                raw.trim() !== '' &&
                                Number.isFinite(num) &&
                                num > 100;
                            return (
                                <TableRow key={row.orgUnitId} hover>
                                    <TableCell>{row.adm1Name}</TableCell>
                                    <TableCell>{row.adm2Name}</TableCell>
                                    <TableCell sx={styles.valueCell}>
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                        >
                                            <TextField
                                                variant="standard"
                                                size="small"
                                                value={raw}
                                                onChange={event =>
                                                    onChange(
                                                        row.orgUnitId,
                                                        event.target.value,
                                                    )
                                                }
                                                inputProps={{
                                                    inputMode: 'decimal',
                                                    'aria-label': `${row.adm2Name} ${formatMessage(
                                                        MESSAGES.wizardGridValue,
                                                    )}`,
                                                }}
                                            />
                                            {aboveHundred && (
                                                <Tooltip
                                                    title={formatMessage(
                                                        MESSAGES.wizardValueAboveHundred,
                                                    )}
                                                >
                                                    <WarningAmberIcon
                                                        sx={styles.warnIcon}
                                                    />
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};
