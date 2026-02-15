import 'reflect-metadata';
import { bench, group, run, summary } from 'mitata';
import { Objecter, FieldMapping } from '@mevaspace/objecter';
import { plainToInstance } from 'class-transformer';
import { createMapper, createMap, forMember, mapFrom, Mapper } from '@automapper/core';
import { classes } from '@automapper/classes';

import {
  UserSource,
  ObjUserDTO,
  ObjAddressDTO,
  ObjCompanyDTO,
  CTUserDTO,
  AMUserSource,
  AMUserDTO,
  AMAddressSource,
  AMAddressDTO,
  AMCompanySource,
  AMCompanyDTO,
  generateUsers,
} from './fixtures';

// ─── Objecter Setup ────────────────────────────────────────

const addressMapping: FieldMapping[] = [{ from: 'city' }, { from: 'zip' }];

const addressMapper = Objecter.createMapper<unknown, ObjAddressDTO>(ObjAddressDTO, addressMapping, {
  strictMapping: false,
});

const companyMapping: FieldMapping[] = [
  { from: 'name' },
  { from: 'industry' },
  { from: 'address', transform: (v: unknown) => addressMapper(v as Record<string, unknown>) },
];

const companyMapper = Objecter.createMapper<unknown, ObjCompanyDTO>(ObjCompanyDTO, companyMapping, {
  strictMapping: false,
});

const userMapping: FieldMapping[] = [
  { from: 'id' },
  {
    from: 'firstName',
    to: 'fullName',
    transform: (_v: unknown, src: unknown) => {
      const s = src as UserSource;
      return `${s.firstName} ${s.lastName}`;
    },
  },
  { from: 'age' },
  { from: 'email' },
  { from: 'phone' },
  { from: 'address', transform: (v: unknown) => addressMapper(v as Record<string, unknown>) },
  { from: 'billingAddress', transform: (v: unknown) => addressMapper(v as Record<string, unknown>) },
  { from: 'company', transform: (v: unknown) => companyMapper(v as Record<string, unknown>) },
];

const objecterMapper = Objecter.createMapper<UserSource, ObjUserDTO>(ObjUserDTO, userMapping, { strictMapping: false });

// ─── AutoMapper Setup ──────────────────────────────────────

const amMapper: Mapper = createMapper({ strategyInitializer: classes() });

createMap(
  amMapper,
  AMAddressSource,
  AMAddressDTO,
  forMember(
    (d) => d.city,
    mapFrom((s) => s.city),
  ),
  forMember(
    (d) => d.zip,
    mapFrom((s) => s.zip),
  ),
);

createMap(
  amMapper,
  AMCompanySource,
  AMCompanyDTO,
  forMember(
    (d) => d.name,
    mapFrom((s) => s.name),
  ),
  forMember(
    (d) => d.industry,
    mapFrom((s) => s.industry),
  ),
  forMember(
    (d) => d.address,
    mapFrom((s) => amMapper.map(s.address, AMAddressSource, AMAddressDTO)),
  ),
);

createMap(
  amMapper,
  AMUserSource,
  AMUserDTO,
  forMember(
    (d) => d.id,
    mapFrom((s) => s.id),
  ),
  forMember(
    (d) => d.fullName,
    mapFrom((s) => `${s.firstName} ${s.lastName}`),
  ),
  forMember(
    (d) => d.age,
    mapFrom((s) => s.age),
  ),
  forMember(
    (d) => d.email,
    mapFrom((s) => s.email),
  ),
  forMember(
    (d) => d.phone,
    mapFrom((s) => s.phone),
  ),
  forMember(
    (d) => d.address,
    mapFrom((s) => amMapper.map(s.address, AMAddressSource, AMAddressDTO)),
  ),
  forMember(
    (d) => d.billingAddress,
    mapFrom((s) => amMapper.map(s.billingAddress, AMAddressSource, AMAddressDTO)),
  ),
  forMember(
    (d) => d.company,
    mapFrom((s) => amMapper.map(s.company, AMCompanySource, AMCompanyDTO)),
  ),
);

// ─── Helpers ───────────────────────────────────────────────

function ctTransform(source: UserSource): CTUserDTO {
  return plainToInstance(
    CTUserDTO,
    {
      id: source.id,
      fullName: `${source.firstName} ${source.lastName}`,
      age: source.age,
      email: source.email,
      phone: source.phone,
      address: { city: source.address.city, zip: source.address.zip },
      billingAddress: { city: source.billingAddress.city, zip: source.billingAddress.zip },
      company: {
        name: source.company.name,
        industry: source.company.industry,
        address: { city: source.company.address.city, zip: source.company.address.zip },
      },
    },
    { excludeExtraneousValues: true },
  );
}

function amTransform(source: UserSource): AMUserDTO {
  const amSource = Object.assign(new AMUserSource(), {
    ...source,
    address: Object.assign(new AMAddressSource(), source.address),
    billingAddress: Object.assign(new AMAddressSource(), source.billingAddress),
    company: Object.assign(new AMCompanySource(), {
      ...source.company,
      address: Object.assign(new AMAddressSource(), source.company.address),
    }),
  });
  return amMapper.map(amSource, AMUserSource, AMUserDTO);
}

// ─── Prepare Data ──────────────────────────────────────────

const users1 = generateUsers(1);
const users1K = generateUsers(1_000);
const users10K = generateUsers(10_000);
const users100K = generateUsers(100_000);
const users1M = generateUsers(1_000_000);

// ─── Benchmarks ────────────────────────────────────────────

summary(() => {
  group('Single Object Mapping', () => {
    const source = users1[0];
    bench('Objecter', () => objecterMapper(source));
    bench('class-transformer', () => ctTransform(source));
    bench('AutoMapper', () => amTransform(source));
  });
});

summary(() => {
  group('Array Mapping (1K)', () => {
    bench('Objecter', () => {
      for (let i = 0; i < 1_000; i++) objecterMapper(users1K[i]);
    });
    bench('class-transformer', () => {
      for (let i = 0; i < 1_000; i++) ctTransform(users1K[i]);
    });
    bench('AutoMapper', () => {
      for (let i = 0; i < 1_000; i++) amTransform(users1K[i]);
    });
  });
});

summary(() => {
  group('Array Mapping (10K)', () => {
    bench('Objecter', () => {
      for (let i = 0; i < 10_000; i++) objecterMapper(users10K[i]);
    });
    bench('class-transformer', () => {
      for (let i = 0; i < 10_000; i++) ctTransform(users10K[i]);
    });
    bench('AutoMapper', () => {
      for (let i = 0; i < 10_000; i++) amTransform(users10K[i]);
    });
  });
});

summary(() => {
  group('Array Mapping (100K)', () => {
    bench('Objecter', () => {
      for (let i = 0; i < 100_000; i++) objecterMapper(users100K[i]);
    });
    bench('class-transformer', () => {
      for (let i = 0; i < 100_000; i++) ctTransform(users100K[i]);
    });
    bench('AutoMapper', () => {
      for (let i = 0; i < 100_000; i++) amTransform(users100K[i]);
    });
  });
});

summary(() => {
  group('Array Mapping (1M)', () => {
    bench('Objecter', () => {
      for (let i = 0; i < 1_000_000; i++) objecterMapper(users1M[i]);
    });
    bench('class-transformer', () => {
      for (let i = 0; i < 1_000_000; i++) ctTransform(users1M[i]);
    });
    bench('AutoMapper', () => {
      for (let i = 0; i < 1_000_000; i++) amTransform(users1M[i]);
    });
  });
});

void run();
