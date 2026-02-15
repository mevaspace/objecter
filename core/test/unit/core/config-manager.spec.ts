import { configure, resetConfig, getMergedOptions, DEFAULT_OPTIONS } from '../../../src/core/config-manager';

afterEach(() => {
  resetConfig();
});

describe('DEFAULT_OPTIONS', () => {
  it('should have expected default values', () => {
    expect(DEFAULT_OPTIONS.throwOnValidationError).toBe(true);
    expect(DEFAULT_OPTIONS.throwOnMissingFields).toBe(true);
    expect(DEFAULT_OPTIONS.copyUndefined).toBe(false);
    expect(DEFAULT_OPTIONS.strictMapping).toBe(true);
    expect(DEFAULT_OPTIONS.autoMap).toBe(false);
    expect(DEFAULT_OPTIONS.context).toEqual({});
  });
});

describe('configure', () => {
  it('should merge options with existing global options', () => {
    configure({ throwOnMissingFields: false });
    configure({ copyUndefined: true });

    const result = getMergedOptions();
    expect(result.throwOnMissingFields).toBe(false);
    expect(result.copyUndefined).toBe(true);
    expect(result.throwOnValidationError).toBe(true);
  });
});

describe('resetConfig', () => {
  it('should reset to DEFAULT_OPTIONS only', () => {
    configure({ throwOnMissingFields: false, copyUndefined: true });
    resetConfig();

    const result = getMergedOptions();
    expect(result.throwOnMissingFields).toBe(true);
    expect(result.copyUndefined).toBe(false);
  });
});

describe('getMergedOptions', () => {
  it('should return defaults when no overrides', () => {
    const result = getMergedOptions();
    expect(result).toEqual(DEFAULT_OPTIONS);
  });

  it('should merge global options over defaults', () => {
    configure({ strictMapping: false });
    const result = getMergedOptions();
    expect(result.strictMapping).toBe(false);
    expect(result.throwOnValidationError).toBe(true);
  });

  it('should merge per-call options over global options', () => {
    configure({ strictMapping: false });
    const result = getMergedOptions({ strictMapping: true, autoMap: true });
    expect(result.strictMapping).toBe(true);
    expect(result.autoMap).toBe(true);
  });

  it('should follow priority: DEFAULT < global < per-call', () => {
    configure({ throwOnMissingFields: false });
    const result = getMergedOptions({ throwOnMissingFields: true });
    expect(result.throwOnMissingFields).toBe(true);
  });
});
