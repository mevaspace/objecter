import { Objecter } from '../../src/objecter';
import { ValidationError } from '../../src/errors';
import type { SkipIfPredicate, SchemaValidateFn } from '../../src/types';

describe('Conditional Mapping - skipIf Predicate', () => {
  class Target {
    name?: string;
    age?: number;
    email?: string;
    status?: string;
  }

  it('should skip field when skipIf predicate returns true', () => {
    const source = { name: 'John', age: 0, email: 'test@example.com' };

    const skipIfZero: SkipIfPredicate = (value) => value === 0;

    const mapping = [
      { from: 'name', to: 'name' },
      { from: 'age', to: 'age', skipIf: skipIfZero },
      { from: 'email', to: 'email' },
    ];

    const result = Objecter.convert(source, Target, mapping);

    expect(result.name).toBe('John');
    expect(result.age).toBeUndefined();
    expect(result.email).toBe('test@example.com');
  });

  it('should skip field based on source object context', () => {
    const source = { name: 'Admin', age: 30, email: 'admin@example.com', status: 'admin' };

    const skipIfAdmin: SkipIfPredicate = (_value, source: any) => source.status === 'admin';

    const mapping = [
      { from: 'name', to: 'name' },
      { from: 'age', to: 'age' },
      { from: 'email', to: 'email', skipIf: skipIfAdmin },
    ];

    const result = Objecter.convert(source, Target, mapping);

    expect(result.name).toBe('Admin');
    expect(result.age).toBe(30);
    expect(result.email).toBeUndefined();
  });

  it('should skip field based on mapping context', () => {
    const source = { name: 'User', age: 25, email: 'user@example.com' };

    const skipIfHideEmail: SkipIfPredicate = (_value, _source, context) => {
      return context.data?.hideEmail === true;
    };

    const mapping = [
      { from: 'name', to: 'name' },
      { from: 'age', to: 'age' },
      { from: 'email', to: 'email', skipIf: skipIfHideEmail },
    ];

    const result = Objecter.convert(source, Target, mapping, { context: { hideEmail: true } });

    expect(result.name).toBe('User');
    expect(result.age).toBe(25);
    expect(result.email).toBeUndefined();
  });

  it('should not skip field when skipIf predicate returns false', () => {
    const source = { name: 'John', age: 30, email: 'test@example.com' };

    const skipIfZero: SkipIfPredicate = (value) => value === 0;

    const mapping = [
      { from: 'name', to: 'name' },
      { from: 'age', to: 'age', skipIf: skipIfZero },
      { from: 'email', to: 'email' },
    ];

    const result = Objecter.convert(source, Target, mapping);

    expect(result.name).toBe('John');
    expect(result.age).toBe(30);
    expect(result.email).toBe('test@example.com');
  });

  it('should maintain backward compatibility with skipIfNull', () => {
    const source = { name: 'John', age: null, email: 'test@example.com' };

    const mapping = [
      { from: 'name', to: 'name' },
      { from: 'age', to: 'age', skipIfNull: true },
      { from: 'email', to: 'email' },
    ];

    const result = Objecter.convert(source, Target, mapping);

    expect(result.name).toBe('John');
    expect(result.age).toBeUndefined();
    expect(result.email).toBe('test@example.com');
  });

  it('should prioritize skipIf over skipIfNull', () => {
    const source = { name: 'John', age: 0, email: 'test@example.com' };

    const skipIfZero: SkipIfPredicate = (value) => value === 0;

    const mapping = [
      { from: 'name', to: 'name' },
      { from: 'age', to: 'age', skipIf: skipIfZero, skipIfNull: true },
      { from: 'email', to: 'email' },
    ];

    const result = Objecter.convert(source, Target, mapping);

    expect(result.name).toBe('John');
    expect(result.age).toBeUndefined();
    expect(result.email).toBe('test@example.com');
  });
});

describe('Schema Validation - validateSchema Predicate', () => {
  class UserTarget {
    firstName?: string;
    lastName?: string;
    age?: number;
    password?: string;
    confirmPassword?: string;
  }

  it('should validate schema after all field mappings', () => {
    const source = { firstName: 'John', lastName: 'Doe', age: 17 };

    const validateAge: SchemaValidateFn = (target: any) => {
      if (target.age < 18) {
        return { valid: false, errors: ['User must be at least 18 years old'] };
      }
      return { valid: true };
    };

    const mapping = [
      { from: 'firstName', to: 'firstName' },
      { from: 'lastName', to: 'lastName' },
      { from: 'age', to: 'age' },
    ];

    expect(() => {
      Objecter.convert(source, UserTarget, mapping, { validateSchema: validateAge });
    }).toThrow(ValidationError);

    expect(() => {
      Objecter.convert(source, UserTarget, mapping, { validateSchema: validateAge });
    }).toThrow('Schema validation failed: User must be at least 18 years old');
  });

  it('should validate multiple fields together', () => {
    const source = { firstName: 'John', lastName: 'Doe', age: 25, password: 'pass123', confirmPassword: 'pass456' };

    const validatePasswordMatch = (target: any) => {
      if (target.password !== target.confirmPassword) {
        return { valid: false, errors: ['Password and confirm password must match'] };
      }
      return { valid: true };
    };

    const mapping = [
      { from: 'firstName', to: 'firstName' },
      { from: 'lastName', to: 'lastName' },
      { from: 'age', to: 'age' },
      { from: 'password', to: 'password' },
      { from: 'confirmPassword', to: 'confirmPassword' },
    ];

    expect(() => {
      Objecter.convert(source, UserTarget, mapping, { validateSchema: validatePasswordMatch });
    }).toThrow(ValidationError);
  });

  it('should pass schema validation when valid', () => {
    const source = { firstName: 'John', lastName: 'Doe', age: 25, password: 'pass123', confirmPassword: 'pass123' };

    const validatePasswordMatch: SchemaValidateFn = (target: any) => {
      if (target.password !== target.confirmPassword) {
        return { valid: false, errors: ['Password and confirm password must match'] };
      }
      return { valid: true };
    };

    const mapping = [
      { from: 'firstName', to: 'firstName' },
      { from: 'lastName', to: 'lastName' },
      { from: 'age', to: 'age' },
      { from: 'password', to: 'password' },
      { from: 'confirmPassword', to: 'confirmPassword' },
    ];

    const result = Objecter.convert(source, UserTarget, mapping, { validateSchema: validatePasswordMatch });

    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Doe');
    expect(result.age).toBe(25);
    expect(result.password).toBe('pass123');
    expect(result.confirmPassword).toBe('pass123');
  });

  it('should access source object in schema validation', () => {
    const source = { firstName: 'John', lastName: 'Doe', age: 25 };

    const validateSourceAge: SchemaValidateFn = (_target, source: any) => {
      if (source.age < 18) {
        return { valid: false, errors: ['Source age must be at least 18'] };
      }
      return { valid: true };
    };

    const mapping = [
      { from: 'firstName', to: 'firstName' },
      { from: 'lastName', to: 'lastName' },
      { from: 'age', to: 'age' },
    ];

    const result = Objecter.convert(source, UserTarget, mapping, { validateSchema: validateSourceAge });

    expect(result.age).toBe(25);
  });

  it('should access mapping context in schema validation', () => {
    const source = { firstName: 'John', lastName: 'Doe', age: 25 };

    const validateWithContext: SchemaValidateFn = (_target, _source, context) => {
      if (context.data?.strictMode === true) {
        return { valid: false, errors: ['Strict mode validation failed'] };
      }
      return { valid: true };
    };

    const mapping = [
      { from: 'firstName', to: 'firstName' },
      { from: 'lastName', to: 'lastName' },
      { from: 'age', to: 'age' },
    ];

    expect(() => {
      Objecter.convert(source, UserTarget, mapping, {
        validateSchema: validateWithContext,
        context: { strictMode: true },
      });
    }).toThrow(ValidationError);
  });

  it('should not throw when throwOnValidationError is false', () => {
    const source = { firstName: 'John', lastName: 'Doe', age: 17 };

    const validateAge: SchemaValidateFn = (target: any) => {
      if (target.age < 18) {
        return { valid: false, errors: ['User must be at least 18 years old'] };
      }
      return { valid: true };
    };

    const mapping = [
      { from: 'firstName', to: 'firstName' },
      { from: 'lastName', to: 'lastName' },
      { from: 'age', to: 'age' },
    ];

    const result = Objecter.convert(source, UserTarget, mapping, {
      validateSchema: validateAge,
      throwOnValidationError: false,
    });

    expect(result.firstName).toBe('John');
    expect(result.age).toBe(17);
  });

  it('should handle schema validation returning valid without errors array', () => {
    const source = { firstName: 'John', lastName: 'Doe', age: 25 };

    const validateAlwaysValid: SchemaValidateFn = () => {
      return { valid: true };
    };

    const mapping = [
      { from: 'firstName', to: 'firstName' },
      { from: 'lastName', to: 'lastName' },
      { from: 'age', to: 'age' },
    ];

    const result = Objecter.convert(source, UserTarget, mapping, { validateSchema: validateAlwaysValid });

    expect(result.firstName).toBe('John');
    expect(result.age).toBe(25);
  });
});
