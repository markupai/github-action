/**
 * Markdown generation utility functions for Acrolinx analysis results
 */

import { AcrolinxAnalysisResult, AnalysisOptions } from '../types/index.js'
import { getQualityEmoji, calculateScoreSummary } from './score-utils.js'

/**
 * Generate markdown table for analysis results
 */
export function generateResultsTable(
  results: AcrolinxAnalysisResult[]
): string {
  if (results.length === 0) {
    return 'No files were analyzed.'
  }

  const tableHeader = `| File | Quality | Clarity | Grammar | Style Guide | Tone | Terminology |
|------|---------|---------|---------|-------------|------|-------------|`

  const tableRows = results
    .map((result) => {
      const { filePath, result: scores } = result
      const qualityEmoji = getQualityEmoji(scores.quality.score)

      return `| ${filePath} | ${qualityEmoji} ${scores.quality.score} | ${scores.clarity.score} | ${scores.grammar.score} | ${scores.style_guide.score} | ${scores.tone.score} | ${scores.terminology.score} |`
    })
    .join('\n')

  return `${tableHeader}\n${tableRows}`
}

/**
 * Generate summary section
 */
export function generateSummary(results: AcrolinxAnalysisResult[]): string {
  if (results.length === 0) {
    return ''
  }

  const summary = calculateScoreSummary(results)
  const overallQualityEmoji = getQualityEmoji(summary.averageQualityScore)

  return `
## 📊 Summary

**Overall Quality Score:** ${overallQualityEmoji} ${summary.averageQualityScore}

| Metric | Average Score |
|--------|---------------|
| Quality | ${summary.averageQualityScore} |
| Clarity | ${summary.averageClarityScore} |
| Grammar | ${summary.averageGrammarScore} |
| Style Guide | ${summary.averageStyleGuideScore} |
| Tone | ${summary.averageToneScore} |
| Terminology | ${summary.averageTerminologyScore} |

**Files Analyzed:** ${summary.totalFiles}
`
}

/**
 * Generate footer section with metadata
 */
export function generateFooter(
  config: AnalysisOptions,
  eventType: string
): string {
  const eventInfo = ` for **${eventType}** event`

  return `
---
*Analysis performed on ${new Date().toLocaleString()}*
*Quality Score Legend: 🟢 80+ | 🟡 60-79 | 🔴 0-59*
*Configuration: Dialect: ${config.dialect} | Tone: ${config.tone} | Style Guide: ${config.styleGuide}*
*Event: ${eventInfo}*`
}

/**
 * Generate complete analysis content with customizable header
 */
export function generateAnalysisContent(
  results: AcrolinxAnalysisResult[],
  config: AnalysisOptions,
  header: string,
  eventType: string
): string {
  const table = generateResultsTable(results)
  const summary = generateSummary(results)
  const footer = generateFooter(config, eventType)

  return `${header}

${table}

${summary}

${footer}`
}
