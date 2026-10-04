import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { openDb, type LogbookDb } from '../src/db/db';
import { keepLine } from '../src/db/actions';
import { addPerson, removePerson, updatePerson, handleUses } from '../src/db/people';
import { checkPerson, matchHandle, normHandle, suggestHandle } from '../src/domain/people';
import { peopleOf, tokenize } from '../src/domain/line';
import { PeopleView, PersonEditView } from '../src/screens/People';
import { parseRoute, routeHash } from '../src/router';

let db: LogbookDb, n = 0;
beforeEach(async () => { db = openDb('pe-' + n++); await db.open(); });
const noop = () => {};
const P = (id: string, initial: string, name: string) => ({ id, initial, name, thread: 0 });
describe('people: handles', () => {
  it('a handle is 1 to 3 letters, written like @Ri', () => { expect(normHandle(' riy4a ')).toBe('Riy'); expect(normHandle('r')).toBe('R'); expect(normHandle('9')).toBe(''); });
  it('a suggested handle avoids ones already taken', () => {
    expect(suggestHandle('Riya Sen', [])).toBe('R'); expect(suggestHandle('Riya Sen', ['R'])).toBe('Ri'); expect(suggestHandle('Riya Sen', ['R', 'Ri'])).toBe('RS'.slice(0, 1) + 's');
  });
  it('@ picks the longest handle that fits, and a single letter as before', () => {
    expect(matchHandle('Riya', ['R', 'Ri'])).toBe('Ri'); expect(matchHandle('Ravi', ['R', 'Ri'])).toBe('R'); expect(matchHandle('Zed', ['R'])).toBe('Z');
    expect(peopleOf('saw @Riya and @Ravi', ['R', 'Ri'])).toEqual(['Ri', 'R']); expect(tokenize('@R')[0].value).toBe('R');
  });
  it('checks say what is wrong, plainly', () => {
    const others = [P('a', 'Ri', 'Riya')];
    expect(checkPerson({ name: '', handle: 'Ra' }, others)).toBe('Give them a name.');
    expect(checkPerson({ name: 'Ravi', handle: '' }, others)).toBe('Give them a short name of 1 to 3 letters, for @.');
    expect(checkPerson({ name: 'Rina', handle: 'ri' }, others)).toBe('@Ri is already Riya. Pick other letters.');
    expect(checkPerson({ name: 'Ravi', handle: 'Ra', birthday: '02-30' }, others)).toBe('That birthday isn’t a real date.');
    expect(checkPerson({ name: 'Ravi', handle: 'Ra', birthday: '02-29' }, others)).toBeNull();
  });
});
describe('people: keeping them', () => {
  it('add, edit and remove a person, with Undo; a new colour each time', async () => {
    const a = await addPerson(db, { name: 'Riya', handle: 'Ri' }), b = await addPerson(db, { name: 'Ravi', handle: 'Ra', birthday: '10-11' });
    expect(await db.people.get(a.id)).toMatchObject({ name: 'Riya', initial: 'Ri' }); expect((await db.people.get(b.id))!.thread).not.toBe((await db.people.get(a.id))!.thread);
    await updatePerson(db, a.id, { name: 'Riya Sen', handle: 'Ri', birthday: '05-04' }); expect(await db.people.get(a.id)).toMatchObject({ name: 'Riya Sen', birthday: '05-04' });
    const u = await removePerson(db, a.id); expect(await db.people.get(a.id)).toBeUndefined(); await u.run(); expect((await db.people.get(a.id))!.name).toBe('Riya Sen');
  });
  it('a line with @Riya is kept under the longest handle', async () => {
    await addPerson(db, { name: 'Ravi', handle: 'R' }); await addPerson(db, { name: 'Riya', handle: 'Ri' });
    const r = await keepLine(db, { text: 'tea with @Riya', marks: {}, at: new Date('2026-10-04T10:00:00') }, {});
    expect((await db.entries.get(r.entryId))!.people).toEqual(['Ri']);
  });
  it('a handle already used in lines can’t change, so no mention is lost', async () => {
    const a = await addPerson(db, { name: 'Riya', handle: 'Ri' });
    await keepLine(db, { text: 'with @Ri', marks: {}, at: new Date('2026-10-04T10:00:00') }, {});
    expect(await handleUses(db, 'Ri')).toBe(1);
    await expect(updatePerson(db, a.id, { name: 'Riya', handle: 'Ry' })).rejects.toThrow('@Ri is in 1 entry already, so it stays.');
  });
});
describe('people: on screen', () => {
  it('the People screen lists everyone and offers to add', () => {
    const html = renderToStaticMarkup(<PeopleView people={[{ ...P('a', 'Ri', 'Riya'), birthday: '10-11' }]} onAdd={noop} onEdit={noop} />);
    expect(html).toContain('Riya'); expect(html).toContain('@Ri'); expect(html).toContain('Birthday 11 October'); expect(html).toContain('Add a person');
    expect(renderToStaticMarkup(<PeopleView people={[]} onAdd={noop} onEdit={noop} />)).toContain('No people yet.');
  });
  it('the form: name, short name, birthday; a message when something is wrong; Remove only when editing', () => {
    const f = { name: 'Riya', handle: 'Ri', day: '', month: '' };
    const add = renderToStaticMarkup(<PersonEditView form={f} isNew error="" onChange={noop} onSave={noop} onCancel={noop} />);
    expect(add).toContain('Name'); expect(add).toContain('Short name, for @'); expect(add).toContain('Birthday (optional)'); expect(add).not.toContain('Remove');
    const edit = renderToStaticMarkup(<PersonEditView form={f} isNew={false} error="Give them a name." handleLocked="@Ri is in 3 entries, so it stays." onChange={noop} onSave={noop} onCancel={noop} onRemove={noop} />);
    expect(edit).toContain('role="alert"'); expect(edit).toContain('Remove'); expect(edit).toContain('@Ri is in 3 entries, so it stays.');
  });
  it('routes: #/people, #/people/new, #/people/edit/<id>', () => {
    expect(parseRoute('#/people')).toEqual({ name: 'people' }); expect(parseRoute('#/people/new')).toEqual({ name: 'person-edit' }); expect(parseRoute('#/people/edit/a%20b')).toEqual({ name: 'person-edit', id: 'a b' });
    expect(routeHash({ name: 'person-edit', id: 'x' })).toBe('#/people/edit/x');
  });
});
