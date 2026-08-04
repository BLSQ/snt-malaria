import React, { FC } from 'react';
import { Box, Typography } from '@mui/material';
import { SearchInput, useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

const styles = {
    // The card header has no bottom padding, so `mb` is the gap before the list.
    root: { mt: 2.5, mb: 1 },
    hint: { display: 'block', mt: 1, color: 'text.secondary' },
} satisfies SxStyles;

type Props = {
    value: string;
    onChange: (searchTerm: string) => void;
};

const noop = () => undefined;

/**
 * The library's search field and hint. Rendered into the card header, not `NodeLibrary`, so it
 * stays put while the nodes scroll under it.
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
