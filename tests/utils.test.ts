import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type Chapter, err, ok, tryCatch } from '../src/types.ts';
import { filterChaptersByRange, runWithConcurrency, sanitizePathSegment } from '../src/utils.ts';

describe('Result helpers', () => {
  it('returns [value, null] for ok()', () => {
    const [value, error] = ok(42);
    assert.equal(value, 42);
    assert.equal(error, null);
  });

  it('returns [null, error] for err()', () => {
    const failure = new Error('boom');
    const [value, error] = err(failure);
    assert.equal(value, null);
    assert.equal(error, failure);
  });

  it('wraps async success and failure in tryCatch()', async () => {
    const [okVal, okErr] = await tryCatch(async () => 'done');
    assert.equal(okVal, 'done');
    assert.equal(okErr, null);

    const [failVal, failErr] = await tryCatch(async () => {
      throw new Error('async failure');
    });
    assert.equal(failVal, null);
    assert.equal(failErr?.message, 'async failure');
  });
});

describe('sanitizePathSegment', () => {
  it('strips unsafe path characters and traversal sequences', () => {
    assert.equal(sanitizePathSegment('../../etc/passwd'), 'etc passwd');
    assert.equal(sanitizePathSegment('Chapter 12: A/B?'), 'Chapter 12 A B');
    assert.equal(sanitizePathSegment('///'), 'untitled');
  });
});

describe('filterChaptersByRange', () => {
  const sampleChapters: Chapter[] = [
    { index: 0, name: 'Chapter 1', url: 'https://example.com/1' },
    { index: 1, name: 'Chapter 2', url: 'https://example.com/2' },
    { index: 2, name: 'Chapter 3', url: 'https://example.com/3' },
  ];

  it('filters chapters inclusively by 1-based range', () => {
    const [result, error] = filterChaptersByRange(sampleChapters, [1, 2]);
    assert.equal(error, null);
    assert.deepEqual(
      result?.map((c) => c.name),
      ['Chapter 1', 'Chapter 2'],
    );
  });

  it('returns an error for invalid ranges', () => {
    const [res1, err1] = filterChaptersByRange(sampleChapters, [0, 2]);
    assert.equal(res1, null);
    assert.match(err1?.message ?? '', /at least 1/);

    const [res2, err2] = filterChaptersByRange(sampleChapters, [3, 1]);
    assert.equal(res2, null);
    assert.match(err2?.message ?? '', /less than or equal/);
  });
});

describe('runWithConcurrency', () => {
  it('bounds concurrent execution and aggregates errors', async () => {
    let active = 0;
    let maxActive = 0;
    const items = [1, 2, 3, 4, 5, 6];

    const [, error] = await runWithConcurrency(items, 2, async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return item === 4 ? err(new Error('item 4 failed')) : ok(undefined);
    });

    assert.equal(maxActive, 2);
    assert.ok(error instanceof AggregateError);
    assert.equal(error.errors.length, 1);
  });
});
