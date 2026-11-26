import { getCurrencySymbol, formatCurrency, formatDate } from '../utils/format';
import {
    validateEmail,
    sanitizeEmailInput,
    sanitizeNameInput,
    normalizePhoneNumber,
    arePhoneNumbersEqual,
    sanitizePhoneInput,
    validatePassword,
    sanitizeIdentifierInput,
} from '../utils/validation';

describe('format.js', () => {
    test('getCurrencySymbol resolves codes and objects', () => {
        expect(getCurrencySymbol('INR')).toBe('₹');
        expect(getCurrencySymbol('usd')).toBe('$');
        expect(getCurrencySymbol({ code: 'EUR' })).toBe('€');
        expect(getCurrencySymbol('AED')).toBe('AED');
    });

    test('formatCurrency formats positive, negative, and invalid amounts', () => {
        expect(formatCurrency(1250, 'INR')).toBe('₹1,250.00');
        expect(formatCurrency(-45.5, 'USD')).toBe('-$45.50');
        expect(formatCurrency(null, 'INR')).toBe('₹0.00');
        expect(formatCurrency(NaN, 'INR')).toBe('₹0.00');
        expect(formatCurrency(100, 'AED')).toBe('100.00 AED');
    });

    test('formatDate handles empty and valid ISO dates', () => {
        expect(formatDate(null)).toBe('N/A');
        expect(formatDate('')).toBe('N/A');
        const formatted = formatDate('2026-11-26T10:00:00Z');
        expect(formatted).toContain('2026');
    });
});

describe('validation.js', () => {
    test('validateEmail accepts valid emails and rejects malformed ones', () => {
        expect(validateEmail('owner@filepe.com')).toBe(true);
        expect(validateEmail('a@b.co')).toBe(true);
        expect(validateEmail('user@12345.com')).toBe(false);
        expect(validateEmail('bad..user@test.com')).toBe(false);
        expect(validateEmail('noatsign.com')).toBe(false);
        expect(validateEmail('')).toBe(false);
    });

    test('sanitizeEmailInput and sanitizeNameInput clean invalid chars', () => {
        expect(sanitizeEmailInput('..Test@@Foo..com')).toBe('test@foo.com');
        expect(sanitizeNameInput('123  John   Doe--')).toBe('John Doe-');
    });

    test('normalizePhoneNumber and arePhoneNumbersEqual handle country codes', () => {
        expect(normalizePhoneNumber('+91 9876543210')).toBe('9876543210');
        expect(normalizePhoneNumber('09876543210')).toBe('9876543210');
        expect(normalizePhoneNumber('91-9876543210')).toBe('9876543210');
        expect(arePhoneNumbersEqual('+91 9876543210', '09876543210')).toBe(true);
        expect(arePhoneNumbersEqual('9876543210', '1234567890')).toBe(false);
    });

    test('sanitizePhoneInput preserves leading + and caps length', () => {
        expect(sanitizePhoneInput('  +91-98765 43210abc ')).toBe('+91-98765 43210');
    });

    test('validatePassword enforces length, letter, and non-repeated rules', () => {
        expect(validatePassword('').valid).toBe(false);
        expect(validatePassword('12345').valid).toBe(false);
        expect(validatePassword('123456').valid).toBe(false);
        expect(validatePassword('aaaaaa').valid).toBe(false);
        expect(validatePassword('pass12').valid).toBe(true);
    });

    test('sanitizeIdentifierInput routes email vs phone properly', () => {
        expect(sanitizeIdentifierInput('User@Test.com')).toBe('user@test.com');
        expect(sanitizeIdentifierInput('+91 98765')).toBe('+91 98765');
    });
});
