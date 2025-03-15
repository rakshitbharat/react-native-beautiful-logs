type PlatformSelectConfig<T> = {
  ios?: T;
  android?: T;
  native?: T;
  default?: T;
};

export const Platform = {
  OS: 'ios',
  select: jest.fn(<T>(obj: PlatformSelectConfig<T>) => obj.ios),
};

export default {
  Platform,
};
