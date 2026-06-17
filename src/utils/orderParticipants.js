export const normalizeUserId = (val) => {
    if (!val) return '';
    if (typeof val === 'object') return String(val._id || val.id || '');
    return String(val);
};

export const getOrderParticipantNames = (order) => {
    if (!order) return [];
    const seen = new Set();
    const names = [];

    const add = (userRef, fallbackName) => {
        const id = normalizeUserId(userRef);
        const name =
            (typeof userRef === 'object' && userRef !== null && (userRef.name || userRef.username))
            || fallbackName
            || null;
        if (!name) return;
        const key = id || name;
        if (seen.has(key)) return;
        seen.add(key);
        names.push(name);
    };

    add(order.managedBy);
    (order.actedBy || []).forEach((entry) => add(entry.userId, entry.name));
    if (names.length === 0) add(order.createdBy);

    return names;
};

export const formatParticipantLabel = (names) => {
    if (!names?.length) return null;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} + ${names[1]}`;
    return `${names[0]} + ${names.length - 1} more`;
};
