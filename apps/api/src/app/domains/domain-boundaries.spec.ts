import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const domainsRoot = resolve(__dirname);
const domainNames = ['identity', 'vault', 'audit'] as const;
const layers = ['domain', 'application', 'infrastructure', 'presentation'];

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

function domainOf(path: string): string | undefined {
  const [domain] = relative(domainsRoot, path).split(sep);
  return domainNames.find((candidate) => candidate === domain);
}

describe('API domain boundaries', () => {
  it('keeps every bounded context split into explicit layers', () => {
    for (const domain of domainNames) {
      const root = join(domainsRoot, domain);
      expect(existsSync(join(root, `${domain}.module.ts`))).toBe(true);
      expect(existsSync(join(root, 'public-api.ts'))).toBe(true);
      for (const layer of layers) {
        expect(existsSync(join(root, layer))).toBe(true);
      }
    }
  });

  it('keeps domain entities independent of frameworks and infrastructure', () => {
    for (const domain of domainNames) {
      for (const file of sourceFiles(join(domainsRoot, domain, 'domain'))) {
        const source = readFileSync(file, 'utf8');
        expect(source).not.toMatch(
          /from ['"](?:@nestjs|mongodb|redis|amqplib)/,
        );
      }
    }
  });

  it('keeps application services independent of HTTP presentation DTOs', () => {
    for (const domain of domainNames) {
      for (const file of sourceFiles(
        join(domainsRoot, domain, 'application'),
      )) {
        const source = readFileSync(file, 'utf8');
        expect(source).not.toMatch(/from ['"][^'"]*presentation\//);
      }
    }
  });

  it('routes cross-domain dependencies through each public API', () => {
    for (const file of sourceFiles(domainsRoot)) {
      const sourceDomain = domainOf(file);
      const source = readFileSync(file, 'utf8');
      const imports = source.matchAll(/from ['"](\.[^'"]+)['"]/g);
      for (const match of imports) {
        const target = resolve(dirname(file), match[1]);
        const targetDomain = domainOf(target);
        if (!targetDomain || targetDomain === sourceDomain) continue;
        expect(target).toBe(join(domainsRoot, targetDomain, 'public-api'));
      }
    }
  });
});
