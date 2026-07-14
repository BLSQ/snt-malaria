import React, { FC } from 'react';
import { Box, Link } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    helper: {
        color: 'text.secondary',
        fontSize: 11,
        lineHeight: 1.3,
        m: 0,
        width: '100%',
    },
    link: {
        fontSize: 'inherit',
    },
} satisfies SxStyles;

type Props = {
    text: string;
    linkHref?: string;
    linkLabel?: string;
};

/**
 * Short explainer shown at the bottom of a transformation node's body (formula, combine,
 * normalize, reclassify), just above the output port. The text is the node's description -- the
 * same one shown in the add-node context menu -- optionally followed by a documentation link.
 * Rendered as a Flume custom control via the shared `helperText` port type.
 */
export const NodeHelperText: FC<Props> = ({ text, linkHref, linkLabel }) => (
    <Box component="p" sx={styles.helper}>
        {text}
        {linkHref && (
            <>
                {' '}
                <Link
                    href={linkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={styles.link}
                >
                    {linkLabel ?? linkHref}
                </Link>
            </>
        )}
    </Box>
);
