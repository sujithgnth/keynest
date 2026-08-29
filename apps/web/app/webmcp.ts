export type KeyNestWebMcpScreen =
  | 'loading'
  | 'auth'
  | 'locked'
  | 'setup'
  | 'vault';

export interface KeyNestWebMcpState {
  screen: KeyNestWebMcpScreen;
  itemCount: number;
}

interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface WebMcpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: WebMcpToolAnnotations;
  execute: (
    input: Record<string, unknown>,
    options: { signal: AbortSignal },
  ) => Promise<Record<string, unknown>>;
}

export interface WebMcpModelContext {
  registerTool(
    tool: WebMcpTool,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>;
}

declare global {
  interface Document {
    readonly modelContext?: WebMcpModelContext;
  }
}

const NO_INPUT_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

export function createKeyNestWebMcpTools(
  state: KeyNestWebMcpState,
  lockVault: () => void,
): WebMcpTool[] {
  const tools: WebMcpTool[] = [
    {
      name: 'keynest_get_vault_status',
      title: 'Get KeyNest vault status',
      description:
        'Returns only whether the user is signed in, the current vault lock state, and an aggregate item count while unlocked. Never returns item identifiers, names, URLs, or secret values.',
      inputSchema: NO_INPUT_SCHEMA,
      annotations: { readOnlyHint: true },
      execute: async () => createSafeVaultStatus(state),
    },
  ];

  if (state.screen === 'vault') {
    tools.push({
      name: 'keynest_lock_vault',
      title: 'Lock the KeyNest vault',
      description:
        'Locks the currently unlocked vault and removes decrypted items and the unwrapped vault key from KeyNest application state. Returns no vault content.',
      inputSchema: NO_INPUT_SCHEMA,
      execute: async () => {
        lockVault();
        return {
          schemaVersion: 1,
          vaultState: 'locked',
          message: 'The KeyNest vault is locked.',
        };
      },
    });
  }

  return tools;
}

export async function registerKeyNestWebMcpTools(
  modelContext: WebMcpModelContext,
  tools: WebMcpTool[],
  controller: AbortController,
): Promise<boolean> {
  try {
    for (const tool of tools) {
      await modelContext.registerTool(tool, { signal: controller.signal });
    }
    return true;
  } catch {
    controller.abort();
    return false;
  }
}

function createSafeVaultStatus(
  state: KeyNestWebMcpState,
): Record<string, unknown> {
  const vaultState =
    state.screen === 'vault'
      ? 'unlocked'
      : state.screen === 'locked'
        ? 'locked'
        : state.screen === 'setup'
          ? 'not_configured'
          : 'unavailable';

  return {
    schemaVersion: 1,
    signedIn: !['loading', 'auth'].includes(state.screen),
    vaultState,
    itemCount:
      state.screen === 'vault' &&
      Number.isSafeInteger(state.itemCount) &&
      state.itemCount >= 0
        ? state.itemCount
        : null,
  };
}
