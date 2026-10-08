import React, {
    ChangeEvent,
    FC,
    FocusEvent,
    KeyboardEvent,
    MouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    InputBase,
    SxProps,
    Theme,
    Tooltip,
    Typography,
} from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { overrideColors } from '../constants/overrideColors';
import { formatBigNumber } from '../domains/planning/libs/cost-utils';


export type NumberInputVariant = 'default' | 'overridden' | 'zero';

type Props = {
    value: number | string | null | undefined;
    onCommit: (value: number | null) => void;
    ariaLabel: string;
    commitOn?: 'blur' | 'change';
    minDecimals?: number;
    maxDecimals?: number;
    min?: number;
    max?: number;
    isNullable?: boolean;
    placeholder?: string;
    prefix?: string;
    suffix?: string;
    selectOnFocus?: boolean;
    /** 0..100, drawn as a fill behind the value. */
    progress?: number;
    compact?: boolean;
    variant?: NumberInputVariant;
    error?: string;
    hint?: string;
    disabled?: boolean;
    sx?: SxProps<Theme>;
};

const PROGRESS_PROPERTY = '--number-input-progress';
const PROGRESS_COLOR_PROPERTY = '--number-input-progress-color';

const styles = {
    root: {
        height: 28,
        px: 0.75,
        gap: 0.25,
        borderRadius: 1,
        border: '1px solid',
        borderColor: overrideColors.inputBorder,
        backgroundColor: 'background.paper',
        typography: 'body2',
        '&.Mui-focused': {
            borderColor: 'primary.main',
            boxShadow: theme => `inset 0 0 0 1px ${theme.palette.primary.main}`,
        },
        '&.Mui-disabled': {
            backgroundColor: 'grey.100',
            opacity: 0.45,
        },
        '& .MuiInputBase-input': {
            p: 0,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
        },
    },
    overridden: {
        borderColor: overrideColors.overriddenBorder,
        backgroundColor: overrideColors.overriddenBackground,
        color: overrideColors.overriddenText,
        fontWeight: 'medium',
    },
    zero: {
        borderColor: overrideColors.zeroBorder,
        backgroundColor: overrideColors.zeroBackground,
        color: overrideColors.zeroBorder,
    },
    error: {
        borderColor: 'error.main',
    },
    affix: {
        color: 'text.disabled',
        flexShrink: 0,
    },
    progressInput: {
        background: `linear-gradient(to right, var(${PROGRESS_COLOR_PROPERTY}) var(${PROGRESS_PROPERTY}), #FFFFFF var(${PROGRESS_PROPERTY}))`,
        transition: `${PROGRESS_PROPERTY} 450ms cubic-bezier(0.4, 0, 0.2, 1), ${PROGRESS_COLOR_PROPERTY} 300ms cubic-bezier(0.4, 0, 0.2, 1)`,
    },
} satisfies SxStyles;

const registerProgressProperties = () => {
    if (typeof CSS === 'undefined' || !('registerProperty' in CSS)) return;
    [
        {
            name: PROGRESS_PROPERTY,
            syntax: '<percentage>',
            inherits: false,
            initialValue: '0%',
        },
        {
            name: PROGRESS_COLOR_PROPERTY,
            syntax: '<color>',
            inherits: false,
            initialValue: 'transparent',
        },
    ].forEach(definition => {
        try {
            CSS.registerProperty(definition);
        } catch {
            // Already registered, e.g. after a hot reload.
        }
    });
};

registerProgressProperties();

const numberFormats = new Map<string, Intl.NumberFormat>();

const getNumberFormat = (minDecimals: number, maxDecimals?: number) => {
    const key = `${minDecimals}-${maxDecimals}`;
    let numberFormat = numberFormats.get(key);
    if (!numberFormat) {
        numberFormat = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: minDecimals,
            maximumFractionDigits: maxDecimals ?? 20,
            useGrouping: false,
        });
        numberFormats.set(key, numberFormat);
    }
    return numberFormat;
};

const toNumber = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
};

const formatEditValue = (
    value: number | undefined,
    minDecimals: number,
    maxDecimals?: number,
) =>
    value === undefined
        ? ''
        : getNumberFormat(minDecimals, maxDecimals).format(value);

const formatDisplayValue = (
    value: number | undefined,
    compact: boolean,
    minDecimals: number,
    maxDecimals?: number,
) => {
    const formatted = formatEditValue(value, minDecimals, maxDecimals);
    return compact && value !== undefined && Math.abs(value) >= 1000
        ? (formatBigNumber(value) ?? formatted)
        : formatted;
};

const parseDraft = (draft: string) => {
    const normalized = draft.trim().replace(',', '.');
    return normalized === '' ? NaN : Number(normalized);
};

const stopPropagation = (event: MouseEvent) => event.stopPropagation();

const clampProgress = (progress: number) =>
    Math.max(0, Math.min(100, progress));

// Shows the formatted value while idle and the raw value while editing.
export const NumberInput: FC<Props> = ({
    value,
    onCommit,
    ariaLabel,
    commitOn = 'blur',
    minDecimals = 0,
    maxDecimals,
    min,
    max,
    isNullable = false,
    placeholder,
    prefix,
    suffix,
    selectOnFocus = true,
    progress,
    compact = false,
    variant = 'default',
    error,
    hint,
    disabled = false,
    sx,
}) => {
    const numericValue = toNumber(value);
    const editValue = formatEditValue(numericValue, minDecimals, maxDecimals);
    const displayValue = formatDisplayValue(
        numericValue,
        compact,
        minDecimals,
        maxDecimals,
    );
    const numericPlaceholder = toNumber(placeholder);
    const displayPlaceholder =
        numericPlaceholder === undefined
            ? placeholder
            : formatDisplayValue(
                  numericPlaceholder,
                  compact,
                  minDecimals,
                  maxDecimals,
              );

    const [isFocused, setIsFocused] = useState(false);
    const [draft, setDraft] = useState(editValue);
    const isReverting = useRef(false);

    useEffect(() => {
        if (!isFocused) {
            setDraft(editValue);
        }
    }, [editValue, isFocused]);

    const parseValid = useCallback(
        (rawDraft: string): number | null | undefined => {
            const trimmed = rawDraft.trim();
            if (trimmed === '') {
                return isNullable ? null : undefined;
            }
            const parsed = parseDraft(trimmed);
            if (
                Number.isNaN(parsed) ||
                (min !== undefined && parsed < min) ||
                (max !== undefined && parsed > max)
            ) {
                return undefined;
            }
            return maxDecimals === undefined
                ? parsed
                : Number(parsed.toFixed(maxDecimals));
        },
        [isNullable, max, maxDecimals, min],
    );

    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            setDraft(event.target.value);
            if (commitOn === 'change') {
                const parsed = parseValid(event.target.value);
                if (parsed !== undefined) {
                    onCommit(parsed);
                }
            }
        },
        [commitOn, onCommit, parseValid],
    );

    const handleFocus = useCallback(
        (event: FocusEvent<HTMLInputElement>) => {
            setIsFocused(true);
            if (selectOnFocus) {
                event.target.select();
            }
        },
        [selectOnFocus],
    );

    // Focus-only selection loses to the browser's caret placement on mouse clicks.
    const handleMouseDown = useCallback(
        (event: MouseEvent<HTMLInputElement>) => {
            const input = event.currentTarget;
            if (selectOnFocus && document.activeElement !== input) {
                event.preventDefault();
                input.focus();
                input.select();
            }
        },
        [selectOnFocus],
    );

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        const trimmedDraft = draft.trim();
        if (
            commitOn === 'change' ||
            isReverting.current ||
            trimmedDraft === editValue
        ) {
            isReverting.current = false;
            setDraft(editValue);
            return;
        }
        const parsed = parseValid(trimmedDraft);
        if (parsed === undefined) {
            setDraft(editValue);
            return;
        }
        onCommit(parsed);
    }, [commitOn, draft, editValue, onCommit, parseValid]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Escape') {
                isReverting.current = true;
            }
            if (event.key === 'Enter' || event.key === 'Escape') {
                event.currentTarget.blur();
            }
        },
        [],
    );

    const hasProgressFill = progress !== undefined && variant !== 'zero';
    const rootSx = useMemo(
        () =>
            [
                styles.root,
                variant === 'overridden' && styles.overridden,
                variant === 'zero' && styles.zero,
                Boolean(error) && styles.error,
                hasProgressFill && styles.progressInput,
                hasProgressFill && {
                    [PROGRESS_PROPERTY]: `${clampProgress(progress)}%`,
                    [PROGRESS_COLOR_PROPERTY]:
                        variant === 'overridden'
                            ? overrideColors.overriddenBackground
                            : overrideColors.progressFill,
                },
                ...(Array.isArray(sx) ? sx : [sx]),
            ] as SxProps<Theme>,
        [error, hasProgressFill, progress, sx, variant],
    );

    return (
        <Tooltip title={error || hint || ''}>
            <InputBase
                value={isFocused ? draft : displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                onClick={stopPropagation}
                disabled={disabled}
                error={Boolean(error)}
                sx={rootSx}
                inputProps={{
                    inputMode: 'decimal',
                    'aria-label': ariaLabel,
                    placeholder: displayPlaceholder,
                    onMouseDown: handleMouseDown,
                }}
                startAdornment={
                    prefix && (
                        <Typography variant="body2" sx={styles.affix}>
                            {prefix}
                        </Typography>
                    )
                }
                endAdornment={
                    suffix && (
                        <Typography variant="body2" sx={styles.affix}>
                            {suffix}
                        </Typography>
                    )
                }
            />
        </Tooltip>
    );
};
