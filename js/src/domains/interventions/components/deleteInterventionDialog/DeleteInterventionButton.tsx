import React, { FC, useCallback, useEffect, useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../../../messages';
import { useGetInterventionUsage } from '../../hooks/useGetInterventionUsage';
import { Intervention } from '../../types';
import { DeleteInterventionDialog } from './DeleteInterventionDialog';

type Props = {
    intervention: Intervention;
    onDeleted: () => void;
};

export const DeleteInterventionButton: FC<Props> = ({
    intervention,
    onDeleted,
}) => {
    const { formatMessage } = useSafeIntl();
    const [isOpen, setIsOpen] = useState(false);
    const {
        data: usage,
        isFetching,
        isError,
    } = useGetInterventionUsage(intervention.id, isOpen);

    useEffect(() => {
        if (isError) {
            setIsOpen(false);
        }
    }, [isError]);

    const handleOpen = useCallback(() => setIsOpen(true), []);
    const handleClose = useCallback(() => setIsOpen(false), []);

    return (
        <>
            <Button
                onClick={handleOpen}
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                disabled={isFetching}
            >
                {formatMessage(MESSAGES.deleteIntervention)}
            </Button>
            {isOpen && usage && !isFetching && (
                <DeleteInterventionDialog
                    intervention={intervention}
                    usage={usage}
                    onClose={handleClose}
                    onDeleted={onDeleted}
                />
            )}
        </>
    );
};
