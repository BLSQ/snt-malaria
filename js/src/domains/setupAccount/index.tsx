import React, { FunctionComponent, useEffect, useMemo } from 'react';

import { AppBar, Box, Grid, Paper, Toolbar, Typography } from '@mui/material';
import { LangOptions, useSafeIntl } from 'bluesquare-components';

import { useAppLocales } from 'Iaso/domains/app/constants';
import { useLocale } from 'Iaso/domains/app/contexts/LocaleContext';
import { SxStyles } from 'Iaso/types/general';

import {
    CreateAccountForm,
    setCachedLanguage,
} from './components/CreateAccountForm';
import { MESSAGES } from './messages';

const styles = {
    root: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'grey.100',
    },
    appBar: {
        zIndex: 10,
    },
    // Right padding matches the shared TopBar so the language switch lines
    // up with the edge of the page content.
    toolbar: {
        '&.MuiToolbar-gutters': {
            paddingRight: '48px',
        },
    },
    appBarTitle: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '80%',
        display: 'block',
    },
    appBarRight: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pl: 1,
    },
    langItem: {
        display: 'inline-block',
        textTransform: 'uppercase',
        cursor: 'pointer',
        px: 0.5,
        color: 'inherit',
        userSelect: 'none',
    },
    langItemActive: {
        opacity: 0.5,
        cursor: 'text',
    },
    langSeparator: {
        opacity: 0.5,
    },
    container: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
    },
    paper: {
        width: '100%',
        maxWidth: 560,
        p: 4,
        borderRadius: 4,
        boxShadow: 'none',
        backgroundColor: 'common.white',
    },
} satisfies SxStyles;

const SUPPORTED_LANGS: readonly LangOptions[] = ['en', 'fr'];

// Reads `?lang=` from the URL when used as a deep-link entry point.
const readUrlLang = (): LangOptions | undefined => {
    const candidate = new URLSearchParams(window.location.search).get('lang');
    return candidate &&
        (SUPPORTED_LANGS as readonly string[]).includes(candidate)
        ? (candidate as LangOptions)
        : undefined;
};

export const SetupAccount: FunctionComponent = () => {
    const { formatMessage } = useSafeIntl();
    const { locale, setLocale } = useLocale();
    const appLocales = useAppLocales();
    const urlLang = useMemo(readUrlLang, []);

    // Updates the cached language before flipping the locale so the form
    // picks up the new value after the IntlProvider remount.
    const changeLanguage = (code: LangOptions): void => {
        if (code === locale) return;
        setCachedLanguage(code);
        setLocale(code);
    };

    // Apply `?lang=` once, then strip it from the URL so that subsequent
    // language switches (which remount this component) don't reset the
    // locale to the original deep-link value.
    // Also the rest of the app doesn't use the deep-link value.
    useEffect(() => {
        if (!urlLang) return;
        if (urlLang !== locale) changeLanguage(urlLang);
        const url = new URL(window.location.href);
        url.searchParams.delete('lang');
        window.history.replaceState({}, '', url.toString());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Box sx={styles.root}>
            <AppBar
                position="relative"
                color="primary"
                elevation={0}
                sx={styles.appBar}
            >
                <Toolbar sx={styles.toolbar}>
                    <Grid
                        container
                        justifyContent="space-between"
                        alignItems="center"
                        direction="row"
                    >
                        <Grid
                            container
                            item
                            direction="row"
                            xs={7}
                            alignItems="center"
                        >
                            <Typography
                                variant="h6"
                                color="inherit"
                                id="top-bar-title"
                                sx={styles.appBarTitle}
                            >
                                {formatMessage(MESSAGES.appName)}
                            </Typography>
                        </Grid>
                        <Grid container item xs={5} justifyContent="flex-end">
                            <Box sx={styles.appBarRight}>
                                {appLocales.map((loc, i) => (
                                    <Box key={loc.code} component="span">
                                        <Box
                                            component="span"
                                            sx={[
                                                styles.langItem,
                                                loc.code === locale &&
                                                    styles.langItemActive,
                                            ]}
                                            onClick={() =>
                                                changeLanguage(
                                                    loc.code as LangOptions,
                                                )
                                            }
                                        >
                                            {loc.code}
                                        </Box>
                                        {i < appLocales.length - 1 && (
                                            <Box
                                                component="span"
                                                sx={styles.langSeparator}
                                            >
                                                -
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </Grid>
                    </Grid>
                </Toolbar>
            </AppBar>
            <Box sx={styles.container}>
                <Paper sx={styles.paper} elevation={0}>
                    <CreateAccountForm onLanguageChange={changeLanguage} />
                </Paper>
            </Box>
        </Box>
    );
};
