import React from 'react';
import { FC } from 'react';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Box } from '@mui/material';
import { IconButton } from 'bluesquare-components';
import InputComponent from 'Iaso/components/forms/InputComponent';
import { noOp } from 'Iaso/utils';
import { useGetInterventionCostCategories } from '../../hooks/useGetInterventionCostCategories';
import { MESSAGES } from '../../messages';

//TODO Type cost details
type Props = {
    onUpdateField: (field: string, value: any) => void;
    costDetails: { name: string; category: number; cost: number; id: number }[];
};

export const InterventionCostDetailsForm: FC<Props> = ({
    costDetails,
    onUpdateField,
}) => {
    return costDetails ? (
        <Box>
            {costDetails.map((cd, index) => (
                <InterventionCostDetailsRow
                    key={`cost-details-row-${cd.id}`}
                    costDetails={cd}
                    onUpdateField={(field, value) =>
                        onUpdateField(`costDetails[${index}].${field}`, value)
                    }
                    onRemove={() => {}}
                />
            ))}
        </Box>
    ) : (
        <></>
    );
};

type RowProps = {
    costDetails: any;
    onUpdateField: (field: string, value: any) => void;
    onRemove: () => void;
};

export const InterventionCostDetailsRow: FC<RowProps> = ({
    costDetails = {},
    onUpdateField,
    onRemove = noOp,
}) => {
    const interventionCostCategories = useGetInterventionCostCategories();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
            <IconButton
                onClick={() => onRemove()}
                overrideIcon={RemoveCircleOutlineIcon}
                tooltipMessage={MESSAGES.removeDetailedCost}
            ></IconButton>
            <InputComponent
                keyValue="name"
                onChange={onUpdateField}
                value={costDetails.name}
                type="text"
                labelString="yay"
                required
                withMarginTop={false}
            />
            <InputComponent
                type="select"
                keyValue="category"
                multi={false}
                withMarginTop={false}
                wrapperSx={{ flexGrow: 1 }}
                options={interventionCostCategories}
                value={costDetails.category}
                onChange={onUpdateField}
            />
            <InputComponent
                type="number"
                keyValue="cost"
                onChange={onUpdateField}
                required
                withMarginTop={false}
                labelString="Unit Cost"
                wrapperSx={{ width: '95px' }}
                value={costDetails.cost}
            />
        </Box>
    );
};
