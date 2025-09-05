/**
 * Tests for markdown generation utilities
 */

import { jest } from '@jest/globals'

// Mock the score-utils module
jest.unstable_mockModule('../src/utils/score-utils.js', () => ({
  getQualityEmoji: jest.fn((score: number) => {
    if (score >= 80) return '🟢'
    if (score >= 60) return '🟡'
    return '🔴'
  }),
  calculateScoreSummary: jest.fn((results: Array<{ result: StyleScores }>) => {
    if (results.length === 0) {
      return {
        totalFiles: 0,
        averageQualityScore: 0,
        averageClarityScore: 0,
        averageToneScore: 0,
        averageGrammarScore: 0,
        averageStyleGuideScore: 0,
        averageTerminologyScore: 0
      }
    }

    const qualityScores = results.map((r) => r.result.quality.score)
    const clarityScores = results.map((r) => r.result.analysis.clarity.score)
    const toneScores = results.map((r) => r.result.analysis.tone.score)
    const grammarScores = results.map((r) => r.result.quality.grammar.score)
    const styleGuideScores = results.map(
      (r) => r.result.quality.style_guide.score
    )
    const terminologyScores = results.map(
      (r) => r.result.quality.terminology.score
    )

    const calculateAverage = (scores: number[]) => {
      if (scores.length === 0) return 0
      const sum = scores.reduce((acc, score) => acc + score, 0)
      return Math.round((sum / scores.length) * 100) / 100
    }

    return {
      totalFiles: results.length,
      averageQualityScore: calculateAverage(qualityScores),
      averageClarityScore: calculateAverage(clarityScores),
      averageToneScore: calculateAverage(toneScores),
      averageGrammarScore: calculateAverage(grammarScores),
      averageStyleGuideScore: calculateAverage(styleGuideScores),
      averageTerminologyScore: calculateAverage(terminologyScores)
    }
  })
}))

const {
  generateResultsTable,
  generateSummary,
  generateFooter,
  generateAnalysisContent
} = await import('../src/utils/markdown-utils.js')
import { AnalysisResult, AnalysisOptions } from '../src/types/index.js'
import { StyleScores } from '@markupai/toolkit'

describe('Markdown Utils', () => {
  const mockAnalysisOptions: AnalysisOptions = {
    dialect: 'american_english',
    tone: 'formal',
    styleGuide: 'ap'
  }

  const createMockResult = (
    filePath: string,
    scores: {
      quality: number
      clarity: number
      grammar: number
      style_guide: number
      tone: number
      terminology: number
    }
  ): AnalysisResult => ({
    filePath,
    result: {
      quality: {
        score: scores.quality,
        grammar: { score: scores.grammar, issues: 0 },
        alignment: { score: scores.style_guide, issues: 0 },
        style_guide: { score: scores.style_guide, issues: 0 },
        terminology: { score: scores.terminology, issues: 0 }
      },
      analysis: {
        clarity: {
          score: scores.clarity,
          word_count: 100,
          sentence_count: 5,
          average_sentence_length: 20,
          flesch_reading_ease: 70,
          vocabulary_complexity: 0.5,
          sentence_complexity: 0.4
        },
        tone: {
          score: scores.tone,
          informality: 0,
          liveliness: 0,
          informality_alignment: 0,
          liveliness_alignment: 0
        }
      }
    },
    timestamp: '2024-01-01T00:00:00Z'
  })

  describe('generateResultsTable', () => {
    it('should return message for empty results', () => {
      const result = generateResultsTable([])
      expect(result).toBe('No files were analyzed.')
    })

    it('should generate table with rounded scores', () => {
      const results = [
        createMockResult('test1.md', {
          quality: 85.7,
          clarity: 92.3,
          grammar: 78.9,
          style_guide: 88.1,
          tone: 91.5,
          terminology: 87.2
        }),
        createMockResult('test2.md', {
          quality: 72.4,
          clarity: 68.9,
          grammar: 75.6,
          style_guide: 71.3,
          tone: 69.8,
          terminology: 73.1
        })
      ]

      const result = generateResultsTable(results)

      // Check that scores are rounded to integers
      expect(result).toContain('🟢 86') // 85.7 rounded to 86
      expect(result).toContain('92') // 92.3 rounded to 92
      expect(result).toContain('79') // 78.9 rounded to 79
      expect(result).toContain('88') // 88.1 rounded to 88
      expect(result).toContain('92') // 91.5 rounded to 92
      expect(result).toContain('87') // 87.2 rounded to 87

      expect(result).toContain('🟡 72') // 72.4 rounded to 72
      expect(result).toContain('69') // 68.9 rounded to 69
      expect(result).toContain('76') // 75.6 rounded to 76
      expect(result).toContain('71') // 71.3 rounded to 71
      expect(result).toContain('70') // 69.8 rounded to 70
      expect(result).toContain('73') // 73.1 rounded to 73

      // Check table structure
      expect(result).toContain(
        '| File | Quality | Grammar | Style Guide | Terminology | Clarity | Tone |'
      )
      expect(result).toContain(
        '|------|---------|---------|---------|---------|---------|------|'
      )
      expect(result).toContain('| test1.md |')
      expect(result).toContain('| test2.md |')
    })

    it('should handle decimal scores that round down', () => {
      const results = [
        createMockResult('test.md', {
          quality: 85.4,
          clarity: 92.1,
          grammar: 78.2,
          style_guide: 88.0,
          tone: 91.3,
          terminology: 87.7
        })
      ]

      const result = generateResultsTable(results)

      expect(result).toContain('🟢 85') // 85.4 rounded to 85
      expect(result).toContain('92') // 92.1 rounded to 92
      expect(result).toContain('78') // 78.2 rounded to 78
      expect(result).toContain('88') // 88.0 rounded to 88
      expect(result).toContain('91') // 91.3 rounded to 91
      expect(result).toContain('88') // 87.7 rounded to 88
    })

    it('should handle decimal scores that round up', () => {
      const results = [
        createMockResult('test.md', {
          quality: 85.5,
          clarity: 92.6,
          grammar: 78.7,
          style_guide: 88.8,
          tone: 91.9,
          terminology: 87.5
        })
      ]

      const result = generateResultsTable(results)

      expect(result).toContain('🟢 86') // 85.5 rounded to 86
      expect(result).toContain('93') // 92.6 rounded to 93
      expect(result).toContain('79') // 78.7 rounded to 79
      expect(result).toContain('89') // 88.8 rounded to 89
      expect(result).toContain('92') // 91.9 rounded to 92
      expect(result).toContain('88') // 87.5 rounded to 88
    })

    it('should handle zero scores', () => {
      const results = [
        createMockResult('test.md', {
          quality: 0,
          clarity: 0,
          grammar: 0,
          style_guide: 0,
          tone: 0,
          terminology: 0
        })
      ]

      const result = generateResultsTable(results)

      expect(result).toContain('🔴 0')
      expect(result).toContain('| test.md | 🔴 0 | 0 | 0 | 0 | 0 | 0 |')
    })

    it('should handle perfect scores', () => {
      const results = [
        createMockResult('test.md', {
          quality: 100,
          clarity: 100,
          grammar: 100,
          style_guide: 100,
          tone: 100,
          terminology: 100
        })
      ]

      const result = generateResultsTable(results)

      expect(result).toContain('🟢 100')
      expect(result).toContain(
        '| test.md | 🟢 100 | 100 | 100 | 100 | 100 | 100 |'
      )
    })
  })

  describe('generateSummary', () => {
    it('should return empty string for empty results', () => {
      const result = generateSummary([])
      expect(result).toBe('')
    })

    it('should generate summary with rounded average scores', () => {
      const results = [
        createMockResult('test1.md', {
          quality: 85.7,
          clarity: 92.3,
          grammar: 78.9,
          style_guide: 88.1,
          tone: 91.5,
          terminology: 87.2
        }),
        createMockResult('test2.md', {
          quality: 72.4,
          clarity: 68.9,
          grammar: 75.6,
          style_guide: 71.3,
          tone: 69.8,
          terminology: 73.1
        })
      ]

      const result = generateSummary(results)

      // Check that average scores are rounded
      expect(result).toContain('**Overall Quality Score:** 🟡 79') // (85.7 + 72.4) / 2 = 79.05 rounded to 79
      expect(result).toContain('| Quality | 79 |')
      expect(result).toContain('| Clarity | 81 |') // (92.3 + 68.9) / 2 = 80.6 rounded to 81
      expect(result).toContain('| Grammar | 77 |') // (78.9 + 75.6) / 2 = 77.25 rounded to 77
      expect(result).toContain('| Style Guide | 80 |') // (88.1 + 71.3) / 2 = 79.7 rounded to 80
      expect(result).toContain('| Tone | 81 |') // (91.5 + 69.8) / 2 = 80.65 rounded to 81
      expect(result).toContain('| Terminology | 80 |') // (87.2 + 73.1) / 2 = 80.15 rounded to 80

      expect(result).toContain('**Files Analyzed:** 2')
    })

    it('should handle single result with decimal averages', () => {
      const results = [
        createMockResult('test.md', {
          quality: 85.7,
          clarity: 92.3,
          grammar: 78.9,
          style_guide: 88.1,
          tone: 91.5,
          terminology: 87.2
        })
      ]

      const result = generateSummary(results)

      expect(result).toContain('**Overall Quality Score:** 🟢 86') // 85.7 rounded to 86
      expect(result).toContain('| Quality | 86 |')
      expect(result).toContain('| Clarity | 92 |')
      expect(result).toContain('| Grammar | 79 |')
      expect(result).toContain('| Style Guide | 88 |')
      expect(result).toContain('| Tone | 92 |')
      expect(result).toContain('| Terminology | 87 |')
    })

    it('should handle averages that round down', () => {
      const results = [
        createMockResult('test1.md', {
          quality: 85,
          clarity: 92,
          grammar: 78,
          style_guide: 88,
          tone: 91,
          terminology: 87
        }),
        createMockResult('test2.md', {
          quality: 85,
          clarity: 92,
          grammar: 78,
          style_guide: 88,
          tone: 91,
          terminology: 87
        })
      ]

      const result = generateSummary(results)

      // All averages should be the same as individual scores since they're identical
      expect(result).toContain('**Overall Quality Score:** 🟢 85')
      expect(result).toContain('| Quality | 85 |')
      expect(result).toContain('| Clarity | 92 |')
      expect(result).toContain('| Grammar | 78 |')
      expect(result).toContain('| Style Guide | 88 |')
      expect(result).toContain('| Tone | 91 |')
      expect(result).toContain('| Terminology | 87 |')
    })

    it('should handle averages that round up', () => {
      const results = [
        createMockResult('test1.md', {
          quality: 85,
          clarity: 92,
          grammar: 78,
          style_guide: 88,
          tone: 91,
          terminology: 87
        }),
        createMockResult('test2.md', {
          quality: 86,
          clarity: 93,
          grammar: 79,
          style_guide: 89,
          tone: 92,
          terminology: 88
        })
      ]

      const result = generateSummary(results)

      // Averages should be rounded appropriately
      expect(result).toContain('**Overall Quality Score:** 🟢 86') // (85 + 86) / 2 = 85.5 rounded to 86
      expect(result).toContain('| Quality | 86 |')
      expect(result).toContain('| Clarity | 93 |') // (92 + 93) / 2 = 92.5 rounded to 93
      expect(result).toContain('| Grammar | 79 |') // (78 + 79) / 2 = 78.5 rounded to 79
      expect(result).toContain('| Style Guide | 89 |') // (88 + 89) / 2 = 88.5 rounded to 89
      expect(result).toContain('| Tone | 92 |') // (91 + 92) / 2 = 91.5 rounded to 92
      expect(result).toContain('| Terminology | 88 |') // (87 + 88) / 2 = 87.5 rounded to 88
    })
  })

  describe('generateFooter', () => {
    it('should generate footer with configuration and event info', () => {
      const result = generateFooter(mockAnalysisOptions, 'push')

      expect(result).toContain('*Analysis performed on')
      expect(result).toContain(
        '*Quality Score Legend: 🟢 80+ | 🟡 60-79 | 🔴 0-59*'
      )
      expect(result).toContain(
        '*Configuration: Dialect: american_english | Tone: formal | Style Guide: ap*'
      )
      expect(result).toContain('*Event: push*')
    })

    it('should handle different event types', () => {
      const result = generateFooter(mockAnalysisOptions, 'pull_request')

      expect(result).toContain('*Event: pull_request*')
    })
  })

  describe('generateAnalysisContent', () => {
    it('should generate complete analysis content', () => {
      const results = [
        createMockResult('test.md', {
          quality: 85.7,
          clarity: 92.3,
          grammar: 78.9,
          style_guide: 88.1,
          tone: 91.5,
          terminology: 87.2
        })
      ]

      const header = '# Analysis Results'
      const result = generateAnalysisContent(
        results,
        mockAnalysisOptions,
        header,
        'push'
      )

      // Should contain all sections
      expect(result).toContain(header)
      expect(result).toContain(
        '| File | Quality | Grammar | Style Guide | Terminology | Clarity | Tone |'
      )
      expect(result).toContain('## 📊 Summary')
      expect(result).toContain('*Analysis performed on')
      expect(result).toContain('*Event: push*')

      // Should contain rounded scores
      expect(result).toContain('🟢 86') // 85.7 rounded to 86
      expect(result).toContain('92') // 92.3 rounded to 92
      expect(result).toContain('79') // 78.9 rounded to 79
    })

    it('should handle empty results', () => {
      const header = '# Analysis Results'
      const result = generateAnalysisContent(
        [],
        mockAnalysisOptions,
        header,
        'push'
      )

      expect(result).toContain(header)
      expect(result).toContain('No files were analyzed.')
      expect(result).toContain('*Event: push*')
      // Should not contain summary section for empty results
      expect(result).not.toContain('## 📊 Summary')
    })
  })
})
