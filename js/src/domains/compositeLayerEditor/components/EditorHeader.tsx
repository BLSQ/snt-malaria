import React, { FC } from 'react';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

const styles = {
    title: { ml: 1 },
} satisfies SxStyles;

type Props = {
    title: string;
    /** Whether the data layers sidebar is currently collapsed (owned by the parent page). */
    sidebarCollapsed: boolean;
    /** Toggles the data layers sidebar (mirrors the scenario editor's rules-panel toggle). */
    onToggleSidebar?: () => void;
    onCancel: () => void;
    onSave: () => void;
    isSaving: boolean;
};

/** Header bar of the composite editor: sidebar toggle, title, and cancel/save actions. */
export const EditorHeader: FC<Props> = ({
    title,
    sidebarCollapsed,
    onToggleSidebar,
    onCancel,
    onSave,
    isSaving,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
        >
            <Stack direction="row" alignItems="center" spacing={0.5}>
                {onToggleSidebar && (
                    <Tooltip
                        title={formatMessage(
                            sidebarCollapsed
                                ? MESSAGES.showDataLayers
                                : MESSAGES.hideDataLayers,
                        )}
                    >
                        <IconButton size="small" onClick={onToggleSidebar}>
                            <ViewSidebarIcon
                                color={sidebarCollapsed ? 'action' : 'primary'}
                            />
                        </IconButton>
                    </Tooltip>
                )}
                <Typography variant="h6" sx={styles.title}>
                    {title}
                </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={onCancel}
                >
                    {formatMessage(MESSAGES.cancel)}
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={onSave}
                    disabled={isSaving}
                >
                    {formatMessage(MESSAGES.save)}
                </Button>
            </Stack>
        </Stack>
    );
};
