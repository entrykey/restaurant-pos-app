import React, { useState } from 'react';
import SubscriptionList from './SubscriptionList';
import SubscriptionForm from './SubscriptionForm';

const SubscriptionManagement = () => {
    const [view, setView] = useState('list'); // 'list' | 'form'
    const [subscriptionToEdit, setSubscriptionToEdit] = useState(null);

    return (
        <div className="h-full w-full">
            {view === 'list' && (
                <SubscriptionList
                    setView={setView}
                    setSubscriptionToEdit={setSubscriptionToEdit}
                />
            )}
            {view === 'form' && (
                <SubscriptionForm
                    subscriptionToEdit={subscriptionToEdit}
                    onBack={() => {
                        setView('list');
                        setSubscriptionToEdit(null);
                    }}
                />
            )}
        </div>
    );
};

export default SubscriptionManagement;
