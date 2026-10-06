import React, {
    ChangeEvent,
    FC,
    FocusEvent,
    MouseEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { InputAdornment, TextField, Tooltip } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { compactInputStyles } from './styles';

const styles = {
    field: {
        flex: '0 0 96px',
        width: 96,
        '& .MuiInputBase-root': {
            ...compactInputStyles,
            px: 0.75,
        },
        '& .MuiInputBase-input': {
            p: 0,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
        },
        '& .MuiInputAdornment-root': {
            ml: 0.25,
        },
    },
    unitSymbol: {
        typography: 'body2',
        color: 'text.disabled',
    },
} satisfies SxStyles;

const toDraft = (value?: number) => (value == null ? '' : String(value));

const parseDraft = (draft: string): number | undefined | null => {
    const normalized = draft.trim().replace(',', '.');
    if (normalized === '') return undefined;
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? null : parsed;
};

type Props = {
    value?: number;
    onChange: (value?: number) => void;
    unitSymbol?: string;
    errors: string[];
    hint?: string;
};

export const CriterionValueInput: FC<Props> = ({
    value,
    onChange,
    unitSymbol,
    errors,
    hint,
}) => {
    const committedDraft = toDraft(value);
    const [draft, setDraft] = useState(committedDraft);
    const isFocused = useRef(false);

    useEffect(() => {
        if (!isFocused.current) {
            setDraft(committedDraft);
        }
    }, [committedDraft]);

    const handleChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            setDraft(event.target.value);
            const parsed = parseDraft(event.target.value);
            if (parsed !== null) {
                onChange(parsed);
            }
        },
        [onChange],
    );

    const handleFocus = useCallback(
        (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            isFocused.current = true;
            event.target.select();
        },
        [],
    );

    // Focus-only selection loses to the browser's caret placement on mouse clicks.
    const handleMouseDown = useCallback(
        (event: MouseEvent<HTMLInputElement>) => {
            const input = event.currentTarget;
            if (document.activeElement !== input) {
                event.preventDefault();
                input.focus();
                input.select();
            }
        },
        [],
    );

    const handleBlur = useCallback(() => {
        isFocused.current = false;
        setDraft(committedDraft);
    }, [committedDraft]);

    return (
        <Tooltip title={errors.join(', ') || hint}>
            <TextField
                size="small"
                inputProps={{
                    inputMode: 'decimal',
                    onMouseDown: handleMouseDown,
                }}
                value={draft}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                error={errors.length > 0}
                sx={styles.field}
                InputProps={{
                    endAdornment: unitSymbol ? (
                        <InputAdornment
                            position="end"
                            disableTypography
                            sx={styles.unitSymbol}
                        >
                            {unitSymbol}
                        </InputAdornment>
                    ) : undefined,
                }}
            />
        </Tooltip>
    );
};
