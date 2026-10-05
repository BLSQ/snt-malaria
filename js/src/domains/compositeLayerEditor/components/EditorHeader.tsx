import React, { FC } from 'react';
import SchemaIcon from '@mui/icons-material/Schema';
import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { MESSAGES } from '../messages';

type Props = {
    title: string;
    /** Re-lays-out every node on the canvas from their real rendered sizes (see `handleRearrange`
     * in index.tsx) - the same measure-then-layout pass a structural AI update runs, exposed here
     * so it can also tidy up a hand-built or manually-dragged graph. */
    onRearrange: () => void;
    onCancel: () => void;
    onSave: () => void;
    isSaving: boolean;
    hideActions?: boolean;
};

/** Header bar of the composite editor: title, and cancel/save actions. */
export const EditorHeader: FC<Props> = ({
    title,
    onRearrange,
    onCancel,
    onSave,
    isSaving,
    hideActions = false,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
        >
            <Typography variant="h6">{title}</Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Tooltip title={formatMessage(MESSAGES.rearrangeNodes)}>
                    <IconButton size="small" onClick={onRearrange}>
                        <SchemaIcon color="primary" />
                    </IconButton>
                </Tooltip>
                {!hideActions && (
                    <>
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
                    </>
                )}
            </Stack>
        </Stack>
    );
};
