import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { usePermission } from '../../auth/usePermission';
import { ACTIONS } from '../../constants/actions';
import SuperAdminDashboard from '../SuperAdminDashboard/SuperAdminDashboard';
import ShopDashboard from './ShopDashboard';
import StaffDashboard from '../Staff/StaffDashboard';

import { MODULES } from '../../constants/modules';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
    const { can } = usePermission();
    const { user } = useAuth();
    const { shopName } = useParams();
    const location = useLocation();

    const isSuperAdmin = user?.isSuperAdmin === true || user?.role === 'superadmin' || user?.role?.name === 'superadmin';

    // Check if the user is a super admin (PRIORITY)
    if (isSuperAdmin) {
        return <SuperAdminDashboard />;
    }

    // Check if the user has SHOP.DASHBOARD permission
    const isShopManager = can(MODULES.DASHBOARD, "SHOP.DASHBOARD") || can("DASHBOARD", "SHOP.DASHBOARD");

    // Check if the user has STAFF.DASHBOARD permission
    const isStaff = can(MODULES.DASHBOARD, ACTIONS.STAFF_DASHBOARD) || can("DASHBOARD", ACTIONS.STAFF_DASHBOARD) || can("69abb4069b697daaf0909284", ACTIONS.STAFF_DASHBOARD);

    console.log("Dashboard rendering. isShopManager:", isShopManager, "isStaff:", isStaff);

    // If a shop is selected in the URL (/{shopName}/...), prefer SHOP dashboard when permitted.
    // This ensures clicking "Dashboard" from shop pages stays in shop context.
    const inShopContext =
        Boolean(shopName) &&
        (location.pathname.startsWith(`/${shopName}/`) || location.pathname === `/${shopName}`);

    if (inShopContext && isShopManager) {
        return <ShopDashboard />;
    }

    if (isShopManager) {
        return <ShopDashboard />;
    }

    if (isStaff) {
        return <StaffDashboard />;
    }

    // Default or fallback dashboard
    return (
        <div className="flex w-full h-full items-center justify-center p-8">
            <div className="text-center w-full max-w-xl p-12 bg-white rounded-3xl shadow-sm border border-gray-100">
                <div className="w-24 h-24 mx-auto mb-6 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 font-bold">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">Welcome!</h2>
                <p className="text-gray-500">Your personalized dashboard will be available soon.</p>
            </div>
        </div>
    );
};

export default Dashboard;
