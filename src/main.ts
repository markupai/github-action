/**
 * The main function for the action.
 * This file serves as the entry point and orchestrates the workflow.
 */

import { ActionRunner } from './action-runner.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const runner = new ActionRunner()
  await runner.run()
}
