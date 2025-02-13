import React from 'react';
import { Box } from '@mui/material';
import { makeStyles } from '@mui/styles';

import { commonStyles, useSafeIntl } from 'bluesquare-components';
import TopBar from 'Iaso/components/nav/TopBarComponent';
import { MESSAGES } from './messages';

const useStyles = makeStyles(theme => ({
    ...commonStyles(theme),
}));

export const Planning = () => {
    const classes = useStyles();
    const { formatMessage } = useSafeIntl();

    return (
        <>
            <Box className={classes.containerFullHeightNoTabPadded}>
                <h1>Hello world!</h1>
            </Box>
        </>
    );
};
