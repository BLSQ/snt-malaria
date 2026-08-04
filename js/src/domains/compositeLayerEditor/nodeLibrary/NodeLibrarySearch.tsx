import React, { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { SearchInput, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

const styles = {
    // `mt` is the gap below the sidebar tabs; the card header has no bottom padding of its own, so
    // the gap before the list comes from `mb` here.
    root: { mt: 2.5, mb: 1 },
    hint: { display: 'block', mt: 1, color: 'text.secondary' },
} satisfies SxStyles;

type Props = {
    value: string;
    onChange: (searchTerm: string) => void;
};

const noop = () => undefined;

/**
 * The node library's search field and drag-and-drop hint. Rendered into the card's header rather
 * than inside `NodeLibrary` itself so it stays put while the nodes scroll under it.
 */
export const NodeLibrarySearch: FC<Props> = ({ value, onChange }) => {
    const { formatMessage } = useSafeIntl();
    return (
        <Box sx={styles.root}>
            <SearchInput
                label={formatMessage(MESSAGES.searchForNodePlaceholder)}
                keyValue="nodeLibrarySearch"
                value={value}
                onChange={onChange}
                onEnterPressed={noop}
                clearable
            />
            <Typography variant="caption" sx={styles.hint}>
                {formatMessage(MESSAGES.nodeLibraryHint)}
            </Typography>
        </Box>
    );
};
