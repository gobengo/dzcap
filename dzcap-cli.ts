#!/usr/bin/env node

/**
 * @fileoverview this file should be runnable by nodejs and usable as a posix command line interface.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs"
import { parseArgs } from "node:util"
import { SshpkSigner } from "@wallet.storage/did-sshpk"
import sshpk from "sshpk";
import * as delegation from "./delegation.ts"
import { type IZcapCapability } from "./types.ts";

// common error codes for the dzcap command
export const DZCAP_EXIT_CODE_OK = 0 as const
export const DZCAP_EXIT_CODE_ERROR = 1 as const

interface DzcapCLIOptions {
  console?: Console
}

/**
 * dzcap command line interface application controller.
 * It receives invocations with args, parses them,
 * interprets the dzcap command, dispatches to a command function,
 * and logs any results or errors.
 */
export class DzcapCLI {
  /** syntax sugar to construct and invoke all at once DzcapCLI.invoke() */
  static async invoke(options: DzcapCLIOptions, ...argv: string[]) {
    return new DzcapCLI(options).invoke(...argv)
  }

  console: Console

  constructor(options: DzcapCLIOptions = {}) {
    this.console = options.console || globalThis.console
  }

  /** invoke the CLI with some command line arguments */
  async invoke(...argv: string[]): Promise<typeof DZCAP_EXIT_CODE_OK | typeof DZCAP_EXIT_CODE_ERROR> {
    const { console } = this
    const args = parseArgs({
      allowPositionals: true,
      strict: false,
      args: argv,
      options: {
        controller: {
          type: 'string',
        },
        help: {
          type: 'boolean',
          short: 'h',
        }
      }
    })
    const { positionals, values } = args
    const [, , command] = positionals
    let commandFunction
    switch (command) {
      case "delegate":
        commandFunction = delegate
        break;
      case "help":
        commandFunction = help
        break;
    }

    if (!command && values.help) {
      commandFunction = help
    }

    if (!commandFunction) {
      console.warn(`No command provided. dzcap requires a command as its first argument.`)
      console.warn()
      console.warn(help(this))
      return DZCAP_EXIT_CODE_ERROR
    }

    await commandFunction(this, ...argv)

    return DZCAP_EXIT_CODE_OK
  }
}

/**
 * this main function will be run when the file is executed as a script
 */
async function main() {
  await DzcapCLI.invoke({}, ...process.argv)
}

/**
 * invoked by `dzcap delegate ...`
 */
async function delegate(cli: DzcapCLI, ...args: string[]) {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {
      controller: {
        type: 'string',
      },
      identity: {
        type: 'string',
        short: 'i',
      },
      invocationTarget: {
        type: 'string',
      }
    }
  })

  const { controller } = parsed.values
  if ( ! controller) {
    throw new Error(`please provide an --controller`)
  }

  // parse --identity to a signer that can sign the delegation
  const identityArg = parsed.values.identity
  if (!identityArg) {
    throw new Error(`identity argument must be a path to a string`, { cause: { identityArg } })
  }
  const identitySigner = await createSignerForIdentityArg(identityArg)

  const invocationTarget = parsed.values.invocationTarget
  if ( ! invocationTarget) {
    throw new Error(`please provide an --invocationTarget`)
  }

  const parentCapability = `urn:zcap:root:${encodeURIComponent(invocationTarget)}`

  // build the capability that should be signed
  const capability: IZcapCapability = {
    id: `urn:uuid:${crypto.randomUUID()}`,
    controller: controller ?? `did:todo`,
    expires: new Date(Date.now() + 10 * 1000).toISOString(),
    invocationTarget,
    parentCapability,
    "@context": [
      "https://w3id.org/zcap/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1"
    ],
  }
  const delegatedCapability = await delegation.delegate({
    signer: identitySigner,
    capability,
  })
  console.debug(JSON.stringify(delegatedCapability, null, 2))
}

class FileDoesNotExistError extends Error { }

async function createSignerForIdentityArg(pathToKey: string, options: {
  keyPassPhrase?: string,
} = {}) {
  const pathToKeyExists = typeof pathToKey === "string" && existsSync(pathToKey.toString())
  if (!pathToKeyExists) {
    throw new FileDoesNotExistError(`identity file does not seem to exist`, { cause: { pathToKey } })
  }
  const keyBuffer = readFileSync(pathToKey)
  const privateKey = sshpk.parsePrivateKey(keyBuffer, undefined, {
    passphrase: options.keyPassPhrase,
  })
  const signer = await SshpkSigner.fromPrivateKey(privateKey)
  return signer
}

/** return help text for the dzcap cli. it should be similar to docopt.org syntax */
function generateDzcapDocOpt() {
  return `\
# dzcap

distribute authorization capabilities

Usage:
  dzcap delegate -i <path/to/id> --controller=( <did> | <path/to/id> )
  dzcap key <path/to/key>
  dzcap -h | --help

Options:
  --controller  Show version.
  -h --help     Show this screen.
`
}

/** invoked when `dzcap -h` or `dzcap --help` */
function help(options: DzcapCLIOptions) {
  const { console = globalThis.console } = options
  console.log(generateDzcapDocOpt())
}

// if this file is being executed as a script, run the main function
if (import.meta.url === `file://${realpathSync(process.argv[1])}`) {
  await main()
}
