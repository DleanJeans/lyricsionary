import type { WordEntry } from '../src/types';
import type { PartOfSpeech } from '../src/utils/partOfSpeech';
import { buildLyricQuiz, buildMeaningQuiz, lookAlikeScore, meaningsOverlap, QUIZ_RULES, quizKindFor, recordAnswer } from '../src/utils/wordQuiz';

const DAY = 24 * 60 * 60 * 1000;
const start = new Date(2026, 9, 25, 12).getTime();

let nextId = 0;
const word = (text: string, definition: string, partOfSpeech?: PartOfSpeech, songId = 'other', language = 'de'): WordEntry => ({
  id: String(++nextId),
  word: text,
  language,
  pronunciation: '',
  contexts: [{ context: '', definition, partOfSpeech, songId }],
  lastLookedUp: 0,
});

// Always takes the first option, so shuffles keep their order
const noShuffle = () => 0.999;

describe('recordAnswer', () => {
  it('makes a Seen word Recognized after 3 correct meaning answers in a row, the same day', () => {
    let state = recordAnswer('Seen', undefined, 'meaning', true, start);
    expect(state).toMatchObject({ masteryLevel: 'Seen', quiz: { streak: 1, correct: 1 } });
    state = recordAnswer(state.masteryLevel, state.quiz, 'meaning', true, start + 1000);
    state = recordAnswer(state.masteryLevel, state.quiz, 'meaning', true, start + 2000);
    expect(state).toMatchObject({ masteryLevel: 'Recognized', quiz: { streak: 0, correct: 3 } });
  });

  it('starts the streak again after a wrong answer, without lowering the level', () => {
    let state = recordAnswer('Seen', undefined, 'meaning', true, start);
    state = recordAnswer(state.masteryLevel, state.quiz, 'meaning', true, start);
    state = recordAnswer(state.masteryLevel, state.quiz, 'meaning', false, start);
    expect(state).toMatchObject({ masteryLevel: 'Seen', quiz: { streak: 0, correct: 2, wrong: 1 } });
    expect(recordAnswer('Recalled', { streak: 0, correct: 5, wrong: 0 }, 'lyric', false, start).masteryLevel).toBe('Recalled');
  });

  it('makes a Recognized word Recalled after 3 correct lyric answers on different days', () => {
    let state = recordAnswer('Recognized', undefined, 'lyric', true, start);
    state = recordAnswer(state.masteryLevel, state.quiz, 'lyric', true, start + 60_000);
    expect(state.quiz.streak).toBe(1);
    state = recordAnswer(state.masteryLevel, state.quiz, 'lyric', true, start + DAY);
    expect(state).toMatchObject({ masteryLevel: 'Recognized', quiz: { streak: 2 } });
    state = recordAnswer(state.masteryLevel, state.quiz, 'lyric', true, start + 2 * DAY);
    expect(state).toMatchObject({ masteryLevel: 'Recalled', quiz: { streak: 0 } });
  });

  it('makes a Recalled word Known when it is right after 14 days without a quiz', () => {
    const recalled = recordAnswer('Recalled', undefined, 'lyric', true, start);
    expect(recordAnswer('Recalled', recalled.quiz, 'lyric', true, start + 13 * DAY).masteryLevel).toBe('Recalled');
    expect(recordAnswer('Recalled', recalled.quiz, 'lyric', true, start + QUIZ_RULES.knownAfterDays * DAY).masteryLevel).toBe('Known');
  });

  it("doesn't count a quiz meant for another level", () => {
    expect(recordAnswer('Recognized', undefined, 'meaning', true, start)).toMatchObject({ masteryLevel: 'Recognized', quiz: { streak: 0 } });
  });
});

describe('quizKindFor', () => {
  it('asks Seen words their meaning and Recognized or Recalled words for the lyric', () => {
    expect(quizKindFor(undefined)).toBe('meaning');
    expect(quizKindFor('Seen')).toBe('meaning');
    expect(quizKindFor('Recognized')).toBe('lyric');
    expect(quizKindFor('Recalled')).toBe('lyric');
    expect(quizKindFor('Known')).toBeNull();
  });
});

describe('meaningsOverlap', () => {
  it('compares content words only', () => {
    expect(meaningsOverlap('heart', 'my heart')).toBe(true);
    expect(meaningsOverlap('to go', 'to run')).toBe(false);
  });
});

describe('buildMeaningQuiz', () => {
  const herz = word('Herz', 'heart', 'noun', 'song');

  it('offers definitions of the same type of word first', () => {
    const words = [herz, word('laufen', 'to run', 'verb'), word('Liebe', 'love', 'noun'), word('Nacht', 'night', 'noun'), word('gehen', 'to go', 'verb'), word('Stern', 'star', 'noun')];
    const quiz = buildMeaningQuiz({ entry: herz, answer: 'heart', partOfSpeech: 'noun', songId: 'song' }, words, noShuffle)!;
    expect(quiz.options).toHaveLength(4);
    expect(quiz.options[quiz.answerIndex]).toBe('heart');
    expect([...quiz.options].sort()).toEqual(['heart', 'love', 'night', 'star']);
  });

  it('prefers words from the same song', () => {
    const words = [herz, word('Liebe', 'love', 'noun'), word('Nacht', 'night', 'noun', 'song'), word('Stern', 'star', 'noun'), word('Mond', 'moon', 'noun'), word('Tag', 'day', 'noun', 'song')];
    const quiz = buildMeaningQuiz({ entry: herz, answer: 'heart', partOfSpeech: 'noun', songId: 'song' }, words, noShuffle)!;
    expect(quiz.options).toEqual(expect.arrayContaining(['night', 'day']));
  });

  it('leaves out meanings that would also be right, other languages and excluded words', () => {
    const words = [herz, word('Herzchen', 'little heart', 'noun'), word('cœur', 'love', 'noun', 'other', 'fr'), word('Liebe', 'love', 'noun'), word('Brief', 'letter', 'noun'), word('Stern', 'star', 'noun')];
    const quiz = buildMeaningQuiz({ entry: herz, answer: 'heart', partOfSpeech: 'noun', excludeWords: ['brief'] }, words, noShuffle)!;
    expect([...quiz.options].sort()).toEqual(['heart', 'love', 'star']);
  });

  it('is null with fewer than 2 wrong options', () => {
    expect(buildMeaningQuiz({ entry: herz, answer: 'heart' }, [herz, word('Liebe', 'love')])).toBeNull();
  });
});

describe('lookAlikeScore', () => {
  it('scores the same word count, starting letter, rhyme and length', () => {
    expect(lookAlikeScore('to run', 'to go')).toBe(3); // count, length
    expect(lookAlikeScore('luck', 'love')).toBe(4); // count, start, length
    expect(lookAlikeScore('Schmerz', 'Herz')).toBe(4); // count, rhyme, length
    expect(lookAlikeScore('to leave behind', 'love')).toBe(1); // start, ignoring "to"
    expect(lookAlikeScore('a very long explanation', 'sun')).toBe(0);
  });
});

describe('option priority', () => {
  it('puts the same word type before options that only look alike', () => {
    const herz = word('Herz', 'heart', 'noun', 'song');
    const words = [
      herz,
      word('Schmerz', 'pain', 'noun'),
      word('Nacht', 'night', 'noun'),
      word('Licht', 'light', 'noun'),
      word('März', 'March', 'other', 'song'),
    ];
    const quiz = buildLyricQuiz({ entry: herz, answer: 'heart', partOfSpeech: 'noun', songId: 'song' }, words, noShuffle)!;
    expect([...quiz.options].sort()).toEqual(['Herz', 'Licht', 'Nacht', 'Schmerz']);
  });

  it('prefers meanings that look like the answer among the same type', () => {
    const lieben = word('lieben', 'to love', 'verb');
    const words = [
      lieben,
      word('laufen', 'to run', 'verb'),
      word('lachen', 'to laugh', 'verb'),
      word('warten', 'to wait for someone patiently', 'verb'),
      word('gehen', 'to go', 'verb'),
    ];
    const quiz = buildMeaningQuiz({ entry: lieben, answer: 'to love', partOfSpeech: 'verb' }, words, noShuffle)!;
    expect([...quiz.options].sort()).toEqual(['to go', 'to laugh', 'to love', 'to run']);
  });
});

describe('buildLyricQuiz', () => {
  it('prefers words from the same song among equally good options', () => {
    const herz = word('Herz', 'heart', 'noun', 'song');
    const words = [herz, word('Liebe', 'love', 'noun'), word('Nacht', 'night', 'noun', 'song'), word('laufen', 'to run', 'verb', 'song'), word('Stern', 'star', 'noun'), word('Mond', 'moon', 'noun', 'song')];
    const quiz = buildLyricQuiz({ entry: herz, answer: 'heart', partOfSpeech: 'noun', songId: 'song' }, words, noShuffle)!;
    expect(quiz.options[quiz.answerIndex]).toBe('Herz');
    expect([...quiz.options].sort()).toEqual(['Herz', 'Liebe', 'Mond', 'Nacht']);
  });

  it('in German, offers only words capitalized like the answer', () => {
    const laufen = word('laufen', 'to run', 'verb', 'song');
    const words = [laufen, word('Herz', 'heart', 'noun', 'song'), word('Nacht', 'night', 'noun', 'song'), word('gehen', 'to go', 'verb'), word('schön', 'beautiful', 'adjective')];
    const quiz = buildLyricQuiz({ entry: laufen, answer: 'to run', partOfSpeech: 'verb', songId: 'song' }, words, noShuffle)!;
    expect([...quiz.options].sort()).toEqual(['gehen', 'laufen', 'schön']);
    // Not enough nouns to choose from
    const herz = words[1];
    expect(buildLyricQuiz({ entry: herz, answer: 'heart', songId: 'song' }, [...words, word('Liebe', 'love', 'noun', 'x', 'en')])).toBeNull();
  });

  it('mixes capitalized and lowercase words in other languages', () => {
    const amour = word('amour', 'love', 'noun', 'song', 'French');
    const words = [amour, word('Paris', 'Paris', 'noun', 'song', 'French'), word('nuit', 'night', 'noun', 'song', 'French'), word('Marie', 'Mary', 'noun', 'song', 'French')];
    expect([...buildLyricQuiz({ entry: amour, answer: 'love', songId: 'song' }, words, noShuffle)!.options].sort()).toEqual(['Marie', 'Paris', 'amour', 'nuit']);
  });
});
