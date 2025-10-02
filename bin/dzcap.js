#!/usr/bin/env node
import 'tsx'
const cli = await import('../dzcap-cli.js')
const argv = globalThis?.process?.argv
if (!argv) throw new Error(`unable to determine dzcap cli arguments`, { cause: { argv } })
await cli.main({ argv })
