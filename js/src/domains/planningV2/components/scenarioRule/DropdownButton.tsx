import React, { FC, Fragment, useCallback, useMemo } from 'react';
import {
    Box,
    Button,
    ClickAwayListener,
    ListSubheader,
    MenuItem,
    MenuList,
    Popover,
    Typography,
} from '@mui/material';
import { IntlMessage, useSafeIntl } from 'bluesquare-components';

type Props = {
    label: IntlMessage;
    options: {
        value: number;
        label: string;
        groupLabel?: string;
        groupKey?: string;
    }[];
    onClick: (value: number) => void;
    variant?: 'text' | 'outlined' | 'contained';
    size?: 'small' | 'medium' | 'large';
    groupOptions?: boolean;
};

export const DropdownButton: FC<Props> = ({
    label,
    options,
    onClick,
    variant,
    size,
    groupOptions = false,
}) => {
    const { formatMessage } = useSafeIntl();
    const anchorRef = React.useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = React.useState(false);

    const disabled = useMemo(() => !options || options.length <= 0, [options]);

    const handleOnClick = useCallback(
        (value: number) => {
            setIsOpen(false);
            onClick(value);
        },
        [onClick],
    );

    const defaultGroupKey = 'default_group_key';
    const groupedOptions = useMemo(() => {
        if (!groupOptions) return [];

        const result: {
            label: string | undefined;
            options: typeof options;
        }[] = [];

        // Used to keep track of the index of each group in the result array
        const keyMap = new Map<string, number>();

        options.forEach(option => {
            const groupKey = option.groupKey ?? defaultGroupKey;
            const index = keyMap.get(groupKey);

            if (index === undefined) {
                keyMap.set(groupKey, result.length);
                result.push({
                    label: option.groupLabel,
                    options: [option],
                });
            } else {
                result[index].options.push(option);
            }
        });

        return result;
    }, [options, groupOptions]);

    return (
        <>
            <Box ref={anchorRef}>
                <Button
                    onClick={() => setIsOpen(true)}
                    variant={variant}
                    size={size}
                    disabled={disabled}
                >
                    {formatMessage(label)}
                </Button>
            </Box>
            <Popover
                open={isOpen}
                onClose={() => setIsOpen(false)}
                anchorEl={anchorRef.current}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            >
                <ClickAwayListener onClickAway={() => setIsOpen(false)}>
                    <MenuList>
                        {groupOptions ? (
                            groupedOptions.map(group => (
                                <Fragment key={group.label}>
                                    <ListSubheader>{group.label}</ListSubheader>
                                    <DropdownOptionItems
                                        options={group.options}
                                        onClick={handleOnClick}
                                    />
                                </Fragment>
                            ))
                        ) : (
                            <DropdownOptionItems
                                options={options}
                                onClick={handleOnClick}
                            />
                        )}
                    </MenuList>
                </ClickAwayListener>
            </Popover>
        </>
    );
};

const DropdownOptionItems = ({
    options,
    onClick,
}: {
    options: { value: number; label: string }[];
    onClick: (value: number) => void;
}) =>
    options.map(option => (
        <MenuItem key={option.value} onClick={() => onClick(option.value)}>
            <Typography>{option.label}</Typography>
        </MenuItem>
    ));
