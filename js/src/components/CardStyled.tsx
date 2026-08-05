import React, { FC, ReactNode, useMemo } from 'react';
import { CardContent, CardHeader, SxProps } from '@mui/material';
import { LoadingSpinner } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    cardHeader: {
        pb: 0,
        minHeight: '65px',
        // Without this the flex algorithm shrinks the header to `minHeight` (the content area's
        // flex-basis is its whole scroll height) and `overflow: hidden` clips what no longer fits.
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
    /** Drops the content area's padding and scrolling, for children that own their own. */
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
