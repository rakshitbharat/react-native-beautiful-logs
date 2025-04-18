// Use the actual moment library but wrap it in Jest's mock functions
// This allows spying on specific methods or overriding behavior per test.
const moment = jest.requireActual('moment');

// You might want to mock specific functions like `moment()` to return a fixed date
// For example:
// jest.spyOn(moment, 'now').mockReturnValue(new Date('2024-01-15T10:00:00.000Z').valueOf());

// Default export the mocked moment
export default moment;
