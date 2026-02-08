import { Objecter, FieldMapping, ValidationError as ObjValidationError, MappingContext } from '../../src';

class TargetDto {
  id!: number;
  name!: string;
  email!: string;
  role?: string;
}

// Helper to simulate async operation
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('Objecter Async Validation', () => {
  beforeEach(() => {
    Objecter.resetConfig();
    Objecter.clearProfiles();
  });

  describe('Field Level Validation', () => {
    it('should validate using async validator function', async () => {
      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const asyncValidator = async (value: string): Promise<{ valid: boolean; errors?: string[] }> => {
        await delay(1);
        return value === 'JOHN' ? { valid: true } : { valid: false, errors: ['Name must be JOHN'] };
      };

      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', transform: (v: string) => v.toUpperCase(), validateAsync: asyncValidator },
        { from: 'email', to: 'email' },
      ];

      const result = await Objecter.convertAsync(source, TargetDto, mapping);
      expect(result.name).toBe('JOHN');
    });

    it('should fail validation using async validator function', async () => {
      const source = { id: 1, name: 'jane', email: 'jane@test.com' };
      const asyncValidator = async (value: string): Promise<{ valid: boolean; errors?: string[] }> => {
        await delay(1);
        return value === 'JOHN' ? { valid: true } : { valid: false, errors: ['Name must be JOHN'] };
      };

      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', transform: (v: string) => v.toUpperCase(), validateAsync: asyncValidator },
      ];

      await expect(Objecter.convertAsync(source, TargetDto, mapping)).rejects.toThrow(ObjValidationError);
    });

    it('should validate using async predicate', async () => {
      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const asyncPredicate = async (value: string): Promise<boolean> => {
        await delay(1);
        return value.length > 3;
      };

      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', validateAsync: asyncPredicate },
      ];

      const result = await Objecter.convertAsync(source, TargetDto, mapping);
      expect(result.name).toBe('john');
    });

    it('should handle multiple async validators', async () => {
      const source = { id: 1, name: 'john', email: 'john@test.com' };
      const checkLength = async (value: string): Promise<boolean> => {
        await delay(1);
        return value.length > 3;
      };
      const checkContent = async (value: string): Promise<boolean> => {
        await delay(1);
        return value.includes('o');
      };

      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', validateAsync: [checkLength, checkContent] },
      ];

      const result = await Objecter.convertAsync(source, TargetDto, mapping);
      expect(result.name).toBe('john');
    });

    it('should run both sync and async validators in convertAsync', async () => {
      const source = { id: 1, name: 'jo', email: 'john@test.com' };

      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        {
          from: 'name',
          to: 'name',
          validate: (v: string) => v.length > 3, // Sync validator fails
          validateAsync: async () => {
            await delay(1);
            return true;
          }, // Async passes
        },
      ];

      await expect(Objecter.convertAsync(source, TargetDto, mapping)).rejects.toThrow(ObjValidationError);
    });
  });

  describe('Schema Level Validation', () => {
    it('should pass async schema validation', async () => {
      const source = { id: 1, name: 'john', email: 'john@test.com' };

      const validateSchemaAsync = async (target: any, _source: any, _context: MappingContext) => {
        await delay(1);
        return target.name === 'john' && target.email.includes('@')
          ? { valid: true }
          : { valid: false, errors: ['Invalid schema'] };
      };

      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email' },
      ];

      const result = await Objecter.convertAsync(source, TargetDto, mapping, { validateSchemaAsync });

      expect(result.name).toBe('john');
    });

    it('should fail async schema validation', async () => {
      const source = { id: 1, name: 'john', email: 'john@test.com' };

      const validateSchemaAsync = async () => {
        await delay(1);
        return { valid: false, errors: ['Global validation failed'] };
      };

      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
      ];

      await expect(Objecter.convertAsync(source, TargetDto, mapping, { validateSchemaAsync })).rejects.toThrow(
        'Schema validation failed: Global validation failed',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should ignore validateAsync in synchronous convert', () => {
      const source = { id: 1, name: 'john' };
      let asyncRan = false;
      const asyncValidator = async () => {
        await delay(1);
        asyncRan = true;
        return false; // Should fail if run
      };

      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', validateAsync: asyncValidator },
      ];

      const result = Objecter.convert(source, TargetDto, mapping);
      expect(result.name).toBe('john');
      expect(asyncRan).toBe(false);
    });

    it('should propagate errors from async validator', async () => {
      const source = { id: 1, name: 'john' };
      const failingValidator = async () => {
        await delay(1);
        throw new Error('Database error');
      };

      const mapping: FieldMapping[] = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', validateAsync: failingValidator },
      ];

      await expect(Objecter.convertAsync(source, TargetDto, mapping)).rejects.toThrow('Database error');
    });
  });
});
