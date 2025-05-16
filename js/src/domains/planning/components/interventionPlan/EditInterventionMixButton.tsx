import React, { FunctionComponent } from 'react';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

type Props = {
    onClick: () => void;
    id?: string;
    dataTestId?: string;
    size?: string;
};

export const EditInterventionMixButton: FunctionComponent<Props> = props => {
    return (
        <EditOutlinedIcon
            {...props}
            sx={{
                height: '20px',
                width: '20px',
                top: '2.5px',
                left: '2.5px',
                color: '#0000008A',
            }}
        />
    );
};
