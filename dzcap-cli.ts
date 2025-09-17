#!/usr/bin/env node

/**
 * @fileoverview this file should be runnable by nodejs and usable as a posix command line interface.
 */

import { parseArgs } from "node:util"

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

  constructor(options: DzcapCLIOptions={}) {
    this.console = options.console || globalThis.console
  }

  /** invoke the CLI with some command line arguments */
  async invoke(...argv: string[]): Promise<typeof DZCAP_EXIT_CODE_OK | typeof DZCAP_EXIT_CODE_ERROR> {
    const { console } = this
    const args = parseArgs({
      allowPositionals: true,
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
function delegate(cli: DzcapCLI, ...args: string[]) {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {
      controller: {
        type: 'string',
      }
    }
  })
  const { controller }= parsed.values
  const createdDelegate = {
    controller,
  }
  console.debug(JSON.stringify(createdDelegate, null, 2))
}

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
if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
