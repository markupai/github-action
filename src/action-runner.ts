/**
 * Main action runner that orchestrates the workflow
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { AcrolinxAnalysisResult, EventInfo } from './types/index.js'
import { OUTPUT_NAMES } from './constants/index.js'
import { AcrolinxService } from './services/index.js'
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

/**
 * Main action runner class
 */
export class ActionRunner {
  private acrolinxService: AcrolinxService | null = null
  private config: ReturnType<typeof getActionConfig> | null = null

  constructor() {
    // Configuration will be loaded in the run method to handle errors properly
  }

  /**
   * Run the complete action workflow
   */
  async run(): Promise<void> {
    try {
      // Load and validate configuration
      this.config = getActionConfig()
      this.acrolinxService = new AcrolinxService(this.config.acrolinxApiToken)

      validateConfig(this.config)
      logConfiguration(this.config)

      // Initialize file discovery strategy
      displaySectionHeader('🔍 Initializing File Discovery')
      const strategy = createFileDiscoveryStrategy(github.context)
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
        this.setOutputs(eventInfo, [])
        return
      }

      // Display files being analyzed
      displayFilesToAnalyze(supportedFiles)

      // Run Acrolinx analysis
      displaySectionHeader('🔍 Running Acrolinx Analysis')
      const analysisOptions = getAnalysisOptions(this.config)
      const results = await this.acrolinxService.analyzeFiles(
        supportedFiles,
        analysisOptions,
        readFileContent
      )

      // Display results
      displayAcrolinxResults(results)
      displayJsonResults(results)

      // Set outputs
      this.setOutputs(eventInfo, results)

      // Display summary
      this.displaySummary(results)
    } catch (error) {
      this.handleError(error)
    }
  }

  /**
   * Set GitHub Action outputs
   */
  private setOutputs(
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
  private displaySummary(results: AcrolinxAnalysisResult[]): void {
    if (!this.acrolinxService) return

    const summary = this.acrolinxService.getAnalysisSummary(results)

    displaySectionHeader('📊 Analysis Summary')
    core.info(`📄 Total Files Analyzed: ${summary.totalFiles}`)
    core.info(`⚠️  Total Issues Found: ${summary.totalIssues}`)
    core.info(`📈 Average Quality Score: ${summary.averageQualityScore}`)
    core.info(`📝 Average Clarity Score: ${summary.averageClarityScore}`)
    core.info(`🎭 Average Tone Score: ${summary.averageToneScore}`)
  }

  /**
   * Handle errors gracefully
   */
  private handleError(error: unknown): void {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(`An unexpected error occurred: ${String(error)}`)
    }
  }
}
