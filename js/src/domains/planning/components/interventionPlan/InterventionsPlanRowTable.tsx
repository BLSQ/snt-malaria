import React, { FunctionComponent } from 'react';
import { Button, Grid, TableCell, TableRow, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { SxStyles } from 'Iaso/types/general';
import { DropdownOptions } from 'Iaso/types/utils';
import { MESSAGES } from '../../../messages';
import { InterventionPlan } from '../../types/interventions';

type Props = {
    row: InterventionPlan;
    index: number;
    showInterventionPlanDetails: (interventionPlan: InterventionPlan) => void;
    onCoverageSelected: (coverage: string) => void;
    coverage: string;
};

// TODO: I don't like this, I think I'd better have an enum
const coverageOptions: Array<DropdownOptions<string>> = [
    { value: 'heighty', label: '80%' },
    { value: 'hundred', label: '100%' },
];

const styles: SxStyles = {
    tableCellStyle: {
        padding: theme => theme.spacing(1),
    },
    textButton: {
        textTransform: 'none',
    },
};
export const InterventionsPlanRowTable: FunctionComponent<Props> = ({
    row,
    index,
    showInterventionPlanDetails,
    onCoverageSelected,
    coverage,
}) => {
    const { formatMessage } = useSafeIntl();
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
                    <Grid
                        item
                        xs={3}
                        sx={{ display: 'flex', alignItems: 'center' }}
                    >
                        <Typography>{row?.intervention.name}</Typography>
                    </Grid>
                    <Grid item xs={7}>
                        <Button
                            variant="text"
                            sx={styles.textButton}
                            onClick={() => showInterventionPlanDetails(row)}
                        >
                            {row?.org_units.length}{' '}
                            {formatMessage(MESSAGES.orgUnitDistrict)}
                        </Button>
                    </Grid>
                    <Grid item xs={2}>
                        <InputComponent
                            keyValue="key"
                            type="select"
                            value={coverage}
                            onChange={(_key, value) =>
                                onCoverageSelected(value)
                            }
                            options={coverageOptions}
                            clearable={false}
                        />
                    </Grid>
                </Grid>
            </TableCell>
        </TableRow>
    ) : null;
};
