import React, { FC, ReactNode, useMemo } from 'react';
import { CardContent, CardHeader, SxProps } from '@mui/material';
import { LoadingSpinner } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';

const styles = {
    cardHeader: {
        pb: 0,
        minHeight: '65px',
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
} satisfies SxStyles;

type Props = {
    header?: ReactNode;
    isLoading?: boolean;
    headerSx?: SxProps;
    children: ReactNode;
};

export const CardStyled: FC<Props> = ({
    header,
    isLoading,
    headerSx,
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

            <CardContent sx={styles.cardContent}>
                {isLoading ? <LoadingSpinner absolute={true} /> : children}
            </CardContent>
        </>
    );
};
