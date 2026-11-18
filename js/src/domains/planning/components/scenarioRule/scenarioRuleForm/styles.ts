import { overrideColors } from '../../../../../constants/overrideColors';

export const ruleFormColors = {
    ruleMatch: '#B39DDB',
    excludedBackground: '#FFEBEE',
};

export const compactInputStyles = {
    height: 30,
    fontSize: 'body2.fontSize',
    backgroundColor: 'background.paper',
};

export const criterionValueStyles = {
    flex: '0 0 auto',
    width: 'clamp(72px, calc(50% - 100px), 140px)',
};

export const operatorSymbolStyles = {
    fontSize: '1.125rem',
    lineHeight: 1,
};

const FLASH_MS = 400;

export const flashTransition = (borderMs = FLASH_MS) =>
    `border-color ${borderMs}ms, background-color ${FLASH_MS}ms, box-shadow ${FLASH_MS}ms`;

export const flashingStyles = {
    borderColor: 'primary.main',
    backgroundColor: 'primary.light',
    boxShadow: `0 0 0 3px ${overrideColors.focusGlow}`,
};
