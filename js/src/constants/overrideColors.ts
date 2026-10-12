import { alpha } from '@mui/material/styles';
import { theme } from './theme';

const { palette } = theme;
const ink = '#1F2B3D';

export const overrideColors = {
    overriddenBorder: palette.primary.main,
    overriddenBackground: palette.primary.light,
    overriddenText: '#5E35B1',
    rowHoverBackground: palette.action.hover,
    actionHoverBackground: alpha(palette.primary.main, 0.08),
    focusGlow: alpha(palette.primary.main, 0.16),
    progressFill: '#FAF7FD',
    zeroBorder: palette.error.main,
    zeroBackground: '#FFEBEE',
    inputBorder: alpha(ink, 0.23),
    mutedIcon: palette.text.secondary,
    notApplicableText: alpha(ink, 0.38),
    emptyDot: alpha(ink, 0.12),
};
