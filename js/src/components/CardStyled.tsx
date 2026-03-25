import React, { FC, ReactNode } from 'react';
import { CardContent, CardHeader } from '@mui/material';
import { LoadingSpinner } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';

const styles: SxStyles = {
    cardHeader: {
        pb: 0,
        minHeight: '65px',
    },
    cardContent: {
        overflow: 'auto',
        position: 'relative',
        flexGrow: 1,
        '&:last-child': {
            paddingBottom: 2,
        },
    },
};

type Props = {
    header?: ReactNode;
    isLoading?: boolean;
    children: ReactNode;
};

export const CardStyled: FC<Props> = ({ header, isLoading, children }) => {
    return (
        <>
            <CardHeader sx={styles.cardHeader} title={header} />

            <CardContent sx={styles.cardContent}>
                {isLoading ? <LoadingSpinner absolute={true} /> : children}
            </CardContent>
        </>
    );
};
