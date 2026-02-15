import 'reflect-metadata';

import { Expose, Type } from 'class-transformer';
import { AutoMap } from '@automapper/classes';

// ─── Source Data ───────────────────────────────────────────

export interface AddressSource {
  city: string;
  zip: string;
  country: string;
}

export interface CompanySource {
  name: string;
  industry: string;
  address: AddressSource;
}

export interface UserSource {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  phone: string;
  address: AddressSource;
  billingAddress: AddressSource;
  company: CompanySource;
}

// ─── Objecter Targets ──────────────────────────────────────

export class ObjAddressDTO {
  city = '';
  zip = '';
}

export class ObjCompanyDTO {
  name = '';
  industry = '';
  address: ObjAddressDTO = new ObjAddressDTO();
}

export class ObjUserDTO {
  id = 0;
  fullName = '';
  age = 0;
  email = '';
  phone = '';
  address: ObjAddressDTO = new ObjAddressDTO();
  billingAddress: ObjAddressDTO = new ObjAddressDTO();
  company: ObjCompanyDTO = new ObjCompanyDTO();
}

// ─── class-transformer Targets ─────────────────────────────

export class CTAddressDTO {
  @Expose()
  city = '';

  @Expose()
  zip = '';
}

export class CTCompanyDTO {
  @Expose()
  name = '';

  @Expose()
  industry = '';

  @Expose()
  @Type(() => CTAddressDTO)
  address: CTAddressDTO = new CTAddressDTO();
}

export class CTUserDTO {
  @Expose()
  id = 0;

  @Expose()
  fullName = '';

  @Expose()
  age = 0;

  @Expose()
  email = '';

  @Expose()
  phone = '';

  @Expose()
  @Type(() => CTAddressDTO)
  address: CTAddressDTO = new CTAddressDTO();

  @Expose()
  @Type(() => CTAddressDTO)
  billingAddress: CTAddressDTO = new CTAddressDTO();

  @Expose()
  @Type(() => CTCompanyDTO)
  company: CTCompanyDTO = new CTCompanyDTO();
}

// ─── AutoMapper Targets ────────────────────────────────────

export class AMAddressSource {
  @AutoMap()
  city = '';

  @AutoMap()
  zip = '';

  @AutoMap()
  country = '';
}

export class AMAddressDTO {
  @AutoMap()
  city = '';

  @AutoMap()
  zip = '';
}

export class AMCompanySource {
  @AutoMap()
  name = '';

  @AutoMap()
  industry = '';

  @AutoMap(() => AMAddressSource)
  address: AMAddressSource = new AMAddressSource();
}

export class AMCompanyDTO {
  @AutoMap()
  name = '';

  @AutoMap()
  industry = '';

  @AutoMap(() => AMAddressDTO)
  address: AMAddressDTO = new AMAddressDTO();
}

export class AMUserSource {
  @AutoMap()
  id = 0;

  @AutoMap()
  firstName = '';

  @AutoMap()
  lastName = '';

  @AutoMap()
  age = 0;

  @AutoMap()
  email = '';

  @AutoMap()
  phone = '';

  @AutoMap(() => AMAddressSource)
  address: AMAddressSource = new AMAddressSource();

  @AutoMap(() => AMAddressSource)
  billingAddress: AMAddressSource = new AMAddressSource();

  @AutoMap(() => AMCompanySource)
  company: AMCompanySource = new AMCompanySource();
}

export class AMUserDTO {
  @AutoMap()
  id = 0;

  @AutoMap()
  fullName = '';

  @AutoMap()
  age = 0;

  @AutoMap()
  email = '';

  @AutoMap()
  phone = '';

  @AutoMap(() => AMAddressDTO)
  address: AMAddressDTO = new AMAddressDTO();

  @AutoMap(() => AMAddressDTO)
  billingAddress: AMAddressDTO = new AMAddressDTO();

  @AutoMap(() => AMCompanyDTO)
  company: AMCompanyDTO = new AMCompanyDTO();
}

// ─── Data Generator ────────────────────────────────────────

export function generateUsers(count: number): UserSource[] {
  const users: UserSource[] = new Array(count);
  for (let i = 0; i < count; i++) {
    users[i] = {
      id: i,
      firstName: `First_${i}`,
      lastName: `Last_${i}`,
      age: 20 + (i % 50),
      email: `user_${i}@example.com`,
      phone: `+62812${String(i % 100000000).padStart(8, '0')}`,
      address: { city: `City_${i % 100}`, zip: `${10000 + (i % 90000)}`, country: `Country_${i % 10}` },
      billingAddress: { city: `BillCity_${i % 80}`, zip: `${20000 + (i % 80000)}`, country: `Country_${i % 10}` },
      company: {
        name: `Corp_${i % 200}`,
        industry: `Industry_${i % 20}`,
        address: { city: `OfficeCity_${i % 50}`, zip: `${30000 + (i % 70000)}`, country: `Country_${i % 5}` },
      },
    };
  }
  return users;
}
