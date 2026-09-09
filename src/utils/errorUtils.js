/**
 * Extracts a clean, human-readable error message from backend API responses or Error objects.
 * Handles re-thrown response data objects, standard Axios errors, string errors, and fallbacks.
 */
export const getErrorMessage = (error, defaultMsg = "An error occurred during processing.") => {
    if (!error) return defaultMsg;
    if (typeof error === 'string') return error;

    // 1. Direct message property (e.g. re-thrown error.response.data or Error object)
    if (error.message && typeof error.message === 'string' && error.message.trim()) {
        return error.message;
    }

    // 2. Axios error.response.data.message
    if (error.response?.data?.message && typeof error.response.data.message === 'string' && error.response.data.message.trim()) {
        return error.response.data.message;
    }

    // 3. Axios error.response.data string
    if (typeof error.response?.data === 'string' && error.response.data.trim()) {
        return error.response.data;
    }

    // 4. Nested data.message
    if (error.data?.message && typeof error.data.message === 'string' && error.data.message.trim()) {
        return error.data.message;
    }

    // 5. Database errmsg
    if (error.errmsg && typeof error.errmsg === 'string' && error.errmsg.trim()) {
        return error.errmsg;
    }

    return defaultMsg;
};
