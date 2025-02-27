import React, { FC } from 'react';
import {
    Accordion,
    AccordionDetails,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Paper,
    Chip,
    Typography,
} from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { useGetInterventionsPlan } from '../../hooks/UseGetInterventionsPlan';
import { MESSAGES } from '../../messages';
import { InterventionPlanSummary } from './InterventionplanSummary';

type Props = {
    scenarioId: number | undefined;
    selectedOrgUnits: OrgUnit[];
};

const TableRowWithPlans = ({ row, index }) => {
    return (
        <TableRow
            key={row.name}
            sx={{
                backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5',
            }}
        >
            <TableCell>{row.name}</TableCell>
            <TableCell>
                {row.interventions.map(intervention => (
                    <Chip
                        key={intervention.id}
                        label={intervention.name}
                        sx={{ margin: 0.5 }}
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
export const InterventionsPlans: FC<Props> = ({
    scenarioId,
    selectedOrgUnits,
}) => {
    const enabledPlanFetch = Boolean(scenarioId) && selectedOrgUnits.length > 0;
    const { data: interventionPlans, isLoading: isLoadingPlans } =
        useGetInterventionsPlan(
            scenarioId,
            selectedOrgUnits.map(orgUnit => orgUnit.id),
            enabledPlanFetch,
        );

    return (
        <Accordion
            sx={{
                mt: 2,
                '&:before': {
                    display: 'none',
                },
            }}
        >
            <InterventionPlanSummary orgUnitCount={interventionPlans?.length} />
            <Divider sx={{ width: '100%' }} />
            <AccordionDetails sx={{ padding: 2 }}>
                <TableContainer component={Paper}>
                    <Table size="small" aria-label="a dense table">
                        <TableBody>
                            {!isLoadingPlans &&
                            (interventionPlans?.length ?? 0) > 0
                                ? interventionPlans?.map((row, index) => (
                                    <TableRowWithPlans
                                          row={row}
                                          index={index}
                                      />
                                  ))
                                : !isLoadingPlans && <TableRowWithoutPlans />}
                        </TableBody>
                    </Table>
                </TableContainer>
            </AccordionDetails>
        </Accordion>
    );
};
