import React, { useCallback } from 'react';
import { FC } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { InterventionAssignmentConflict } from '../../libs/intervention-assignment-utils';

type Props = {
    conflict: InterventionAssignmentConflict;
    selectedInterventionIds: number[];
    onSelectionChange: (selectedIntervention: number[]) => void;
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
        minWidth: 206,
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
    },
    toggleButton: {
        borderRadius: 8,
    },
};

export const ConflictManagementRow: FC<Props> = ({
    conflict,
    selectedInterventionIds,
    onSelectionChange,
}) => {
    const handleButtonToggle = useCallback(
        interventionId => {
            const newStatus = selectedInterventionIds.includes(interventionId)
                ? selectedInterventionIds.filter(i => i !== interventionId)
                : [...selectedInterventionIds, interventionId];
            onSelectionChange(newStatus);
        },
        [onSelectionChange, selectedInterventionIds],
    );

    return (
        <Box sx={styles.conflictManagementRow}>
            <Typography>{conflict.orgUnit.name}</Typography>
            <Box sx={styles.buttonContainer}>
                {conflict.interventions.map(i => (
                    <ToggleButton
                        isActive={selectedInterventionIds.includes(i.id)}
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
