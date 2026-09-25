import React, { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../../messages';
import { WizardLayerType } from '../constants';
import { LayerTypeCards } from '../LayerTypeCards';

const styles: SxStyles = {
    question: { fontWeight: 600, mb: 1.5 },
};

type Props = {
    layerType: WizardLayerType;
    onChangeLayerType: (value: WizardLayerType) => void;
    showOpenHexa: boolean;
    showComposite: boolean;
};

export const StepType: FC<Props> = ({
    layerType,
    onChangeLayerType,
    showOpenHexa,
    showComposite,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Box>
            <Typography variant="subtitle1" sx={styles.question}>
                {formatMessage(MESSAGES.wizardTypeQuestion)}
            </Typography>
            <LayerTypeCards
                value={layerType}
                onChange={onChangeLayerType}
                showOpenHexa={showOpenHexa}
                showComposite={showComposite}
            />
        </Box>
    );
};
