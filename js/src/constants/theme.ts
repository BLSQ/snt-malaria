import { createTheme } from '@mui/material/styles';

import { theme as defaultTheme } from 'bluesquare-components';

export const theme = createTheme({
    ...defaultTheme,
    palette: {
        ...defaultTheme.palette,
        primary: {
            main: '#7B1FA2', // Purple from the UI
            light: '#9C27B0',
            dark: '#6A1B9A',
        },
        secondary: {
            main: '#2196F3', // Blue - complementary to purple
            light: '#42A5F5',
            dark: '#1976D2',
        },
        error: {
            main: '#F44336', // Standard Material UI red
            light: '#E57373',
            dark: '#D32F2F',
        },
        warning: {
            main: '#FF9800', // Standard Material UI orange
            light: '#FFB74D',
            dark: '#F57C00',
        },
        background: {
            default: '#ECEFF1', // Set the page background color
        },
    },
    typography: {
        ...defaultTheme.typography,
        button: {
            ...defaultTheme.typography.button,
            fontFamily: '"Roboto", "Arial", sans-serif',
        },
    },
    components: {
        MuiPaper: {
            defaultProps: {
                elevation: 0,
            },
        },
        MuiAppBar: {
            styleOverrides: {
                colorPrimary: {
                    color: defaultTheme.palette.text.primary,
                    backgroundColor: 'white',
                },
            },
        },
        MuiInputBase: {
            styleOverrides: {
                root: {
                    minHeight: '0',
                    input: {
                        padding: '8.5px 14px',
                    },
                },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {
                    transform: 'translate(14px, 8px) scale(1)',
                    color: 'textSecondary',
                },
                shrink: {
                    transform: 'translate(14px, -9px) scale(1)',
                    fontSize: '0.75rem',
                },
                outlined: {
                    '&.MuiInputLabel-shrink': {
                        height: '15px',
                        fontSize: '0.75rem',
                    },
                },
            },
        },
        MuiAutocomplete: {
            styleOverrides: {
                inputRoot: {
                    padding: '1px',
                },
                root: {
                    '&.MuiOutlinedInput-root .MuiAutocomplete-endAdornment': {
                        right: '0px',
                    },
                },
            },
        },
    },
});

export default theme;
