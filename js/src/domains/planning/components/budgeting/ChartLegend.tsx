import React, { FC } from 'react';
import { Box, List, ListItem, SxProps, Theme, Typography } from '@mui/material';
import { Payload } from 'recharts/types/component/DefaultLegendContent';
import { SxStyles } from 'Iaso/types/general';

type Props = {
    payload: Payload[] | undefined;
    wrapperSx?: SxProps<Theme>;
    renderValue?: (entry: any) => any;
};

const styles: SxStyles = {
    legendColorBox: {
        width: '1rem',
        height: '1rem',
        marginRight: 1,
        borderRadius: 0.5,
    },
    legendItem: {
        width: 'auto',
        paddingRight: 0,
    },
};

export const ChartLegend: FC<Props> = ({ payload, wrapperSx, renderValue }) => {
    return (
        <List sx={wrapperSx}>
            {payload?.map(entry => (
                <ListItem key={`item-${entry.value}`} sx={styles.legendItem}>
                    <Box
                        sx={{
                            ...styles.legendColorBox,
                            backgroundColor: entry.color,
                        }}
                    ></Box>
                    <Typography variant="body2">
                        {renderValue ? renderValue(entry) : entry.dataKey}
                    </Typography>
                </ListItem>
            ))}
        </List>
    );
};
