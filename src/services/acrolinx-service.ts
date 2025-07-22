/**
 * Acrolinx service for handling style analysis
 */

import * as core from '@actions/core'
import { styleCheck, Config, StyleAnalysisReq } from '@acrolinx/typescript-sdk'
import { AcrolinxAnalysisResult, AnalysisOptions } from '../types/index.js'
import { getFileBasename } from '../utils/file-utils.js'

/**
 * Service class for Acrolinx operations
 */
export class AcrolinxService {
  private config: Config

  constructor(apiToken: string) {
    this.config = { apiKey: apiToken }
  }

  /**
   * Run Acrolinx style check on a single file
   */
  async analyzeFile(
    filePath: string,
    content: string,
    options: AnalysisOptions
  ): Promise<AcrolinxAnalysisResult | null> {
    try {
      core.info(`🔍 Running Acrolinx check on: ${filePath}`)

      const request: StyleAnalysisReq = {
        content,
        dialect: options.dialect,
        tone: options.tone,
        style_guide: options.styleGuide,
        documentName: getFileBasename(filePath)
      }

      const result = await styleCheck(request, this.config)

      return {
        filePath,
        result,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      core.error(`Failed to run Acrolinx check on ${filePath}: ${error}`)
      return null
    }
  }

  /**
   * Run Acrolinx analysis on multiple files
   */
  async analyzeFiles(
    files: string[],
    options: AnalysisOptions,
    readFileContent: (filePath: string) => Promise<string | null>
  ): Promise<AcrolinxAnalysisResult[]> {
    const results: AcrolinxAnalysisResult[] = []

    // Process files sequentially to avoid overwhelming the API
    for (const filePath of files) {
      const content = await readFileContent(filePath)
      if (content) {
        const result = await this.analyzeFile(filePath, content, options)
        if (result) {
          results.push(result)
        }
      }
    }

    return results
  }

  /**
   * Get analysis summary statistics
   */
  getAnalysisSummary(results: AcrolinxAnalysisResult[]): {
    totalFiles: number
    totalIssues: number
    averageQualityScore: number
    averageClarityScore: number
    averageToneScore: number
  } {
    if (results.length === 0) {
      return {
        totalFiles: 0,
        totalIssues: 0,
        averageQualityScore: 0,
        averageClarityScore: 0,
        averageToneScore: 0
      }
    }

    const totalIssues = results.reduce(
      (sum, result) => sum + result.result.issues.length,
      0
    )
    const totalQualityScore = results.reduce(
      (sum, result) => sum + result.result.scores.quality.score,
      0
    )
    const totalClarityScore = results.reduce(
      (sum, result) => sum + result.result.scores.clarity.score,
      0
    )
    const totalToneScore = results.reduce(
      (sum, result) => sum + result.result.scores.tone.score,
      0
    )

    return {
      totalFiles: results.length,
      totalIssues,
      averageQualityScore:
        Math.round((totalQualityScore / results.length) * 100) / 100,
      averageClarityScore:
        Math.round((totalClarityScore / results.length) * 100) / 100,
      averageToneScore:
        Math.round((totalToneScore / results.length) * 100) / 100
    }
  }
}
