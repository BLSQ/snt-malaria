import React, { FunctionComponent } from 'react';
import { Button, Grid, TableCell, TableRow, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import {
    InterventionOrgUnit,
    InterventionPlan,
} from '../../types/interventions';

type Props = {
    scenarioId: number | undefined;
    row: InterventionPlan;
    index: number;
    showInterventionPlanDetails: (interventionPlan: InterventionPlan) => void;
};

const styles: SxStyles = {
    tableCellStyle: {
        padding: theme => theme.spacing(1),
    },
};
export const InterventionsPlanRowTable: FunctionComponent<Props> = ({
    scenarioId,
    row,
    index,
    showInterventionPlanDetails,
}) => {
    return row ? (
        <TableRow key={`${row.intervention.id}-${index}`}>
            <TableCell
                sx={{
                    ...styles.tableCellStyle,
                    paddingTop: 1,
                    paddingRight: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    verticalAlign: 'top',
                }}
            >
                <Grid container sx={styles.tableCellStyle}>
                    <Grid item xs={3}>
                        <Typography>{row?.intervention.name}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                        <Button
                            variant="text"
                            onClick={() => showInterventionPlanDetails(row)}
                        >
                            {row?.org_units.length} districts
                        </Button>
                    </Grid>
                </Grid>
            </TableCell>
        </TableRow>
    ) : null;
};
