/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => ({
  getOctokit: jest.fn(() => ({
    rest: {
      repos: {
        listCommits: jest.fn().mockResolvedValue({
          data: [
            {
              sha: 'abc123456789',
              commit: {
                message: 'test commit',
                author: {
                  name: 'Test User',
                  date: '2024-01-15T10:30:00Z'
                }
              }
            }
          ]
        }),
        getCommit: jest.fn().mockResolvedValue({
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
              }
            ]
          }
        })
      }
    }
  })),
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    },
    ref: 'refs/heads/main'
  }
}))

// Mock the Acrolinx SDK
jest.unstable_mockModule('@acrolinx/typescript-sdk', () => ({
  styleCheck: jest.fn().mockResolvedValue({
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
  }),
  Config: jest.fn()
}))

// Mock fs/promises
jest.unstable_mockModule('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('Test content for Acrolinx analysis')
}))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    // Set the action's inputs as return values from core.getInput().
    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'acrolinx-api-token':
          return 'test-acrolinx-token'
        case 'dialect':
          return 'american_english'
        case 'tone':
          return 'formal'
        case 'style-guide':
          return 'ap'
        case 'commit-limit':
          return '3'
        case 'github-token':
          return 'test-token'
        default:
          return ''
      }
    })

    // Mock process.env.GITHUB_TOKEN
    process.env.GITHUB_TOKEN = 'test-token'
  })

  afterEach(() => {
    jest.resetAllMocks()
    delete process.env.GITHUB_TOKEN
  })

  it('Sets the commits-analyzed output', async () => {
    await run()

    // Verify the commits-analyzed output was set.
    expect(core.setOutput).toHaveBeenCalledWith(
      'commits-analyzed',
      '1'
    )
  })

  it('Fails when Acrolinx API token is missing', async () => {
    // Clear the getInput mock and return empty for acrolinx-api-token
    core.getInput.mockClear().mockImplementation((name: string) => {
      switch (name) {
        case 'acrolinx-api-token':
          return ''
        case 'dialect':
          return 'american_english'
        case 'tone':
          return 'formal'
        case 'style-guide':
          return 'ap'
        case 'commit-limit':
          return '3'
        case 'github-token':
          return 'test-token'
        default:
          return ''
      }
    })

    await run()

    // Verify that the action was marked as failed.
    expect(core.setFailed).toHaveBeenCalledWith('Acrolinx API token is required')
  })
})
