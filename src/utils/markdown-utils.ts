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

      return `| ${filePath} | ${qualityEmoji} ${Math.round(scores.quality.score)} | ${Math.round(scores.clarity.score)} | ${Math.round(scores.grammar.score)} | ${Math.round(scores.style_guide.score)} | ${Math.round(scores.tone.score)} | ${Math.round(scores.terminology.score)} |`
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

**Overall Quality Score:** ${overallQualityEmoji} ${Math.round(summary.averageQualityScore)}

**Files Analyzed:** ${summary.totalFiles}

| Metric | Average Score |
|--------|---------------|
| Quality | ${Math.round(summary.averageQualityScore)} |
| Clarity | ${Math.round(summary.averageClarityScore)} |
| Grammar | ${Math.round(summary.averageGrammarScore)} |
| Style Guide | ${Math.round(summary.averageStyleGuideScore)} |
| Tone | ${Math.round(summary.averageToneScore)} |
| Terminology | ${Math.round(summary.averageTerminologyScore)} |

`
}

/**
 * Generate footer section with metadata
 */
export function generateFooter(
  config: AnalysisOptions,
  eventType: string
): string {
  return `
---
*Analysis performed on ${new Date().toLocaleString()}*
*Quality Score Legend: 🟢 80+ | 🟡 60-79 | 🔴 0-59*
*Configuration: Dialect: ${config.dialect} | Tone: ${config.tone} | Style Guide: ${config.styleGuide}*
*Event: ${eventType}*`
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
