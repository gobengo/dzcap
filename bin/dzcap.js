#!/usr/bin/env node
import 'tsx'
const cli = await import('../dzcap-cli.ts')
const argv = process.argv
await cli.main({ argv })
