import React, { FC } from 'react';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { Button } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../../messages';

const styles = {
    button: {
        whiteSpace: 'nowrap',
    },
} satisfies SxStyles;

type Props = {
    canAddSlot: boolean;
    onAddSlot: () => void;
};

export const AddScenarioButton: FC<Props> = ({ canAddSlot, onAddSlot }) => {
    const { formatMessage } = useSafeIntl();

    if (!canAddSlot) {
        return null;
    }

    return (
        <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<AddOutlinedIcon fontSize="small" />}
            onClick={onAddSlot}
            sx={styles.button}
        >
            {formatMessage(MESSAGES.comparisonAddScenario)}
        </Button>
    );
};
