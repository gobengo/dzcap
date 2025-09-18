#!/usr/bin/env node --test
import { basename } from 'node:path';
import assert from "node:assert"
import { type TestContext } from 'node:test';
import { DZCAP_EXIT_CODE_OK, DzcapCLI } from './dzcap-cli.ts';
import { withConsole } from './console-nodejs.ts';

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
    })
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
