import { describe, expect, it } from 'vitest';
import { failMessage } from '../src/ui/Undo';
import { StorageFullError } from '../src/db/actions';
import { NotAnImageError } from '../src/db/photos';

describe('what a failed save says', () => {
  it('a file that isn’t a photo says exactly that', () => expect(failMessage(new NotAnImageError())).toBe('That file isn’t a photo Logbook can read. Nothing was added.'));
  it('a full phone says so', () => expect(failMessage(new StorageFullError())).toMatch(/out of space/));
  it('a plain message is shown as it is', () => expect(failMessage(Object.assign(new Error('Logbook couldn’t get your position.'), { name: 'PlainMessage' }))).toBe('Logbook couldn’t get your position.'));
  it('anything else stays general', () => expect(failMessage(new Error('boom'))).toBe('That didn’t save. Nothing else changed; try again.'));
});
