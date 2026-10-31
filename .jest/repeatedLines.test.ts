import {
  findRepeatedLines,
  applyEditToLines,
  findSplitTargets,
  applySplitToLines,
  findMergeTargets,
  applyMergeToLines,
  shiftIndexAfterResize,
  findSimilarLines,
  applyDeleteToLines,
} from '../src/utils/repeatedLines';

describe('findRepeatedLines', () => {
  const lines = ['Hey Jude', 'don\'t make it bad', 'Hey Jude ', '', 'Hey Jude'];

  it('finds other lines with the same text, ignoring outer whitespace', () => {
    expect(findRepeatedLines(lines, 'Hey Jude', 0)).toEqual([2, 4]);
  });

  it('never matches blank lines', () => {
    expect(findRepeatedLines(lines, '', 0)).toEqual([]);
  });
});

describe('applyEditToLines', () => {
  it('replaces the target lines', () => {
    expect(applyEditToLines(['a', 'b', 'a'], [2], 'c')).toEqual(['a', 'b', 'c']);
  });
});

describe('split', () => {
  it('finds lines that can be split the same way', () => {
    const lines = ['one', 'two', 'onetwo', 'x', 'onetwo'];
    expect(findSplitTargets(lines, 'onetwo', ['one', 'two'], [0, 1])).toEqual([2, 4]);
  });

  it('ignores splits that also changed the text', () => {
    expect(findSplitTargets(['a', 'b', 'ab'], 'ab', ['a', 'c'], [0, 1])).toEqual([]);
  });

  it('splits targets and shifts the anchor', () => {
    const lines = ['ab', 'a', 'b', 'ab'];
    expect(applySplitToLines(lines, [0, 3], ['a', 'b'])).toEqual(['a', 'b', 'a', 'b', 'a', 'b']);
    expect(shiftIndexAfterResize(2, [0, 3], 1)).toBe(3);
  });
});

describe('merge', () => {
  it('finds non-overlapping matching pairs', () => {
    const lines = ['la', 'la', 'lala', 'la', 'la', 'la'];
    expect(findMergeTargets(lines, 'la', 'la', 2)).toEqual([0, 3]);
  });

  it('skips pairs touching the merged line', () => {
    expect(findMergeTargets(['a', 'ab', 'b'], 'a', 'b', 1)).toEqual([]);
  });

  it('merges targets and shifts the anchor', () => {
    const lines = ['a', 'b', 'x', 'ab', 'a', 'b'];
    expect(applyMergeToLines(lines, [0, 4], 'ab')).toEqual(['ab', 'x', 'ab', 'ab']);
    expect(shiftIndexAfterResize(3, [0, 4], -1)).toBe(2);
  });
});

describe('findSimilarLines', () => {
  const lines = ['Ba-da ba-da ba-da!', 'I love you', 'ba-da, ba-da', '', 'Ba da ba', 'ba-da-dum', 'Oh ba-da ba-da baby'];

  it('finds lines with the same words, however many times and in any order', () => {
    expect(findSimilarLines(lines, 'ba-da ba-da')).toEqual([0, 2, 4]);
  });

  it('never matches a blank line', () => {
    expect(findSimilarLines(lines, '  ')).toEqual([]);
  });

  it('deletes the lines found', () => {
    expect(applyDeleteToLines(lines, [0, 2, 4])).toEqual(['I love you', '', 'ba-da-dum', 'Oh ba-da ba-da baby']);
  });
});
