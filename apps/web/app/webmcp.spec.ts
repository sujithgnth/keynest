import { describe, expect, it, vi } from 'vitest';
import {
  createKeyNestWebMcpTools,
  registerKeyNestWebMcpTools,
  WebMcpModelContext,
} from './webmcp';

describe('KeyNest WebMCP boundary', () => {
  it('exposes only aggregate state and ignores unexpected tool input', async () => {
    const tools = createKeyNestWebMcpTools(
      { screen: 'vault', itemCount: 3 },
      vi.fn(),
    );
    const statusTool = tools.find(
      (tool) => tool.name === 'keynest_get_vault_status',
    );

    const result = await statusTool?.execute(
      {
        password: 'webmcp-plaintext-sentinel',
        username: 'private@example.test',
      },
      { signal: new AbortController().signal },
    );
    const serialized = JSON.stringify(result);

    expect(result).toEqual({
      schemaVersion: 1,
      signedIn: true,
      vaultState: 'unlocked',
      itemCount: 3,
    });
    expect(serialized).not.toContain('webmcp-plaintext-sentinel');
    expect(serialized).not.toContain('private@example.test');
  });

  it('offers the lock action only while the vault is unlocked', async () => {
    const lockVault = vi.fn();
    const unlockedTools = createKeyNestWebMcpTools(
      { screen: 'vault', itemCount: 1 },
      lockVault,
    );
    const lockTool = unlockedTools.find(
      (tool) => tool.name === 'keynest_lock_vault',
    );

    expect(
      createKeyNestWebMcpTools(
        { screen: 'locked', itemCount: 0 },
        lockVault,
      ).map((tool) => tool.name),
    ).toEqual(['keynest_get_vault_status']);

    await lockTool?.execute({}, { signal: new AbortController().signal });

    expect(lockVault).toHaveBeenCalledOnce();
  });

  it('removes partial registrations when browser registration fails', async () => {
    const registerTool = vi
      .fn<WebMcpModelContext['registerTool']>()
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    const controller = new AbortController();
    const tools = createKeyNestWebMcpTools(
      { screen: 'vault', itemCount: 2 },
      vi.fn(),
    );

    await expect(
      registerKeyNestWebMcpTools({ registerTool }, tools, controller),
    ).resolves.toBe(false);
    expect(controller.signal.aborted).toBe(true);
  });
});
