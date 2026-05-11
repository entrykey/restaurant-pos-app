import React, { useState } from 'react';
import PlanList from './PlanList';
import PlanForm from './PlanForm';

const PlanManagement = () => {
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [planToEdit, setPlanToEdit] = useState(null);

    const handleAddNew = () => {
        setPlanToEdit(null);
        setView('form');
    };

    const handleEdit = (plan) => {
        setPlanToEdit(plan);
        setView('form');
    };

    const handleBackToList = () => {
        setPlanToEdit(null);
        setView('list');
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {view === 'list' ? (
                <PlanList onEdit={handleEdit} onAddNew={handleAddNew} />
            ) : (
                <PlanForm planToEdit={planToEdit} onBack={handleBackToList} />
            )}
        </div>
    );
};

export default PlanManagement;
