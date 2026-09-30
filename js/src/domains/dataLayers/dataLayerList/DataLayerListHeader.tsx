import React, { FC, Ref } from 'react';
import AddIcon from '@mui/icons-material/Add';
import LayersIcon from '@mui/icons-material/Layers';
import { Box, Link, MenuItem, Stack, SxProps, Typography } from '@mui/material';
import { IconButton, useSafeIntl } from 'bluesquare-components';
import { DisplayIfUserHasPerm } from 'Iaso/components/DisplayIfUserHasPerm';
import * as CorePermission from 'Iaso/utils/permissions';
import { MoreActions } from '../../../components/MoreActions';
import { SidePanelIconToggle } from '../../../components/sidePanel/SidePanelIconToggle';
import { exportMetricValuesTemplateAPIPath } from '../../../constants/api-urls';
import { MESSAGES } from '../messages';
import { ImportMetricValuesDialog } from '../MetricValuesImportDialog';

const styles = {
    title: { flexGrow: 1, ml: 1 },
} satisfies SxProps;

type Props = {
    onCreate: () => void;
    /** Wrapper ref around the "+" create button for onboarding overlays. */
    createActionRef?: Ref<HTMLDivElement>;
    /** Wrapper ref around the more-actions control (outer Box) for spotlight anchoring. */
    moreActionsRef?: Ref<HTMLDivElement>;
};

export const DataLayerListHeader: FC<Props> = ({
    onCreate,
    createActionRef,
    moreActionsRef,
}) => {
    const { formatMessage } = useSafeIntl();

    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
        >
            <SidePanelIconToggle icon={LayersIcon} />
            <Typography variant="h6" sx={styles.title}>
                {formatMessage(MESSAGES.dataLayersTitle)}
            </Typography>
            <DisplayIfUserHasPerm permissions={[CorePermission.METRIC_TYPES]}>
                <Box ref={createActionRef}>
                    <IconButton
                        onClick={onCreate}
                        color="primary"
                        overrideIcon={AddIcon}
                        tooltipMessage={MESSAGES.createLayer}
                    />
                </Box>
                <Box ref={moreActionsRef} sx={{ display: 'inline-flex' }}>
                    <MoreActions>
                        <ImportMetricValuesDialog iconProps={{}} />
                        <MenuItem
                            component={Link}
                            href={exportMetricValuesTemplateAPIPath}
                        >
                            {formatMessage(MESSAGES.downloadCSVTemplate)}
                        </MenuItem>
                    </MoreActions>
                </Box>
            </DisplayIfUserHasPerm>
        </Stack>
    );
};

/** Icon-only equivalents of the header's actions, shown in the collapsed rail so they stay
 *  usable without expanding the panel. */
export const DataLayerListActions: FC<Pick<Props, 'onCreate'>> = ({
    onCreate,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <DisplayIfUserHasPerm permissions={[CorePermission.METRIC_TYPES]}>
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
        </DisplayIfUserHasPerm>
    );
};
