import React, { FC } from 'react';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import { Typography } from '@mui/material';
import { IntlMessage, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';
import { WizardMainCard } from './WizardMainCard';

const styles = {
    icon: { fontSize: 48, color: 'text.disabled' },
    text: { maxWidth: 360, color: 'text.secondary' },
} satisfies SxStyles;

type Props = {
    message?: IntlMessage;
};

export const WizardPreviewPlaceholder: FC<Props> = ({
    message = MESSAGES.wizardPreviewPlaceholder,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <WizardMainCard centered>
            <MapOutlinedIcon sx={styles.icon} />
            <Typography variant="body2" sx={styles.text}>
                {formatMessage(message)}
            </Typography>
        </WizardMainCard>
    );
};
