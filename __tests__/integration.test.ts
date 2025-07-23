/**
 * Integration tests for the action
 */

import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock dependencies
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => ({
  getOctokit: jest.fn(() => ({
    rest: {
      repos: {
        getCommit: jest.fn(() =>
          Promise.resolve({
            data: {
              sha: 'abc123456789',
              commit: {
                message: 'test commit',
                author: {
                  name: 'Test User',
                  date: '2024-01-15T10:30:00Z'
                }
              },
              files: [
                {
                  filename: 'README.md',
                  status: 'modified',
                  additions: 5,
                  deletions: 2,
                  changes: 7,
                  patch: '@@ -1,3 +1,5 @@\n-test\n+new test\n'
                },
                {
                  filename: 'src/main.ts',
                  status: 'modified',
                  additions: 10,
                  deletions: 3,
                  changes: 13,
                  patch: '@@ -1,3 +1,10 @@\n-old code\n+new code\n'
                }
              ]
            }
          })
        )
      }
    }
  })),
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    },
    sha: 'abc123456789',
    eventName: 'push'
  }
}))

// Mock the Acrolinx SDK
jest.unstable_mockModule('@acrolinx/typescript-sdk', () => ({
  styleCheck: jest.fn(() =>
    Promise.resolve({
      workflow_id: 'test-workflow-123',
      status: 'completed',
      scores: {
        quality: { score: 85.2 },
        clarity: { score: 78.5 },
        grammar: { score: 90.1, issues: 2 },
        style_guide: { score: 88.3, issues: 1 },
        tone: { score: 82.3 },
        terminology: { score: 95.0, issues: 0 }
      },
      issues: [
        {
          original: 'test text',
          char_index: 10,
          subcategory: 'passive_voice',
          category: 'style_guide'
        }
      ]
    })
  ),
  styleBatchCheckRequests: jest.fn(() => ({
    progress: {
      total: 1,
      completed: 1,
      failed: 0,
      inProgress: 0,
      pending: 0,
      results: [
        {
          index: 0,
          status: 'completed',
          result: {
            scores: {
              quality: { score: 85.2 },
              clarity: { score: 78.5 },
              grammar: { score: 90.1, issues: 2 },
              style_guide: { score: 88.3, issues: 1 },
              tone: { score: 82.3 },
              terminology: { score: 95.0, issues: 0 }
            }
          }
        }
      ],
      startTime: Date.now()
    },
    promise: Promise.resolve({
      total: 1,
      completed: 1,
      failed: 0,
      inProgress: 0,
      pending: 0,
      results: [
        {
          index: 0,
          status: 'completed',
          result: {
            scores: {
              quality: { score: 85.2 },
              clarity: { score: 78.5 },
              grammar: { score: 90.1, issues: 2 },
              style_guide: { score: 88.3, issues: 1 },
              tone: { score: 82.3 },
              terminology: { score: 95.0, issues: 0 }
            }
          }
        }
      ],
      startTime: Date.now()
    }),
    cancel: jest.fn()
  }))
}))

// Mock fs/promises
jest.unstable_mockModule('fs/promises', () => ({
  readFile: jest.fn(() => Promise.resolve('Test content for Acrolinx analysis'))
}))

const { run } = await import('../src/main.js')

describe('Integration Tests', () => {
  beforeEach(() => {
    // Set the action's inputs as return values from core.getInput().
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'acrolinx_token':
          return 'test-acrolinx-token'
        case 'dialect':
          return 'american_english'
        case 'tone':
          return 'formal'
        case 'style-guide':
          return 'ap'
        case 'github_token':
          return 'test-github-token'
        default:
          return ''
      }
    })

    // Mock process.env.GITHUB_TOKEN and GITHUB_REPOSITORY
    process.env.GITHUB_TOKEN = 'test-github-token'
    process.env.GITHUB_REPOSITORY = 'test-owner/test-repo'
  })

  afterEach(() => {
    jest.resetAllMocks()
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_REPOSITORY
  })

  describe('Main Action Flow', () => {
    it('should run complete workflow successfully', async () => {
      await run()

      // Verify the outputs were set correctly
      expect(core.setOutput).toHaveBeenCalledWith('event-type', 'push')
      expect(core.setOutput).toHaveBeenCalledWith('files-analyzed', '1')
      expect(core.setOutput).toHaveBeenCalledWith(
        'acrolinx-results',
        expect.any(String)
      )

      // Verify the results contain the expected data
      const resultsCall = core.setOutput.mock.calls.find(
        (call) => call[0] === 'acrolinx-results'
      )
      expect(resultsCall).toBeDefined()
      const results = JSON.parse(resultsCall![1])

      expect(results).toHaveLength(1)
      expect(results[0].filePath).toBe('README.md')
      expect(results[0].result.quality.score).toBe(85.2)
    })

    it('should handle missing Acrolinx token', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'acrolinx_token':
            return ''
          case 'dialect':
            return 'american_english'
          case 'tone':
            return 'formal'
          case 'style-guide':
            return 'ap'
          case 'github_token':
            return 'test-github-token'
          default:
            return ''
        }
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        "Required input 'acrolinx_token' or environment variable 'ACROLNX_TOKEN' is not provided"
      )
    })

    it('should handle missing GitHub token', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'acrolinx_token':
            return 'test-acrolinx-token'
          case 'dialect':
            return 'american_english'
          case 'tone':
            return 'formal'
          case 'style-guide':
            return 'ap'
          case 'github_token':
            return ''
          default:
            return ''
        }
      })

      delete process.env.GITHUB_TOKEN

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        "Required input 'github_token' or environment variable 'GITHUB_TOKEN' is not provided"
      )
    })

    it('should handle custom analysis options', async () => {
      core.getInput.mockImplementation((name: string) => {
        switch (name) {
          case 'acrolinx_token':
            return 'test-acrolinx-token'
          case 'dialect':
            return 'british_english'
          case 'tone':
            return 'informal'
          case 'style-guide':
            return 'chicago'
          case 'github_token':
            return 'test-github-token'
          default:
            return ''
        }
      })

      await run()

      // Verify the action completed successfully with custom options
      expect(core.setOutput).toHaveBeenCalledWith('event-type', 'push')
      expect(core.setOutput).toHaveBeenCalledWith('files-analyzed', '0')
      expect(core.setOutput).toHaveBeenCalledWith('acrolinx-results', '[]')
    })
  })

  describe('Configuration Validation', () => {
    it('should validate required inputs', async () => {
      // Test with empty required inputs
      core.getInput.mockReturnValue('')

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Required input')
      )
    })

    it('should use environment variables as fallback', async () => {
      core.getInput.mockReturnValue('')
      process.env.ACROLNX_TOKEN = 'env-acrolinx-token'
      process.env.GITHUB_TOKEN = 'env-github-token'

      await run()

      // Should still work with environment variables
      expect(core.setOutput).toHaveBeenCalledWith('event-type', 'push')
      expect(core.setOutput).toHaveBeenCalledWith('files-analyzed', '0')
    })
  })
})
