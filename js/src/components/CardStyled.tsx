import React, { FC, ReactNode, useMemo } from 'react';
import { CardContent, CardHeader, SxProps } from '@mui/material';
import { LoadingSpinner } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    cardHeader: {
        pb: 0,
        minHeight: '65px',
        // The card is a fixed-height flex column whose content area's flex-basis is its full
        // scroll height, so without this the flex algorithm shrinks the header down to
        // `minHeight` and `overflow: hidden` below clips whatever no longer fits.
        flexShrink: 0,
        '& .MuiCardHeader-content': {
            overflow: 'hidden',
            minWidth: 0,
        },
    },
    cardContent: {
        overflow: 'auto',
        position: 'relative',
        flexGrow: 1,
        '&:last-child': {
            paddingBottom: 2,
        },
    },
    cardContentFlush: {
        position: 'relative',
        flexGrow: 1,
        minHeight: 0,
        p: 0,
        '&:last-child': {
            paddingBottom: 0,
        },
    },
} satisfies SxStyles;

type Props = {
    header?: ReactNode;
    isLoading?: boolean;
    headerSx?: SxProps;
    /**
     * Drops the content area's padding (and its scrolling) so the child reaches the card's edges.
     * For children that own their own internal padding and scrolling, e.g. a chat panel whose
     * dividers are meant to span the full width.
     */
    flushContent?: boolean;
    children: ReactNode;
};

export const CardStyled: FC<Props> = ({
    header,
    isLoading,
    headerSx,
    flushContent = false,
    children,
}) => {
    const headerStyles = useMemo(
        () =>
            headerSx
                ? { ...styles.cardHeader, ...headerSx }
                : styles.cardHeader,
        [headerSx],
    );
    return (
        <>
            <CardHeader sx={headerStyles} title={header} />

            <CardContent
                sx={
                    flushContent ? styles.cardContentFlush : styles.cardContent
                }
            >
                {isLoading ? <LoadingSpinner absolute={true} /> : children}
            </CardContent>
        </>
    );
};
