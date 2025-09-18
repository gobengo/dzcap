import { Console } from "node:console"
import { Writable } from "node:stream"

/**
 * create an ephemeral console, pass it to callback, and then return it
 * @param useConsole - callback that uses the custom console
 * @returns result of useConsole, and info about the console streams
 */
export async function withConsole<T>(useConsole: (console: Console) => T) {
  // create custom console
  const stdout = new TransformStream({ transform: (chunk, controller) => controller.enqueue(chunk) })
  const stderr = new TransformStream({ transform: (chunk, controller) => controller.enqueue(chunk) })
  const stdoutWritable = Writable.fromWeb(stdout.writable)
  const stderrWritable = Writable.fromWeb(stderr.writable)
  const console = new Console(stdoutWritable, stderrWritable)
  const result = await useConsole(console)
  // close the streams used by the custom console
  stdoutWritable.end()
  stderrWritable.end()
  const context = { console, stdout }
  return [{ console, stdout, stderr }, result] as const
}
