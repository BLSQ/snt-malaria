import React, { FC } from 'react';
import {
    alpha,
    Box,
    Chip,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';

const styles: SxStyles = {
    tableContainer: {
        maxHeight: 300,
        overflowY: 'auto',
        padding: 0,
        margin: 0,
    },
    tableCellStyle: {
        padding: theme => theme.spacing(1),
    },
    orgUnitStyle: {
        margin: theme => theme.spacing(0.5),
    },
    interventionDotStyle: {
        verticalAlign: 'baseline',
        paddingLeft: theme => theme.spacing(0.6),
        paddingRight: theme => theme.spacing(0.6),
    },
};

const TableRowWithPlans = ({ row, index }) => {
    return (
        <TableRow key={index}>
            <TableCell sx={{ ...styles.tableCellStyle, minWidth: '200px' }}>
                <Typography
                    variant="subtitle2"
                    color={alpha('#1F2B3D', 0.87)}
                    fontWeight="bold"
                >
                    {row.name}
                </Typography>
                {row.interventions.map((intervention, idx) => (
                    <Typography
                        variant="caption"
                        color={alpha('#1F2B3D', 0.87)}
                    >
                        {intervention.name}
                        {idx < row.interventions.length - 1 && (
                            <Box
                                component="span"
                                sx={styles.interventionDotStyle}
                            >
                                ·
                            </Box>
                        )}
                    </Typography>
                ))}
            </TableCell>
            <TableCell sx={styles.tableCellStyle}>
                {row.orgUnits.map(orgUnit => (
                    <Chip
                        key={orgUnit.id}
                        label={
                            <Typography
                                key={orgUnit.id}
                                variant="body2"
                                display="inline-block"
                                color="#1F2B3DDE"
                            >
                                {orgUnit.name}
                            </Typography>
                        }
                        sx={styles.orgUnitStyle}
                        color="default"
                        size="small"
                        variant="outlined"
                    />
                ))}
            </TableCell>
        </TableRow>
    );
};

const TableRowWithoutPlans = () => {
    const { formatMessage } = useSafeIntl();
    return (
        <TableRow
            sx={{
                backgroundColor: '#f5f5f5',
            }}
        >
            <TableCell colSpan={2} align="center">
                <Typography variant="h6">
                    {formatMessage(MESSAGES.noPlanAvailable)}
                </Typography>
            </TableCell>
        </TableRow>
    );
};

type Props = {
    isLoadingPlans: boolean;
    interventionPlans: any;
};
export const InterventionsPlanTable: FC<Props> = ({
    isLoadingPlans,
    interventionPlans,
}) => {
    return (
        <TableContainer component={Paper} sx={styles.tableContainer}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
                <TableBody>
                    {isLoadingPlans ||
                    (interventionPlans?.length ?? 0) === 0 ? (
                        <TableRowWithoutPlans />
                    ) : (
                        interventionPlans?.map((row, index) => (
                            <TableRowWithPlans
                                key={row.id}
                                row={row}
                                index={index}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
