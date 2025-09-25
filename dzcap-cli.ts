#!/usr/bin/env node

/**
 * @file this file should be runnable by nodejs and usable as a posix command line interface.
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
  /**
   * syntax sugar to construct and invoke all at once DzcapCLI.invoke()
   * @param options - options
   * @param options.console - custom js console
   * @param argv - cli args
   * @returns dzcap exit code
   */
  static async invoke(options: DzcapCLIOptions, ...argv: string[]) {
    return new DzcapCLI(options).invoke(...argv)
  }

  console: Console

  constructor(options: DzcapCLIOptions = {}) {
    this.console = options.console || globalThis.console
  }

  /**
   * invoke the CLI with some command line arguments
   * @param argv - cli args
   * @returns exit code
   */
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
      help(this)
      return DZCAP_EXIT_CODE_ERROR
    }

    await commandFunction(this, ...argv)

    return DZCAP_EXIT_CODE_OK
  }
}

/**
 * this main function will be run when the file is executed as a script
 * @param options - options
 * @param options.argv - process.argv
 * @returns dzcap exit code
 */
export async function main({argv=process.argv}:{argv?:string[]}={}) {
  return await DzcapCLI.invoke({}, ...argv)
}

/**
 * invoked by `dzcap delegate ...`.
 * it should parse args, use them to sign a delegation, and log the new delegation to stdout
 * @param cli - cli application object
 * @param args - cli args
 */
async function delegate(cli: DzcapCLI, ...args: string[]) {
  const { console } = cli
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {
      allowedAction: {
        type: 'string',
        multiple: true,
      },
      controller: {
        type: 'string',
      },
      expires: {
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

  const { allowedAction } = parsed.values
  const { controller } = parsed.values

  // parse --identity to a signer that can sign the delegation
  const identityArg = parsed.values.identity
  if (!identityArg) {
    throw new Error(`identity argument must be a path to a string`, { cause: { identityArg } })
  }
  const identitySigner = await createSignerForIdentityPath(identityArg)

  const invocationTarget = parsed.values.invocationTarget
  if ( ! invocationTarget) throw new Error(`please provide an --invocationTarget <uri>`)

  const parentCapability = invocationTarget ? `urn:zcap:root:${encodeURIComponent(invocationTarget)}` : undefined

  // parse --expires using Date.parse
  const expiresArg = parsed.values.expires
  if ( ! expiresArg) throw new Error(`please provide an --expires argument`)
  const expires = new Date(Date.parse(expiresArg))
  if (isNaN(Number(expires))) throw new Error(`unable tp parse --expires value to a datetime`, { cause: expiresArg })

  // build the capability that should be signed
  const capability: IZcapCapability = {
    allowedAction,
    id: `urn:uuid:${crypto.randomUUID()}`,
    controller: controller ?? `did:todo`,
    expires: expires.toISOString(),
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

/**
 * create a proof signer from path to a ed25519 ssh key file
 * @param pathToKey - path to ssh key file
 * @param options - options
 * @param options.keyPassPhrase - ssh key file passphrase
 * @returns - proof signer that signs using key in identity file
 */
async function createSignerForIdentityPath(pathToKey: string, options: {
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

/** @returns help text for the dzcap cli. it should be similar to docopt.org syntax */
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

/**
 * invoked when `dzcap -h` or `dzcap --help`
 * @param options - cli options
 * @param options.console - custom js console (override globalThis.console)
 */
function help(options: DzcapCLIOptions) {
  const { console = globalThis.console } = options
  console.log(generateDzcapDocOpt())
}

// if this file is being executed as a script, run the main function
if (import.meta.url === `file://${realpathSync(process.argv[1])}`) {
  await main()
}
