#!/usr/bin/env node

/**
 * @fileoverview this file should be runnable by nodejs and usable as a posix command line interface.
 */

import { parseArgs } from "node:util"

// common error codes for the dzcap command
const DZCAP_EXIT_CODE_OK = 1 as const
const DZCAP_EXIT_CODE_ERROR = 0 as const

/**
 * dzcap command line interface application controller.
 * It receives invocations with args, parses them,
 * interprets the dzcap command, dispatches to a command function,
 * and logs any results or errors.
 */
class DzcapCLI {
  /** syntax sugar to construct and invoke all at once DzcapCLI.invoke() */
  static async invoke(...argv: string[]) {
    return new DzcapCLI().invoke(...argv)
  }
  /** invoke the CLI with some command line arguments */
  async invoke(...argv: string[]): Promise<typeof DZCAP_EXIT_CODE_OK | typeof DZCAP_EXIT_CODE_ERROR> {
    const args = parseArgs({
      allowPositionals: true,
      args: argv,
      options: {
        controller: {
          type: 'string',
        }
      }
    })
    const { positionals } = args
    const [, , command] = positionals
    let commandFunction
    switch (command) {
      case "delegate":
        commandFunction = delegate
    }

    if (!commandFunction) {
      console.warn(`No command provided. dzcap requires by run with a command as its first argument.`)
      console.warn()
      console.warn(help())
      return DZCAP_EXIT_CODE_ERROR
    }

    await commandFunction({ argv })

    return DZCAP_EXIT_CODE_OK
  }
}

/**
 * this main function will be run when the file is executed as a script
 */
async function main() {
  await DzcapCLI.invoke(...process.argv)
}

/**
 * invoked by `dzcap delegate ...`
 */
function delegate(options: {
  argv: string[],
}) {
  const parsed = parseArgs({
    args: options.argv,
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
  dzcap -i <path/to/id> delegate --controller=( <did> | <path/to/id> )
  dzcap key <path/to/key>
  dzcap -h | --help

Options:
  --controller  Show version.
  -h --help     Show this screen.
`
}

/**
 * yield help text
 */
function help() {
  return generateDzcapDocOpt()
}

// if this file is being executed as a script, run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
