/**
 * Main action runner that orchestrates the workflow
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { AcrolinxAnalysisResult, EventInfo } from './types/index.js'
import { OUTPUT_NAMES } from './constants/index.js'
import {
  createAcrolinxConfig,
  analyzeFiles,
  getAnalysisSummary
} from './services/acrolinx-service.js'
import { createFileDiscoveryStrategy } from './strategies/index.js'
import {
  getActionConfig,
  getAnalysisOptions,
  validateConfig,
  logConfiguration
} from './config/action-config.js'
import { filterSupportedFiles, readFileContent } from './utils/index.js'
import {
  displayEventInfo,
  displayFilesToAnalyze,
  displayAcrolinxResults,
  displayJsonResults,
  displaySectionHeader
} from './utils/index.js'
import {
  createOrUpdatePRComment,
  isPullRequestEvent,
  getPRNumber
} from './services/pr-comment-service.js'
import { createGitHubClient } from './services/github-service.js'

/**
 * Set GitHub Action outputs
 */
function setOutputs(
  eventInfo: EventInfo,
  results: AcrolinxAnalysisResult[]
): void {
  core.setOutput(OUTPUT_NAMES.EVENT_TYPE, eventInfo.eventType)
  core.setOutput(OUTPUT_NAMES.FILES_ANALYZED, results.length.toString())
  core.setOutput(OUTPUT_NAMES.ACROLINX_RESULTS, JSON.stringify(results))
}

/**
 * Display analysis summary
 */
function displaySummary(results: AcrolinxAnalysisResult[]): void {
  const summary = getAnalysisSummary(results)

  displaySectionHeader('📊 Analysis Summary')
  core.info(`📄 Total Files Analyzed: ${summary.totalFiles}`)
  core.info(`📈 Average Quality Score: ${summary.averageQualityScore}`)
  core.info(`📝 Average Clarity Score: ${summary.averageClarityScore}`)
  core.info(`🎭 Average Tone Score: ${summary.averageToneScore}`)
}

/**
 * Handle errors gracefully
 */
function handleError(error: unknown): void {
  if (error instanceof Error) {
    core.setFailed(error.message)
  } else {
    core.setFailed(`An unexpected error occurred: ${String(error)}`)
  }
}

/**
 * Run the complete action workflow
 */
export async function runAction(): Promise<void> {
  try {
    // Load and validate configuration
    const config = getActionConfig()
    const acrolinxConfig = createAcrolinxConfig(config.acrolinxApiToken)

    validateConfig(config)
    logConfiguration(config)

    // Initialize file discovery strategy
    displaySectionHeader('🔍 Initializing File Discovery')
    const strategy = createFileDiscoveryStrategy(
      github.context,
      config.githubToken
    )
    const eventInfo = strategy.getEventInfo()

    // Display event information
    displaySectionHeader('📋 Event Analysis')
    displayEventInfo(eventInfo)

    // Discover files to analyze
    displaySectionHeader('🔍 Discovering Files')
    const allFiles = await strategy.getFilesToAnalyze()
    const supportedFiles = filterSupportedFiles(allFiles)

    // Update event info with actual file count
    eventInfo.filesCount = supportedFiles.length
    core.info(
      `📊 Found ${supportedFiles.length} supported files out of ${allFiles.length} total files`
    )

    if (supportedFiles.length === 0) {
      core.info('No supported files found to analyze.')
      setOutputs(eventInfo, [])
      return
    }

    // Display files being analyzed
    displayFilesToAnalyze(supportedFiles)

    // Run Acrolinx analysis
    displaySectionHeader('🔍 Running Acrolinx Analysis')
    const analysisOptions = getAnalysisOptions(config)
    const results = await analyzeFiles(
      supportedFiles,
      analysisOptions,
      acrolinxConfig,
      readFileContent
    )

    // Display results
    displayAcrolinxResults(results)
    displayJsonResults(results)

    // Set outputs
    setOutputs(eventInfo, results)

    // Display summary
    displaySummary(results)

    // Handle PR comments for pull request events
    if (isPullRequestEvent() && results.length > 0) {
      const prNumber = getPRNumber()
      if (prNumber) {
        displaySectionHeader('💬 Creating PR Comment')
        const octokit = createGitHubClient(config.githubToken)

        await createOrUpdatePRComment(octokit, {
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          prNumber,
          results
        })
      }
    }
  } catch (error) {
    handleError(error)
  }
}
