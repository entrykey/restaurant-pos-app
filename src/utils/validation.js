/**
 * Validates email format strictly.
 * - Exactly one '@' symbol
 * - Local part starts and ends with alphanumeric characters, no consecutive dots/dashes
 * - Domain part must contain at least one dot
 * - Domain label (before TLD) MUST contain at least one letter (cannot be purely digits like 123123123123123.com)
 * - TLD must be at least 2 alphabetic characters
 */
export const validateEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const cleanEmail = email.trim().toLowerCase();
    
    // Total length constraints
    if (cleanEmail.length < 5 || cleanEmail.length > 254) return false;

    // Check exactly one '@'
    const atCount = (cleanEmail.match(/@/g) || []).length;
    if (atCount !== 1) return false;

    const [local, domain] = cleanEmail.split('@');
    if (!local || !domain) return false;

    // Local part checks: alphanumeric start and end, no consecutive dots
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?$/.test(local) || local.includes('..') || local.includes('--')) {
        return false;
    }

    // Domain part checks
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;

    const tld = domainParts[domainParts.length - 1];
    if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

    // Domain labels check
    for (let i = 0; i < domainParts.length - 1; i++) {
        const label = domainParts[i];
        if (!label || !/^[a-zA-Z0-9-]+$/.test(label) || label.startsWith('-') || label.endsWith('-')) {
            return false;
        }
        // The main domain label (right before TLD) must contain at least one letter
        if (i === domainParts.length - 2 && !/[a-zA-Z]/.test(label)) {
            return false;
        }
    }

    return true;
};

/**
 * Sanitizes input typed into email field:
 * - Removes invalid characters
 * - Strips leading special characters (cannot start with '-', '.', '@', '_', '+', '%')
 * - Collapses consecutive hyphens/dots/underscores
 * - Prevents multiple '@' symbols
 */
export const sanitizeEmailInput = (value) => {
    if (!value) return '';
    let val = value.toLowerCase().replace(/[^a-z0-9@._%+-]/g, '');
    
    // Prevent starting with non-alphanumeric characters
    val = val.replace(/^[^a-z0-9]+/, '');

    // Prevent consecutive special characters
    val = val.replace(/-{2,}/g, '-')
             .replace(/\.{2,}/g, '.')
             .replace(/_{2,}/g, '_')
             .replace(/\+{2,}/g, '+');

    // Allow at most 1 '@' symbol
    const parts = val.split('@');
    if (parts.length > 2) {
        val = parts[0] + '@' + parts.slice(1).join('');
    }
    return val;
};

/**
 * Sanitizes input typed into name/person fields:
 * - Allows letters, spaces, dots, hyphens, and apostrophes
 * - Strips leading special characters/dots/hyphens/spaces (must start with letter)
 * - Collapses consecutive hyphens, dots, or spaces
 */
export const sanitizeNameInput = (value) => {
    if (!value) return '';
    let val = value.replace(/[^a-zA-Z\s.'-]/g, '');

    // Must start with a letter
    val = val.replace(/^[^a-zA-Z]+/, '');

    // Prevent consecutive hyphens, dots, or spaces
    val = val.replace(/-{2,}/g, '-')
             .replace(/\.{2,}/g, '.')
             .replace(/\s{2,}/g, ' ');

    return val;
};

/**
 * Sanitizes input typed into phone fields:
 * - Allows optional leading '+' and digits only
 * - Strips non-digits
 * - Max length: 15 digits
 */
export const sanitizePhoneInput = (value) => {
    if (!value) return '';
    const trimmed = value.trim();
    const hasPlus = trimmed.startsWith('+');
    let digits = trimmed.replace(/[^0-9]/g, '');
    if (digits.length > 15) digits = digits.slice(0, 15);
    return hasPlus ? '+' + digits : digits;
};

/**
 * Validates password criteria:
 * - Minimum 6 characters
 * - Must contain at least one letter (a-z, A-Z)
 * - Cannot be a single repeated character (e.g., @@@@@@, aaaaaa, 111111)
 * - Cannot be purely special characters
 */
export const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'Password is required' };
    }

    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters' };
    }

    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one letter' };
    }

    // Cannot be a single repeated character
    const isSingleCharRepeated = new Set(password.split('')).size === 1;
    if (isSingleCharRepeated) {
        return { valid: false, message: 'Password cannot be a single repeated character' };
    }

    return { valid: true };
};

/**
 * Sanitizes input typed into Email/Phone identifier fields (e.g. Login)
 * - If input contains '@' or letters, sanitizes as email
 * - If input starts with '+' or contains digits, sanitizes as phone
 * - Otherwise (e.g. pure hyphens, spaces, dots), strips non-alphanumeric leading chars
 */
export const sanitizeIdentifierInput = (value) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (/[a-zA-Z@]/.test(value)) {
        return sanitizeEmailInput(value);
    }
    if (trimmed.startsWith('+') || /^[0-9]/.test(trimmed)) {
        return sanitizePhoneInput(value);
    }
    return value.replace(/^[^a-zA-Z0-9]+/, '');
};

