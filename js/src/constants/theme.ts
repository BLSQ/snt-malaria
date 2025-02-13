import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
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
    },
    typography: {
        fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
        ].join(','),
    },
});

export default theme;
