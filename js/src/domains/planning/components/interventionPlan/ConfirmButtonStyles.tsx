import React, { FunctionComponent } from 'react';
import theme from '../../../../constants/theme';

export const ConfirmButtonStyles: FunctionComponent = () => (
    <style>
        {`
            [data-test="confirm-button"] {
                background-color: ${theme.palette.primary.main};

                border: none;
                text-transform: none;
                color: #fff;
            }
            [data-test="confirm-button"]:hover {
                background-color: ${theme.palette.primary.main};
            }
        `}
    </style>
);
