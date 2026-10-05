import React, {
    ChangeEvent,
    FC,
    FocusEvent,
    KeyboardEvent,
    MouseEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { InputBase, Typography } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

type Props = {
    keyValue: string;
    value: number | string;
    onCommit: (keyValue: string, value: number) => void;
    maxDecimals: number;
    minDecimals?: number;
    ariaLabel: string;
    prefix?: string;
    suffix?: string;
    min?: number;
    max?: number;
    disabled?: boolean;
};

const styles = {
    root: {
        width: '100%',
        height: 28,
        px: 0.75,
        gap: 0.25,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'rgba(31, 43, 61, 0.23)',
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
        },
    },
    affix: {
        color: 'text.disabled',
        flexShrink: 0,
    },
} satisfies SxStyles;

const numberFormats = new Map<string, Intl.NumberFormat>();

const getNumberFormat = (minDecimals: number, maxDecimals: number) => {
    const key = `${minDecimals}-${maxDecimals}`;
    let numberFormat = numberFormats.get(key);
    if (!numberFormat) {
        numberFormat = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: minDecimals,
            maximumFractionDigits: maxDecimals,
            useGrouping: false,
        });
        numberFormats.set(key, numberFormat);
    }
    return numberFormat;
};

const formatValue = (
    value: number | string,
    minDecimals: number,
    maxDecimals: number,
) => {
    const parsed = Number(value);
    return Number.isNaN(parsed)
        ? ''
        : getNumberFormat(minDecimals, maxDecimals).format(parsed);
};

const parseDraft = (draft: string) => {
    const normalized = draft.trim().replace(',', '.');
    return normalized === '' ? NaN : Number(normalized);
};

const stopPropagation = (event: MouseEvent) => event.stopPropagation();

const selectContent = (event: FocusEvent<HTMLInputElement>) =>
    event.target.select();

// Uncontrolled while typing: the value is committed on blur or Enter, and
// Escape (or an invalid entry) restores the last saved value.
export const InlineNumberField: FC<Props> = ({
    keyValue,
    value,
    onCommit,
    maxDecimals,
    minDecimals = 0,
    ariaLabel,
    prefix,
    suffix,
    min = 0,
    max,
    disabled = false,
}) => {
    const formattedValue = formatValue(value, minDecimals, maxDecimals);
    const [draft, setDraft] = useState(formattedValue);
    const isReverting = useRef(false);

    useEffect(() => {
        setDraft(formattedValue);
    }, [formattedValue]);

    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
        [],
    );

    const handleBlur = useCallback(() => {
        const parsed = parseDraft(draft);
        const isOutOfRange =
            parsed < min || (max !== undefined && parsed > max);
        if (
            isReverting.current ||
            Number.isNaN(parsed) ||
            isOutOfRange ||
            draft.trim() === formattedValue
        ) {
            isReverting.current = false;
            setDraft(formattedValue);
            return;
        }
        // The API rejects values with more decimals than the field stores.
        onCommit(keyValue, Number(parsed.toFixed(maxDecimals)));
    }, [draft, formattedValue, keyValue, max, maxDecimals, min, onCommit]);

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

    return (
        <InputBase
            value={draft}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={selectContent}
            onKeyDown={handleKeyDown}
            onClick={stopPropagation}
            disabled={disabled}
            sx={styles.root}
            inputProps={{
                inputMode: 'decimal',
                'aria-label': ariaLabel,
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
    );
};
