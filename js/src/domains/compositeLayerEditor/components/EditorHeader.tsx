import React, { FC } from 'react';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SchemaIcon from '@mui/icons-material/Schema';
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
    /** Whether the sidebar is currently showing the AI chat rather than the draggable data layer
     * list. Only rendered when `showAiChatToggle` is true. */
    isAiChatMode?: boolean;
    onToggleAiChatMode?: () => void;
    /** Shows the AI chat toggle - only when the account has an AI API key configured (same gate
     * that used to pick between the two sidebars outright, see DataLayers/index.tsx). */
    showAiChatToggle?: boolean;
    /** Re-lays-out every node on the canvas from their real rendered sizes (see `handleRearrange`
     * in index.tsx) - the same measure-then-layout pass a structural AI update runs, exposed here
     * so it can also tidy up a hand-built or manually-dragged graph. */
    onRearrange: () => void;
    onCancel: () => void;
    onSave: () => void;
    isSaving: boolean;
};

/** Header bar of the composite editor: sidebar toggle, title, and cancel/save actions. */
export const EditorHeader: FC<Props> = ({
    title,
    sidebarCollapsed,
    onToggleSidebar,
    isAiChatMode = false,
    onToggleAiChatMode,
    showAiChatToggle = false,
    onRearrange,
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
                {showAiChatToggle && (
                    <Tooltip
                        title={formatMessage(
                            isAiChatMode
                                ? MESSAGES.switchToDataLayerList
                                : MESSAGES.switchToAiGeneration,
                        )}
                    >
                        <IconButton size="small" onClick={onToggleAiChatMode}>
                            <AutoFixHighIcon
                                color={isAiChatMode ? 'primary' : 'action'}
                            />
                        </IconButton>
                    </Tooltip>
                )}
                <Tooltip title={formatMessage(MESSAGES.rearrangeNodes)}>
                    <IconButton size="small" onClick={onRearrange}>
                        <SchemaIcon color="primary" />
                    </IconButton>
                </Tooltip>
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
