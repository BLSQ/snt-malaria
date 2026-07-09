import React, { FC } from 'react';
import { Box } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';

/**
 * Single-line text control for the composite layer name. Flume's built-in text control renders a
 * resizable `<textarea>`; here we use a plain `<input>` instead. It reuses the editor's stable
 * `data-flume-component` hooks (`control-label`, `text-input`) so the shared theme styles it.
 */

const styles = {
    input: {
        width: '100%',
        boxSizing: 'border-box',
    },
} satisfies SxStyles;

type Props = {
    value?: string;
    label?: string;
    placeholder?: string;
    onChange: (value: string) => void;
};

export const NameControl: FC<Props> = ({
    value,
    label,
    placeholder,
    onChange,
}) => (
    <Box
        // Stop Flume from turning clicks/typing into a node drag (mirrors its built-in inputs).
        onMouseDown={e => e.stopPropagation()}
    >
        {label && (
            <Box component="label" data-flume-component="control-label">
                {label}
            </Box>
        )}
        <Box data-flume-component="text-input">
            <Box
                component="input"
                type="text"
                sx={styles.input}
                placeholder={placeholder}
                value={value ?? ''}
                onChange={e => onChange(e.target.value)}
                onDragStart={e => e.stopPropagation()}
            />
        </Box>
    </Box>
);
