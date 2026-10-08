import React, { FC } from 'react';
import { Box } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { useElementSize } from '../hooks/useElementSize';

const styles = {
    root: {
        display: 'block',
        position: 'relative',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    measure: {
        position: 'absolute',
        visibility: 'hidden',
        whiteSpace: 'nowrap',
    },
} satisfies SxStyles;

type Props = {
    label: string;
    shortLabel: string;
};

/** Shows `label`, or `shortLabel` once `label` no longer fits the available width. */
export const AdaptiveLabel: FC<Props> = ({ label, shortLabel }) => {
    const { ref: rootRef, size: rootSize } = useElementSize<HTMLSpanElement>();
    const { ref: measureRef, size: labelSize } =
        useElementSize<HTMLSpanElement>();
    const fits =
        !rootSize || !labelSize || labelSize.width <= rootSize.width;
    return (
        <Box component="span" ref={rootRef} sx={styles.root}>
            <Box component="span" ref={measureRef} sx={styles.measure}>
                {label}
            </Box>
            {fits ? label : shortLabel}
        </Box>
    );
};
