import React, { useMemo } from 'react';
import { Typography } from '@mui/material';
import { Column, useSafeIntl, Setting } from 'bluesquare-components';
import { EditIconButton } from 'Iaso/components/Buttons/EditIconButton';
import { MESSAGES } from '../../../messages';
import { InterventionPlan } from '../../types/interventions';

export const useInterventionPlanColumns = (
    showInterventionPlanDetails: (interventionPlan: InterventionPlan) => void,
): Column[] => {
    const { formatMessage } = useSafeIntl();
    return useMemo(
        () => [
            {
                Header: formatMessage(MESSAGES.interventionLabel),
                accessor: 'intervention_name',
                Cell: ({ row }: Setting<InterventionPlan>) => (
                    <Typography>
                        {row.original.intervention.name} -{' '}
                        {row.original.intervention.code}
                    </Typography>
                ),
            },
            {
                Header: formatMessage(MESSAGES.orgUnitDistrict),
                accessor: 'org_units_count',
                sortable: false,
                Cell: ({ row }: Setting<InterventionPlan>) => (
                    <Typography>{row.original.org_units.length}</Typography>
                ),
            },
            {
                Header: 'coucou',
                accessor: 'actions',
                resizable: false,
                sortable: false,

                Cell: ({ row }: Setting<InterventionPlan>) => {
                    return (
                        <EditIconButton
                            onClick={() =>
                                showInterventionPlanDetails(row.original)
                            }
                        />
                    );
                },
            },
        ],
        [formatMessage, showInterventionPlanDetails],
    );
};
