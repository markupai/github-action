/**
 * Main action runner that orchestrates the workflow
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { AcrolinxAnalysisResult, EventInfo } from './types/index.js'
import { OUTPUT_NAMES, EVENT_TYPES } from './constants/index.js'
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
  displaySectionHeader
} from './utils/index.js'
import {
  createOrUpdatePRComment,
  isPullRequestEvent,
  getPRNumber
} from './services/pr-comment-service.js'
import {
  createGitHubClient,
  updateCommitStatus,
  createAcrolinxBadge
} from './services/github-service.js'

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
 * Handle post-analysis actions based on event type
 */
async function handlePostAnalysisActions(
  eventInfo: EventInfo,
  results: AcrolinxAnalysisResult[],
  config: { githubToken: string },
  analysisOptions: ReturnType<typeof getAnalysisOptions>
): Promise<void> {
  if (results.length === 0) {
    core.info('No results to process for post-analysis actions.')
    return
  }

  const summary = getAnalysisSummary(results)
  const octokit = createGitHubClient(config.githubToken)
  const { owner, repo } = github.context.repo

  // Handle different event types
  switch (eventInfo.eventType) {
    case EVENT_TYPES.PUSH:
      // Update commit status for push events
      displaySectionHeader('📊 Updating Commit Status')
      await updateCommitStatus(
        octokit,
        owner,
        repo,
        github.context.sha,
        summary.averageQualityScore,
        results.length
      )
      break

    case EVENT_TYPES.WORKFLOW_DISPATCH:
    case EVENT_TYPES.SCHEDULE:
      // Create/update Acrolinx badge for manual/scheduled workflows
      displaySectionHeader('🏷️  Updating Acrolinx Badge')
      await createAcrolinxBadge(
        octokit,
        owner,
        repo,
        summary.averageQualityScore,
        github.context.ref.replace('refs/heads/', '')
      )
      break

    case EVENT_TYPES.PULL_REQUEST:
      // Handle PR comments for pull request events
      if (isPullRequestEvent()) {
        const prNumber = getPRNumber()
        if (prNumber) {
          displaySectionHeader('💬 Creating PR Comment')
          await createOrUpdatePRComment(octokit, {
            owner,
            repo,
            prNumber,
            results,
            config: analysisOptions
          })
        }
      }
      break

    default:
      core.info(
        `No specific post-analysis actions for event type: ${eventInfo.eventType}`
      )
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

    // Set outputs
    setOutputs(eventInfo, results)

    // Display summary
    displaySummary(results)

    // Handle post-analysis actions based on event type
    await handlePostAnalysisActions(eventInfo, results, config, analysisOptions)
  } catch (error) {
    handleError(error)
  }
}
