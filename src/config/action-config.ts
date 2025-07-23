/**
 * Action configuration and input validation
 */

import * as core from '@actions/core'
import { ActionConfig, AnalysisOptions } from '../types/index.js'
import {
  INPUT_NAMES,
  ENV_VARS,
  DEFAULT_ANALYSIS_OPTIONS,
  ERROR_MESSAGES
} from '../constants/index.js'

/**
 * Get and validate action configuration from inputs
 */
export function getActionConfig(): ActionConfig {
  const acrolinxApiToken = getRequiredInput(
    INPUT_NAMES.ACROLINX_TOKEN,
    ENV_VARS.ACROLINX_TOKEN
  )
  const githubToken = getRequiredInput(
    INPUT_NAMES.GITHUB_TOKEN,
    ENV_VARS.GITHUB_TOKEN
  )

  const dialect = getOptionalInput(
    INPUT_NAMES.DIALECT,
    DEFAULT_ANALYSIS_OPTIONS.dialect
  )
  const tone = getOptionalInput(INPUT_NAMES.TONE, DEFAULT_ANALYSIS_OPTIONS.tone)
  const styleGuide = getOptionalInput(
    INPUT_NAMES.STYLE_GUIDE,
    DEFAULT_ANALYSIS_OPTIONS.styleGuide
  )

  const addCommitStatus = getBooleanInput(INPUT_NAMES.ADD_COMMIT_STATUS, true)

  return {
    acrolinxApiToken,
    githubToken,
    dialect,
    tone,
    styleGuide,
    addCommitStatus
  }
}

/**
 * Get analysis options from configuration
 */
export function getAnalysisOptions(config: ActionConfig): AnalysisOptions {
  return {
    dialect: config.dialect,
    tone: config.tone,
    styleGuide: config.styleGuide
  }
}

/**
 * Get a required input value with fallback to environment variable
 */
function getRequiredInput(inputName: string, envVarName: string): string {
  const value = core.getInput(inputName) || process.env[envVarName]

  if (!value) {
    throw new Error(
      `Required input '${inputName}' or environment variable '${envVarName}' is not provided`
    )
  }

  return value
}

/**
 * Get an optional input value with fallback to environment variable and default
 */
function getOptionalInput(inputName: string, defaultValue: string): string {
  return (
    core.getInput(inputName) ||
    process.env[inputName.toUpperCase()] ||
    defaultValue
  )
}

/**
 * Get a boolean input value with fallback to environment variable and default
 */
function getBooleanInput(inputName: string, defaultValue: boolean): boolean {
  const value = core.getInput(inputName) || process.env[inputName.toUpperCase()]

  if (value === undefined || value === '') {
    return defaultValue
  }

  return value.toLowerCase() === 'true'
}

/**
 * Validate configuration
 */
export function validateConfig(config: ActionConfig): void {
  if (!config.acrolinxApiToken) {
    throw new Error(ERROR_MESSAGES.ACROLINX_TOKEN_REQUIRED)
  }

  if (!config.githubToken) {
    core.warning(ERROR_MESSAGES.GITHUB_TOKEN_WARNING)
  }

  // Validate analysis options
  validateAnalysisOption('dialect', config.dialect)
  validateAnalysisOption('tone', config.tone)
  validateAnalysisOption('style_guide', config.styleGuide)
}

/**
 * Validate individual analysis option
 */
function validateAnalysisOption(name: string, value: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`Analysis option '${name}' cannot be empty`)
  }
}

/**
 * Log configuration (without sensitive data)
 */
export function logConfiguration(config: ActionConfig): void {
  core.info('🔧 Action Configuration:')
  core.info(`  Dialect: ${config.dialect}`)
  core.info(`  Tone: ${config.tone}`)
  core.info(`  Style Guide: ${config.styleGuide}`)
  core.info(
    `  Acrolinx Token: ${config.acrolinxApiToken ? '[PROVIDED]' : '[MISSING]'}`
  )
  core.info(
    `  GitHub Token: ${config.githubToken ? '[PROVIDED]' : '[MISSING]'}`
  )
}
