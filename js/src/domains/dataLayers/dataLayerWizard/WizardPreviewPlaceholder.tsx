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
    /** Defaults to the generic "preview appears once you add data" copy. */
    message?: IntlMessage;
};

/** Fills the wizard's main area where a map has nothing to show yet — the Type and
 *  Details steps, and the Legend step for layers whose values don't exist client-side. */
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
