import { useTheme } from '@mui/material';

// Shared recharts axis/grid styling. Spread the returned objects onto the real
// <CartesianGrid>/<XAxis>/<YAxis>; each chart adds its own data-specific props
// (dataKey, tickFormatter, width, tickMargin, grid orientation).
const AXIS_FONT_SIZE = '0.75rem';

export const useChartTheme = () => {
    const theme = useTheme();
    const axisColor = theme.palette.text.secondary;

    return {
        axisColor,
        gridProps: {
            strokeDasharray: '',
            stroke: theme.palette.divider,
        },
        axisProps: {
            tick: { fill: axisColor, fontSize: AXIS_FONT_SIZE },
            stroke: axisColor,
        },
    } as const;
};
