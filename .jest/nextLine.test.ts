jest.mock('../src/store/useStore', () => ({ useStore: jest.fn(), makeIgnoredWordChecker: jest.fn() }));
jest.mock('../src/hooks/useStoreWhileShown', () => ({ useStoreWhileShown: jest.fn() }));
import { pickNextLine } from '../src/hooks/useWordProgress';

describe('pickNextLine', () => {
  it('picks the line with the fewest new words left, the earliest on a tie', () => {
    expect(pickNextLine([0, 3, 1, 0, 1, 2])).toBe(2);
  });
  it('has none once every line is known', () => {
    expect(pickNextLine([0, 0])).toBeNull();
    expect(pickNextLine([])).toBeNull();
  });
});
