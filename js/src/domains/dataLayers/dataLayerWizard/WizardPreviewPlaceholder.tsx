import React, { FC } from 'react';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import { IntlMessage, useSafeIntl } from 'bluesquare-components';
import { EmptyPlaceholder } from '../../../components/EmptyPlaceholder';
import { MESSAGES } from '../messages';
import { WizardMainCard } from './WizardMainCard';

type Props = {
    message?: IntlMessage;
};

export const WizardPreviewPlaceholder: FC<Props> = ({
    message = MESSAGES.wizardPreviewPlaceholder,
}) => {
    const { formatMessage } = useSafeIntl();
    return (
        <WizardMainCard>
            <EmptyPlaceholder
                icon={TableChartOutlinedIcon}
                message={formatMessage(message)}
            />
        </WizardMainCard>
    );
};
