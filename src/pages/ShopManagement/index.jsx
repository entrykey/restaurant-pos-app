import React, { useState } from 'react';
import ShopList from './ShopList';
import ShopForm from './ShopForm';

const ShopManagement = () => {
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [shopToEdit, setShopToEdit] = useState(null);

    const handleAddNew = () => {
        setShopToEdit(null);
        setView('form');
    };

    const handleEdit = (shop) => {
        setShopToEdit(shop);
        setView('form');
    };

    const handleBackToList = () => {
        setShopToEdit(null);
        setView('list');
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {view === 'list' ? (
                <ShopList onEdit={handleEdit} onAddNew={handleAddNew} />
            ) : (
                <ShopForm shopToEdit={shopToEdit} onBack={handleBackToList} />
            )}
        </div>
    );
};

export default ShopManagement;
