import React, { FC } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Box, IconButton } from '@mui/material';
import { useSafeIntl } from 'bluesquare-components';
import { SxStyles } from 'Iaso/types/general';
import { MESSAGES } from '../messages';

/** Comparison operators offered per rule. Must mirror `CLASSIFY_OPERATORS` in the backend evaluator. */
const OPERATORS = ['<', '<=', '>', '>=', '==', '!='];

export type MappingRule = {
    op: string;
    value: number | '';
    label: string;
};

export type MappingConfig = {
    rules: MappingRule[];
    default: string;
};

const EMPTY_CONFIG: MappingConfig = { rules: [], default: '' };

// Shared column template so every rule row and the `else` row line up: operator, value, arrow,
// class, delete. `1fr` lets the class/default inputs share one consistent width.
const GRID_COLUMNS = '50px 96px 18px 1fr 34px';

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        width: '100%',
        '& select, & input': {
            width: '100%',
            boxSizing: 'border-box',
            background: theme => theme.palette.background.paper,
            color: theme => theme.palette.text.primary,
            border: theme => `1px solid ${theme.palette.divider}`,
            borderRadius: '6px',
            padding: theme => theme.spacing(0.5),
            fontSize: 13,
            minWidth: 0,
        },
    },
    row: {
        display: 'grid',
        gridTemplateColumns: GRID_COLUMNS,
        alignItems: 'center',
        columnGap: 0.75,
    },
    arrow: {
        color: 'text.primary',
        fontSize: 16,
        lineHeight: 1,
        textAlign: 'center',
    },
    elseLabel: {
        // Span operator + value columns so the shared arrow column lines up with the rule rows.
        gridColumn: '1 / 3',
        textAlign: 'right',
        color: 'text.secondary',
        fontSize: 13,
    },
    iconButton: {
        justifySelf: 'center',
    },
    helper: {
        color: 'text.secondary',
        fontSize: 11,
        lineHeight: 1.3,
        mt: 0,
        mb: 0.5,
    },
} satisfies SxStyles;

type Props = {
    value?: MappingConfig;
    onChange: (value: MappingConfig) => void;
};

/**
 * Editor for a `classify` node's ordered threshold rules (e.g. `< 100 -> LOW`).
 * Rendered as a Flume custom control; the whole graph config is stored as the control's value.
 *
 * Native `<select>`/`<input>` elements are used on purpose: their dropdowns are browser-rendered
 * and therefore unaffected by the editor's CSS `transform: scale(...)`, unlike MUI portals.
 */
export const MappingsControl: FC<Props> = ({ value, onChange }) => {
    const { formatMessage } = useSafeIntl();
    const config: MappingConfig =
        value && Array.isArray(value.rules) ? value : EMPTY_CONFIG;

    const update = (patch: Partial<MappingConfig>) =>
        onChange({ ...config, ...patch });

    const updateRule = (index: number, patch: Partial<MappingRule>) =>
        update({
            rules: config.rules.map((rule, i) =>
                i === index ? { ...rule, ...patch } : rule,
            ),
        });

    const addRule = () =>
        update({
            rules: [...config.rules, { op: '<', value: '', label: '' }],
        });

    const removeRule = (index: number) =>
        update({ rules: config.rules.filter((_, i) => i !== index) });

    return (
        <Box
            sx={styles.root}
            // Stop Flume from turning clicks/typing into a node drag (mirrors its built-in inputs).
            onMouseDown={e => e.stopPropagation()}
        >
            <Box component="p" sx={styles.helper}>
                {formatMessage(MESSAGES.mappingsHelper)}
            </Box>
            {config.rules.map((rule, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <Box sx={styles.row} key={index}>
                    <select
                        value={rule.op}
                        onChange={e =>
                            updateRule(index, { op: e.target.value })
                        }
                    >
                        {OPERATORS.map(op => (
                            <option key={op} value={op}>
                                {op}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        placeholder={formatMessage(
                            MESSAGES.mappingsValuePlaceholder,
                        )}
                        value={rule.value}
                        onChange={e =>
                            updateRule(index, {
                                value:
                                    e.target.value === ''
                                        ? ''
                                        : Number(e.target.value),
                            })
                        }
                    />
                    <Box component="span" sx={styles.arrow}>
                        →
                    </Box>
                    <input
                        type="text"
                        placeholder={formatMessage(
                            MESSAGES.mappingsClassPlaceholder,
                        )}
                        value={rule.label}
                        onChange={e =>
                            updateRule(index, { label: e.target.value })
                        }
                    />
                    <IconButton
                        size="small"
                        sx={styles.iconButton}
                        aria-label="remove-mapping"
                        onClick={() => removeRule(index)}
                    >
                        <DeleteOutlineIcon fontSize="inherit" />
                    </IconButton>
                </Box>
            ))}
            <Box sx={styles.row}>
                <Box component="span" sx={styles.elseLabel}>
                    {formatMessage(MESSAGES.mappingsElse)}
                </Box>
                <Box component="span" sx={styles.arrow}>
                    →
                </Box>
                <input
                    type="text"
                    placeholder={formatMessage(
                        MESSAGES.mappingsClassPlaceholder,
                    )}
                    value={config.default}
                    onChange={e => update({ default: e.target.value })}
                />
                {/* Add button aligns with the delete bins, in the last column. */}
                <IconButton
                    size="small"
                    sx={styles.iconButton}
                    aria-label="add-mapping"
                    onClick={addRule}
                >
                    <AddIcon fontSize="inherit" />
                </IconButton>
            </Box>
        </Box>
    );
};
