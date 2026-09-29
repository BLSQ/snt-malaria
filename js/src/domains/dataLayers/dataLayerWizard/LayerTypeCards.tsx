import React, { FC } from 'react';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LayersIcon from '@mui/icons-material/Layers';
import { Box, Stack, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { OpenHexaSvg } from 'Iaso/components/svg/OpenHexaSvg';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';
import { ActionCard } from './ActionCard';
import { WizardLayerType } from './constants';

type Option = {
    value: WizardLayerType;
    icon: React.ReactNode;
    title: typeof MESSAGES.layerTypeData;
    blurb: typeof MESSAGES.layerTypeDataInfo;
};

const OPTIONS: Option[] = [
    {
        value: 'data',
        icon: <LayersIcon fontSize="small" />,
        title: MESSAGES.layerTypeData,
        blurb: MESSAGES.layerTypeDataInfo,
    },
    {
        value: 'openhexa',
        icon: <OpenHexaSvg fontSize="small" disabled={false} />,
        title: MESSAGES.layerTypeOpenHexa,
        blurb: MESSAGES.layerTypeOpenHexaInfo,
    },
    {
        value: 'composite',
        icon: <AccountTreeIcon fontSize="small" />,
        title: MESSAGES.compositeLayer,
        blurb: MESSAGES.layerTypeCompositeInfo,
    },
];

const styles = {
    list: { display: 'flex', flexDirection: 'column', gap: 1.5 },
    icon: { color: 'primary.main', mt: 0.25 },
    title: { fontWeight: 600 },
} satisfies SxStyles;

type Props = {
    onChange: (value: WizardLayerType) => void;
    showOpenHexa: boolean;
    showComposite: boolean;
};

export const LayerTypeCards: FC<Props> = ({
    onChange,
    showOpenHexa,
    showComposite,
}) => {
    const { formatMessage } = useSafeIntl();
    const options = OPTIONS.filter(
        option =>
            (option.value !== 'openhexa' || showOpenHexa) &&
            (option.value !== 'composite' || showComposite),
    );

    return (
        <Box sx={styles.list}>
            {React.Children.toArray(
                options.map(option => (
                    <ActionCard onClick={() => onChange(option.value)}>
                        <Stack direction="row" gap={1.5}>
                            <Box sx={styles.icon}>{option.icon}</Box>
                            <Box>
                                <Typography variant="body1" sx={styles.title}>
                                    {formatMessage(option.title)}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {formatMessage(option.blurb)}
                                </Typography>
                            </Box>
                        </Stack>
                    </ActionCard>
                )),
            )}
        </Box>
    );
};
