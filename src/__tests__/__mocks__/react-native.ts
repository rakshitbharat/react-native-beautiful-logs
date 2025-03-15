export const Platform = {
  OS: 'ios',
  select: jest.fn((obj: any) => obj.ios),
};

export default {
  Platform,
};