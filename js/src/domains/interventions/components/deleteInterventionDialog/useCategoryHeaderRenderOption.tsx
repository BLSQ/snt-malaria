import React, { Fragment, ReactNode, useCallback, useRef } from 'react';
import { Box, ListSubheader } from '@mui/material';
import { SxStyles } from 'Iaso/types/general';
import { optionMenuStyles } from '../../../../components/optionMenuStyles';

export type CategorySelectOption = {
    value: number;
    label: string;
    groupKey: string;
    groupLabel: string;
};

const styles = {
    selectedValue: {
        pl: 0.75,
        color: 'text.primary',
        whiteSpace: 'nowrap',
    },
} satisfies SxStyles;

type RenderOption = (
    props: Record<string, any>,
    option: Record<string, any>,
) => ReactNode;

/** Options must be ordered by category; a header precedes the first visible option of each one. */
export const useCategoryHeaderRenderOption = (): RenderOption => {
    const previousGroupKey = useRef<string>();
    return useCallback((props, option) => {
        // bluesquare's Select also calls this without an option to draw the selected value over its transparent input.
        if (option.value === undefined) {
            return (
                <Box component="span" sx={styles.selectedValue}>
                    {props.label}
                </Box>
            );
        }
        const { key, ...optionProps } = props;
        const isFirstInGroup =
            props['data-option-index'] === 0 ||
            previousGroupKey.current !== option.groupKey;
        previousGroupKey.current = option.groupKey;
        return (
            <Fragment key={key ?? option.value}>
                {isFirstInGroup && (
                    <ListSubheader sx={optionMenuStyles.groupLabel}>
                        {option.groupLabel}
                    </ListSubheader>
                )}
                <li {...optionProps}>{option.label}</li>
            </Fragment>
        );
    }, []);
};
