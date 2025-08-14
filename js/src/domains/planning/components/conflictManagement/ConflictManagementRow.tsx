import React, { useCallback, useState } from 'react';
import { FC } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { InterventionAssignmentConflict } from '../../libs/intervention-assignment-utils';

type Props = {
    conflict: InterventionAssignmentConflict;
    onSelectionChange: (selectedIntervention: {
        [interventionId: number]: boolean;
    }) => void;
};

type ToggleButtonProps = {
    isActive: boolean;
    onClick: () => void;
};

export const ToggleButton: FC<ToggleButtonProps> = ({
    isActive = false,
    onClick,
    children,
}) => {
    return (
        <Button
            onClick={onClick}
            variant={isActive ? 'contained' : 'outlined'}
            size="small"
        >
            {children}
        </Button>
    );
};

const styles: SxStyles = {
    conflictManagementRow: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: 1,
    },
    buttonContainer: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
    },
    toggleButton: {
        borderRadius: 8,
    },
};

export const ConflictManagementRow: FC<Props> = ({
    conflict,
    onSelectionChange,
}) => {
    const [buttonStatus, setButtonStatus] = useState<{
        [interventionId: number]: boolean;
    }>({});
    const handleButtonToggle = useCallback(
        interventionId => {
            const newStatus = {
                ...buttonStatus,
                [interventionId]: !buttonStatus[interventionId],
            };

            setButtonStatus(newStatus);
            onSelectionChange(newStatus);
        },
        [setButtonStatus, buttonStatus, onSelectionChange],
    );

    return (
        <Box sx={styles.conflictManagementRow}>
            <Typography>{conflict.orgUnit.name}</Typography>
            <Box sx={styles.buttonContainer}>
                {conflict.assignedInterventions.map(i => (
                    <ToggleButton
                        isActive={buttonStatus[i.id]}
                        key={`toggle-button-${i.id}`}
                        onClick={() => handleButtonToggle(i.id)}
                    >
                        {i.name}
                    </ToggleButton>
                ))}
            </Box>
        </Box>
    );
};
