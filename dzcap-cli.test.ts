#!/usr/bin/env node --test
import path, { basename } from 'node:path';
import os from 'node:os'
import assert from "node:assert"
import { type TestContext } from 'node:test';
import { DZCAP_EXIT_CODE_OK, DzcapCLI } from './dzcap-cli.ts';
import { withConsole } from './console-nodejs.ts';
import { exec, execSync } from 'node:child_process';
import { access, mkdtemp } from 'node:fs/promises';

type Testing = Pick<typeof import('node:test'), 'describe' | 'test'>

export class DzcapCliTest {
  testing: Testing
  constructor(testing: Testing) {
    this.testing = testing
  }
  async run() {
    const { describe, test } = this.testing
    await describe(basename(import.meta.url), async () => {
      await test('DzcapCli', DzcapCliTest.testDzcapCli)
    })
  }
  static async testDzcapCli(t: TestContext) {
    await t.test(`dzcap -h`, async t => {
      const [{ stdout }, exitCode] = await withConsole(async console => {
        return DzcapCLI.invoke({ console }, '--help')
      })
      assert.equal(exitCode, DZCAP_EXIT_CODE_OK, `exit code for dzcap --help indicates success`)

      const stdoutText = await new Response(stdout.readable).text()
      assert.ok(stdoutText.includes('dzcap\n'))
      assert.ok(stdoutText.includes('Usage:\n'))
      assert.ok(stdoutText.includes('dzcap delegate'))
      assert.ok(stdoutText.includes('dzcap -h | --help'))
    });
    await t.test(`dzcap delegate`, async t => {
      const identityFile = await createTemporaryIdentityFileEd25519()
      const invocationTarget = `https://example.example/foo/bar/?baz=1`
      const [{ stdout }, exitCode] = await withConsole(async console => {
        return DzcapCLI.invoke({ console }, ...['FAKE', 'FAKE',
          'delegate',
          `--identity=${identityFile}`,
          `--expires=2099-01-01`,
          `--invocationTarget=${invocationTarget}`,
        ]);
      })
      const stdoutText = await new Response(stdout.readable).text()
      const delegation = JSON.parse(stdoutText)
      assert.equal(delegation.expires, '2099-01-01T00:00:00.000Z')
      assert.equal(exitCode, DZCAP_EXIT_CODE_OK, `exit code for dzcap indicates success`)
    })
  }
}

/**
 * Use nodejs fs api to create a tmp directory,
 * then shell out to `ssh-keygen -t ed25519 -f {thatDir/id_ed25519}`
 * to generate a ssh key in that directory.
 * @returns the path to the file
 */
async function createTemporaryIdentityFileEd25519(): Promise<string> {
  try {
    // Create a temporary directory
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ssh-key-'));
    
    // Define the key file path
    const keyPath = path.join(tmpDir, 'id_ed25519');
    
    // Generate the SSH key using ssh-keygen
    // -t ed25519: specify key type
    // -f: specify output file
    // -N "": empty passphrase
    // -q: quiet mode (suppress output)
    execSync(`ssh-keygen -t ed25519 -f "${keyPath}" -N "" -q`);
    
    // Verify the key file was created
    await access(keyPath);
    
    return keyPath;
  } catch (error) {
    throw new Error(`Failed to create SSH key: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}

/**
 * this function is run when this file is executed as a script.
 * it runs the test.
 */
async function main() {
  await new DzcapCliTest(await import('node:test')).run()
}

// if this file executed as a script, run main function
if (`file://${process.argv[1]}` === import.meta.url) {
  await main();
}
