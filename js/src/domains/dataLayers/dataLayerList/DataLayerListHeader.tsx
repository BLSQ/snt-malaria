import React, { FC } from 'react';
import AddIcon from '@mui/icons-material/Add';
import LayersIcon from '@mui/icons-material/Layers';
import { Stack, Typography } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { IconBoxed } from '../../../components/IconBoxed';
import { MESSAGES } from '../messages';

type Props = {
    onCreate: () => void;
};

export const DataLayerListHeader: FC<Props> = ({ onCreate }) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
        >
            <Stack direction="row" alignItems="center" spacing={1}>
                <IconBoxed Icon={LayersIcon} />
                <Typography variant="h6">
                    {formatMessage(MESSAGES.dataLayersTitle)}
                </Typography>
            </Stack>
            <IconButton
                onClick={onCreate}
                color="primary"
                overrideIcon={AddIcon}
                tooltipMessage={MESSAGES.createLayer}
            />
        </Stack>
    );
};
