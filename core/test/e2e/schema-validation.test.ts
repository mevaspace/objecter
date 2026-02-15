import { Objecter } from '../../src/objecter';
import { ValidationError } from '../../src/errors/validation.error';
import { ConfirmationDTO } from './fixtures';

afterEach(() => {
  Objecter.resetConfig();
  Objecter.clearProfiles();
});

describe('Feature 7: Schema-Level Validation', () => {
  describe('Positive Cases', () => {
    it('should pass when code matches confirmCode', () => {
      const source = { code: 'abc', confirm: 'abc' };
      const result = Objecter.convert(source, ConfirmationDTO, [{ from: 'code' }, { from: 'confirm' }], {
        strictMapping: false,
        validateSchema: (target: unknown) => {
          const t = target as { code: string; confirm: string };
          if (t.code === t.confirm) return { valid: true };
          return { valid: false, errors: ['code and confirm must match'] };
        },
      });
      expect(result.code).toBe('abc');
      expect(result.confirm).toBe('abc');
    });
  });

  describe('Negative Cases', () => {
    it('should throw ValidationError when code != confirmCode', () => {
      const source = { code: 'abc', confirm: 'xyz' };
      expect(() =>
        Objecter.convert(source, ConfirmationDTO, [{ from: 'code' }, { from: 'confirm' }], {
          strictMapping: false,
          validateSchema: (target: unknown) => {
            const t = target as { code: string; confirm: string };
            if (t.code === t.confirm) return { valid: true };
            return { valid: false, errors: ['Schema validation failed: code and confirm must match'] };
          },
        }),
      ).toThrow(ValidationError);
    });

    it('should wrap unhandled validator exception as MappingError', () => {
      const source = { code: 'abc', confirm: 'abc' };
      expect(() =>
        Objecter.convert(source, ConfirmationDTO, [{ from: 'code' }, { from: 'confirm' }], {
          strictMapping: false,
          validateSchema: () => {
            throw new Error('Ops');
          },
        }),
      ).toThrow('Ops');
    });
  });
});
