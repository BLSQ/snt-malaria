import React, { FC, useCallback, useEffect } from 'react';
import { CardStyled } from '../../../components/CardStyled';
import { ExtendedFormikProvider } from '../../../hooks/useGetExtendedFormikContext';
import { InterventionDetails } from '../../planning/types/interventions';
import { useGetInterventionDetails } from '../hooks/useGetInterventionDetails';
import { useInterventionFormState } from '../hooks/useInterventionFormState';
import { InterventionForm } from './InterventionForm';

type Props = {
    interventionId?: number;
};

export const InterventionFormWrapper: FC<Props> = ({ interventionId }) => {
    const onSubmit = useCallback(
        (values: Partial<InterventionDetails>) => {},
        [],
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
        <CardStyled header={interventionDetails?.name}>
            <ExtendedFormikProvider formik={formik}>
                <InterventionForm />
            </ExtendedFormikProvider>
        </CardStyled>
    );
};
