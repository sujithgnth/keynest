const FORBIDDEN_KEYS = new Set([
  'credential',
  'credentials',
  'password',
  'passwordhash',
  'passwordvalue',
  'savedpassword',
  'savedpasswords',
  'token',
  'tokens',
  'username',
]);

const FORBIDDEN_KEY_PARTS = [
  'authorization',
  'cookie',
  'decrypted',
  'encryptedpayload',
  'masterpassword',
  'privatekey',
  'recoverycode',
  'refreshtoken',
  'securenote',
  'sessionid',
  'totp',
  'vaultkey',
] as const;

export interface PasswordHealthSummary {
  totalAccounts: number;
  reusedPasswords: number;
  blockedPasswords: number;
  accountsWithoutMfa: number;
  accountsWithoutPasskeys: number;
  incompleteSecurityInfo: number;
}

export interface ApprovedDocumentationExcerpt {
  documentId: string;
  title: string;
  sourceUrl: string;
  excerpt: string;
}

export type AiOutboundRequest =
  | {
      feature: 'password-health-explanation';
      schemaVersion: 1;
      payload: PasswordHealthSummary;
    }
  | {
      feature: 'documentation-assistant';
      schemaVersion: 1;
      payload: {
        question: string;
        sources: ApprovedDocumentationExcerpt[];
      };
    };

export function createPasswordHealthRequest(
  input: PasswordHealthSummary,
): AiOutboundRequest {
  const request: AiOutboundRequest = {
    feature: 'password-health-explanation',
    schemaVersion: 1,
    payload: {
      totalAccounts: asCount(input.totalAccounts, 'totalAccounts'),
      reusedPasswords: asCount(input.reusedPasswords, 'reusedPasswords'),
      blockedPasswords: asCount(input.blockedPasswords, 'blockedPasswords'),
      accountsWithoutMfa: asCount(
        input.accountsWithoutMfa,
        'accountsWithoutMfa',
      ),
      accountsWithoutPasskeys: asCount(
        input.accountsWithoutPasskeys,
        'accountsWithoutPasskeys',
      ),
      incompleteSecurityInfo: asCount(
        input.incompleteSecurityInfo,
        'incompleteSecurityInfo',
      ),
    },
  };

  assertNoForbiddenKeys(request);
  return request;
}

export function createDocumentationRequest(
  question: string,
  approvedSources: ApprovedDocumentationExcerpt[],
): AiOutboundRequest {
  const normalizedQuestion = asBoundedText(question, 'question', 1_000);
  const sources = approvedSources.slice(0, 8).map((source) => ({
    documentId: asBoundedText(source.documentId, 'documentId', 120),
    title: asBoundedText(source.title, 'title', 200),
    sourceUrl: asApprovedDocumentationUrl(source.sourceUrl),
    excerpt: asBoundedText(source.excerpt, 'excerpt', 4_000),
  }));

  const request: AiOutboundRequest = {
    feature: 'documentation-assistant',
    schemaVersion: 1,
    payload: {
      question: normalizedQuestion,
      sources,
    },
  };

  assertNoForbiddenKeys(request);
  return request;
}

export function assertNoForbiddenKeys(value: unknown): void {
  visit(value, new Set<object>());
}

function visit(value: unknown, seen: Set<object>): void {
  if (value === null || typeof value !== 'object') {
    return;
  }
  if (seen.has(value)) {
    throw new Error('AI payload must not contain circular data');
  }

  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (
      FORBIDDEN_KEYS.has(normalizedKey) ||
      FORBIDDEN_KEY_PARTS.some((part) => normalizedKey.includes(part))
    ) {
      throw new Error(`Forbidden field in AI payload: ${key}`);
    }
    visit(child, seen);
  }
  seen.delete(value);
}

function asCount(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer`);
  }
  return value;
}

function asBoundedText(
  value: string,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be text`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    throw new Error(`${field} must contain 1 to ${maxLength} characters`);
  }
  return trimmed;
}

function asApprovedDocumentationUrl(value: string): string {
  const url = new URL(asBoundedText(value, 'sourceUrl', 2_000));
  if (url.protocol !== 'https:') {
    throw new Error('Documentation source URLs must use HTTPS');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Documentation source URLs must not contain secrets');
  }
  return url.toString();
}
