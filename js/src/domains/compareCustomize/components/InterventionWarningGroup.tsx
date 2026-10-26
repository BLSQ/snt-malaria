import React, { FC } from 'react';
import { useSafeIntl } from 'bluesquare-components';
import { WarningGroup } from '../../../components/WarningGroup';
import { MESSAGES } from '../../messages';
import { MatchWarningGroup } from '../types';

type Props = {
    group: MatchWarningGroup;
};

export const InterventionWarningGroup: FC<Props> = ({ group }) => {
    const { formatMessage } = useSafeIntl();

    return (
        <WarningGroup
            chips={group.interventionNames}
            scenarios={group.scenarios}
            countLabel={formatMessage(MESSAGES.warningDistrictsCount, {
                count: group.orgUnitNames.length,
            })}
            items={group.orgUnitNames}
        />
    );
};
