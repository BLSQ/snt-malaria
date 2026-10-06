import React, { FC } from 'react';
import { RuleItemCard } from './RuleItemCard';

type Props = {
    interventionName: string;
    categoryName: string;
    onRemove: () => void;
};

export const InterventionPropertyForm: FC<Props> = ({
    interventionName,
    categoryName,
    onRemove,
}) => (
    <RuleItemCard
        title={interventionName}
        caption={categoryName}
        onRemove={onRemove}
    />
);
