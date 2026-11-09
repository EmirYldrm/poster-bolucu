import { describe, expect, it } from 'vitest';
import { isPdfResourceError } from './pdfErrors';

describe('isPdfResourceError', () => {
  it('recognizes memory and allocation failures', () => {
    expect(isPdfResourceError(new RangeError('Array buffer allocation failed'))).toBe(true);
    expect(isPdfResourceError('Out of memory')).toBe(true);
    expect(isPdfResourceError(new Error('Invalid array length'))).toBe(true);
  });

  it('does not label malformed or password-protected PDFs as size errors', () => {
    expect(isPdfResourceError(new Error('Invalid PDF structure'))).toBe(false);
    expect(isPdfResourceError(new Error('No password given'))).toBe(false);
  });
});
