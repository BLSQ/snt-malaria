import React, { FC } from 'react';
import AddIcon from '@mui/icons-material/Add';
import LayersIcon from '@mui/icons-material/Layers';
import { Link, MenuItem, Stack, SxProps, Typography } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { IconBoxed } from '../../../components/IconBoxed';
import { MoreActions } from '../../../components/MoreActions';
import { exportMetricValuesTemplateAPIPath } from '../../../constants/api-urls';
import { MESSAGES } from '../messages';
import { ImportMetricValuesDialog } from '../MetricValuesImportDialog';

const styles = {
    title: { flexGrow: 1, ml: 1 },
} satisfies SxProps;

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
            <IconBoxed Icon={LayersIcon} />
            <Typography variant="h6" sx={styles.title}>
                {formatMessage(MESSAGES.dataLayersTitle)}
            </Typography>
            <IconButton
                onClick={onCreate}
                color="primary"
                overrideIcon={AddIcon}
                tooltipMessage={MESSAGES.createLayer}
            />
            <MoreActions>
                <ImportMetricValuesDialog iconProps={{}} />
                <MenuItem
                    component={Link}
                    href={exportMetricValuesTemplateAPIPath}
                >
                    {formatMessage(MESSAGES.downloadCSVTemplate)}
                </MenuItem>
            </MoreActions>
        </Stack>
    );
};
