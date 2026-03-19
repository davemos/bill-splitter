import { getPreferredName } from '../index';
import type { UserProfile } from '../index';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: 'uid_1',
    email: 'test@example.com',
    displayName: 'Alice Smith',
    avatarColor: '#FF5733',
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('getPreferredName', () => {
  it('returns nickname when set', () => {
    const profile = makeProfile({ nickname: 'Ali' });
    expect(getPreferredName(profile)).toBe('Ali');
  });

  it('trims whitespace from nickname', () => {
    const profile = makeProfile({ nickname: '  Ali  ' });
    expect(getPreferredName(profile)).toBe('Ali');
  });

  it('falls back to "FirstName L." format when nickname is empty string', () => {
    const profile = makeProfile({ nickname: '' });
    expect(getPreferredName(profile)).toBe('Alice S.');
  });

  it('falls back to "FirstName L." format when nickname is only whitespace', () => {
    const profile = makeProfile({ nickname: '   ' });
    expect(getPreferredName(profile)).toBe('Alice S.');
  });

  it('falls back when nickname is undefined', () => {
    const profile = makeProfile({ nickname: undefined });
    expect(getPreferredName(profile)).toBe('Alice S.');
  });

  it('returns single name as-is when displayName has only one word', () => {
    const profile = makeProfile({ displayName: 'Madonna' });
    expect(getPreferredName(profile)).toBe('Madonna');
  });

  it('returns "FirstName L." format for two-word name', () => {
    const profile = makeProfile({ displayName: 'John Doe' });
    expect(getPreferredName(profile)).toBe('John D.');
  });

  it('uses last word initial for names with more than two words', () => {
    const profile = makeProfile({ displayName: 'Mary Jane Watson' });
    expect(getPreferredName(profile)).toBe('Mary W.');
  });

  it('handles extra whitespace in displayName', () => {
    const profile = makeProfile({ displayName: '  Bob   Jones  ' });
    // split(/\s+/) on trimmed string: ['Bob', 'Jones']
    expect(getPreferredName(profile)).toBe('Bob J.');
  });

  it('nickname takes priority over any displayName format', () => {
    const profile = makeProfile({
      displayName: 'John Doe',
      nickname: 'JD',
    });
    expect(getPreferredName(profile)).toBe('JD');
  });
});
