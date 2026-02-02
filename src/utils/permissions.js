export const hasPermission = (user, permissionKey) => {
    if (!user) return false;
    if (user.role === "Admin") return true;
    return (
        user.permissions && user.permissions.includes(permissionKey)
    );
};
