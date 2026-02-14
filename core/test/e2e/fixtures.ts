export class UserEntity {
  id = 0;
  firstName = '';
  lastName = '';
  age = 0;
  email = '';
  role = '';
  internalCode = '';
}

export class UserDTO {
  id = 0;
  fullName = '';
  name = '';
  age = 0;
  email = '';
  role = '';
  status = '';
}

export class AddressDTO {
  city = '';
  zip = '';
}

export class LocationTarget {
  location: AddressDTO = new AddressDTO();
  locations: AddressDTO[] = [];
  value = '';
}

export class TrimTarget {
  text = '';
}

export class PriceTarget {
  idrPrice = 0;
}

export class DataTarget {
  data: unknown = null;
  bio = '';
}

export class ConfirmationDTO {
  code = '';
  confirm = '';
}

export class UserBasicInfo {
  id = 0;
  name = '';
}

export class UserMetaData {
  role = '';
  email = '';
}

export class UserDetailDTO {
  id = 0;
  name = '';
  role = '';
  email = '';
}

export class SimpleTarget {
  id = 0;
  name = '';
  extra = '';
}

export class ReadonlyTarget {
  readonly id: number = 0;
}

export class DateTarget {
  date: Date = new Date();
}

export class ItemDTO {
  fullName = '';
}

export class ConfigTarget {
  config: Record<string, unknown> = {};
}

export class AutoMapTarget {
  id = 0;
  name = '';
}
