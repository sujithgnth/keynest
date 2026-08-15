import { describe, expect, it } from 'vitest';
import {
  assertNoForbiddenKeys,
  createDocumentationRequest,
  createPasswordHealthRequest,
  PasswordHealthSummary,
} from './ai-privacy-boundary';

describe('AI privacy boundary', () => {
  it('constructs password-health requests from aggregate counts only', () => {
    const input = {
      totalAccounts: 82,
      reusedPasswords: 11,
      blockedPasswords: 7,
      accountsWithoutMfa: 18,
      accountsWithoutPasskeys: 22,
      incompleteSecurityInfo: 4,
      password: 'must-never-leak',
      username: 'private@example.com',
    };

    const request = createPasswordHealthRequest(input as PasswordHealthSummary);
    const serialized = JSON.stringify(request);

    expect(request).toEqual({
      feature: 'password-health-explanation',
      schemaVersion: 1,
      payload: {
        totalAccounts: 82,
        reusedPasswords: 11,
        blockedPasswords: 7,
        accountsWithoutMfa: 18,
        accountsWithoutPasskeys: 22,
        incompleteSecurityInfo: 4,
      },
    });
    expect(serialized).not.toContain('must-never-leak');
    expect(serialized).not.toContain('private@example.com');
  });

  it('rejects forbidden keys at any depth', () => {
    expect(() =>
      assertNoForbiddenKeys({
        safe: {
          nested: {
            refresh_token: 'secret',
          },
        },
      }),
    ).toThrow(/Forbidden field/);
  });

  it('rejects malformed aggregate counts', () => {
    expect(() =>
      createPasswordHealthRequest({
        totalAccounts: -1,
        reusedPasswords: 0,
        blockedPasswords: 0,
        accountsWithoutMfa: 0,
        accountsWithoutPasskeys: 0,
        incompleteSecurityInfo: 0,
      }),
    ).toThrow(/totalAccounts/);
  });

  it('limits documentation sources and strips extra source properties', () => {
    const sources = Array.from({ length: 10 }, (_, index) => ({
      documentId: `doc-${index}`,
      title: `Document ${index}`,
      sourceUrl: `https://docs.keynest.example/doc-${index}`,
      excerpt: 'Approved product documentation.',
      secureNote: 'must-never-leak',
    }));

    const request = createDocumentationRequest(
      'How do I enable biometric unlock?',
      sources,
    );
    const serialized = JSON.stringify(request);

    expect(request.payload).toHaveProperty('sources');
    if (request.feature === 'documentation-assistant') {
      expect(request.payload.sources).toHaveLength(8);
    }
    expect(serialized).not.toContain('must-never-leak');
  });

  it('rejects documentation URLs that contain query strings or fragments', () => {
    expect(() =>
      createDocumentationRequest('How does recovery work?', [
        {
          documentId: 'recovery',
          title: 'Recovery',
          sourceUrl: 'https://docs.keynest.example/recovery?token=secret',
          excerpt: 'Approved product documentation.',
        },
      ]),
    ).toThrow(/must not contain secrets/);
  });

  it('rejects circular payloads during the final safety check', () => {
    const payload: Record<string, unknown> = {};
    payload.self = payload;

    expect(() => assertNoForbiddenKeys(payload)).toThrow(/circular/);
  });
});
