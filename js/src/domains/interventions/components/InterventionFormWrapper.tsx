import React, { FC, useCallback, useEffect } from 'react';
import { Button, Stack } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { CardStyled } from '../../../components/CardStyled';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { MESSAGES } from '../../messages';
import { InterventionDetails } from '../../planning/types/interventions';
import { useGetInterventionDetails } from '../hooks/useGetInterventionDetails';
import { useInterventionFormState } from '../hooks/useInterventionFormState';
import { useSaveInterventionDetails } from '../hooks/useSaveInterventionDetails';
import { InterventionForm } from './InterventionForm';

type Props = {
    interventionId?: number;
};

export const InterventionFormWrapper: FC<Props> = ({ interventionId }) => {
    const { formatMessage } = useSafeIntl();
    const { mutate: saveInterventionDetails } =
        useSaveInterventionDetails(interventionId);
    const onSubmit = useCallback(
        (values: Partial<InterventionDetails>) =>
            saveInterventionDetails(values),
        [saveInterventionDetails],
    );

    const { data: interventionDetails } = useGetInterventionDetails({
        interventionId,
    });

    const formik = useInterventionFormState({
        onSubmit,
    });

    useEffect(() => {
        if (interventionDetails) {
            formik.setValues(interventionDetails);
        }
    }, [interventionDetails]); // Only run when interventionDetails changes

    return (
        <CardStyled
            header={
                <Stack direction="row" justifyContent="space-between">
                    {interventionDetails?.name}
                    <Button
                        onClick={() => formik.handleSubmit()}
                        variant="outlined"
                    >
                        {formatMessage(MESSAGES.save)}
                    </Button>
                </Stack>
            }
        >
            <ExtendedFormikProvider formik={formik}>
                <InterventionForm />
            </ExtendedFormikProvider>
        </CardStyled>
    );
};
