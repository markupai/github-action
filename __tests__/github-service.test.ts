/**
 * Unit tests for GitHub service
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Spy on core methods
const infoSpy = jest.spyOn(core, 'info')
const errorSpy = jest.spyOn(core, 'error')

// Mock @actions/core and @actions/github
jest.unstable_mockModule('@actions/core', () => core)

const mockGetOctokit = jest.fn()
jest.unstable_mockModule('@actions/github', () => ({
  getOctokit: mockGetOctokit,
  context: {
    serverUrl: 'https://github.com',
    runId: '123456789',
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    },
    sha: 'abc123def456'
  }
}))

let githubService: typeof import('../src/services/github-service.js')

beforeAll(async () => {
  githubService = await import('../src/services/github-service.js')
})

// Mock Octokit with proper typing
const mockOctokit = {
  rest: {
    repos: {
      getCommit: jest.fn() as jest.MockedFunction<
        (...args: unknown[]) => Promise<unknown>
      >,
      get: jest.fn() as jest.MockedFunction<
        (...args: unknown[]) => Promise<unknown>
      >,
      createCommitStatus: jest.fn() as jest.MockedFunction<
        (...args: unknown[]) => Promise<unknown>
      >,
      getContent: jest.fn() as jest.MockedFunction<
        (...args: unknown[]) => Promise<unknown>
      >,
      createOrUpdateFileContents: jest.fn() as jest.MockedFunction<
        (...args: unknown[]) => Promise<unknown>
      >
    },
    pulls: {
      listFiles: jest.fn() as jest.MockedFunction<
        (...args: unknown[]) => Promise<unknown>
      >
    },
    git: {
      getTree: jest.fn() as jest.MockedFunction<
        (...args: unknown[]) => Promise<unknown>
      >
    }
  }
}

describe('GitHub Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    infoSpy.mockClear()
    errorSpy.mockClear()
    mockGetOctokit.mockReturnValue(mockOctokit)
  })

  describe('createGitHubClient', () => {
    it('should create GitHub client with token', () => {
      const token = 'test-token'
      const client = githubService.createGitHubClient(token)

      expect(mockGetOctokit).toHaveBeenCalledWith(token)
      expect(client).toBe(mockOctokit)
    })
  })

  describe('getCommitChanges', () => {
    it('should get commit changes successfully', async () => {
      const mockCommitData = {
        sha: 'abc123',
        commit: {
          message: 'Test commit',
          author: {
            name: 'Test Author',
            date: '2024-01-15T10:30:00Z'
          }
        },
        files: [
          {
            filename: 'test.md',
            status: 'modified',
            additions: 5,
            deletions: 2,
            changes: 7,
            patch: '@@ -1,3 +1,6 @@'
          }
        ]
      }

      mockOctokit.rest.repos.getCommit.mockResolvedValue({
        data: mockCommitData
      })

      const result = await githubService.getCommitChanges(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        'abc123'
      )

      expect(result).toEqual({
        sha: 'abc123',
        message: 'Test commit',
        author: 'Test Author',
        date: '2024-01-15T10:30:00Z',
        changes: [
          {
            filename: 'test.md',
            status: 'modified',
            additions: 5,
            deletions: 2,
            changes: 7,
            patch: '@@ -1,3 +1,6 @@'
          }
        ]
      })

      expect(mockOctokit.rest.repos.getCommit).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        ref: 'abc123'
      })
    })

    it('should handle commit without files', async () => {
      const mockCommitData = {
        sha: 'abc123',
        commit: {
          message: 'Test commit',
          author: {
            name: 'Test Author',
            date: '2024-01-15T10:30:00Z'
          }
        },
        files: undefined
      }

      mockOctokit.rest.repos.getCommit.mockResolvedValue({
        data: mockCommitData
      })

      const result = await githubService.getCommitChanges(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        'abc123'
      )

      expect(result?.changes).toEqual([])
    })

    it('should handle commit with missing author info', async () => {
      mockOctokit.rest.repos.getCommit.mockResolvedValue({
        data: {
          sha: 'abc123',
          commit: {
            message: 'Test commit',
            author: undefined
          },
          files: []
        }
      })

      const result = await githubService.getCommitChanges(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        'abc123'
      )

      expect(result?.author).toBe('Unknown')
      // Relax the date check to allow for small differences
      const now = new Date().toISOString().slice(0, 16)
      expect(result?.date.slice(0, 16)).toBe(now)
    })

    it('should handle API errors', async () => {
      mockOctokit.rest.repos.getCommit.mockRejectedValue(new Error('API Error'))

      const result = await githubService.getCommitChanges(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        'abc123'
      )

      expect(result).toBeNull()
      expect(core.error).toHaveBeenCalled()
    })
  })

  describe('getPullRequestFiles', () => {
    it('should get PR files successfully', async () => {
      const mockFiles = [
        { filename: 'file1.md' },
        { filename: 'file2.txt' },
        { filename: 'file3.js' }
      ]

      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: mockFiles
      })

      const result = await githubService.getPullRequestFiles(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        123
      )

      expect(result).toEqual(['file1.md', 'file2.txt', 'file3.js'])
      expect(core.info).toHaveBeenCalledWith(
        '🔍 Fetching files for PR #123 in test-owner/test-repo'
      )
      expect(core.info).toHaveBeenCalledWith('✅ Found 3 files in PR')
    })

    it('should handle API errors', async () => {
      mockOctokit.rest.pulls.listFiles.mockRejectedValue(new Error('API Error'))

      const result = await githubService.getPullRequestFiles(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        123
      )

      expect(result).toEqual([])
      expect(core.error).toHaveBeenCalled()
    })
  })

  describe('getRepositoryFiles', () => {
    it('should get repository files successfully', async () => {
      const mockTree = {
        tree: [
          { type: 'blob', path: 'file1.md' },
          { type: 'tree', path: 'folder' },
          { type: 'blob', path: 'file2.txt' },
          { type: 'blob' } // Missing path
        ]
      }

      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: mockTree
      })

      const result = await githubService.getRepositoryFiles(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        'main'
      )

      expect(result).toEqual(['file1.md', 'file2.txt'])
    })

    it('should handle empty tree', async () => {
      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: { tree: [] }
      })

      const result = await githubService.getRepositoryFiles(
        mockOctokit as any,
        'test-owner',
        'test-repo'
      )

      expect(result).toEqual([])
    })

    it('should handle API errors', async () => {
      mockOctokit.rest.git.getTree.mockRejectedValue(new Error('API Error'))

      const result = await githubService.getRepositoryFiles(
        mockOctokit as any,
        'test-owner',
        'test-repo'
      )

      expect(result).toEqual([])
      expect(core.error).toHaveBeenCalled()
    })
  })

  describe('getRepositoryInfo', () => {
    it('should get repository info successfully', async () => {
      const mockRepoData = {
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        description: 'Test repository',
        language: 'TypeScript'
      }

      mockOctokit.rest.repos.get.mockResolvedValue({
        data: mockRepoData
      })

      const result = await githubService.getRepositoryInfo(
        mockOctokit as any,
        'test-owner',
        'test-repo'
      )

      expect(result).toEqual({
        name: 'test-repo',
        fullName: 'test-owner/test-repo',
        description: 'Test repository',
        language: 'TypeScript'
      })
    })

    it('should handle API errors', async () => {
      mockOctokit.rest.repos.get.mockRejectedValue(new Error('API Error'))

      const result = await githubService.getRepositoryInfo(
        mockOctokit as any,
        'test-owner',
        'test-repo'
      )

      expect(result).toBeNull()
      expect(core.error).toHaveBeenCalled()
    })
  })

  describe('updateCommitStatus', () => {
    it('should update commit status successfully', async () => {
      mockOctokit.rest.repos.createCommitStatus.mockResolvedValue({})

      await githubService.updateCommitStatus(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        'abc123def456',
        85,
        5
      )

      expect(mockOctokit.rest.repos.createCommitStatus).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        sha: 'abc123def456',
        state: 'success',
        description: 'Quality: 85 | Files: 5',
        context: 'Markup AI'
      })

      expect(core.info).toHaveBeenCalledWith(
        '🔍 Creating commit status for test-owner/test-repo@abc123def456'
      )
      expect(core.info).toHaveBeenCalledWith(
        '📊 Status: success, Description: "Quality: 85 | Files: 5"'
      )
      expect(core.info).toHaveBeenCalledWith(
        '🔗 Target URL: https://github.com/test-owner/test-repo/actions/runs/123456789'
      )
      expect(core.info).toHaveBeenCalledWith('📝 Context: Markup AI')
      expect(core.info).toHaveBeenCalledWith(
        '✅ Updated commit status: success - Quality: 85 | Files: 5'
      )
    })

    it('should handle missing parameters', async () => {
      await githubService.updateCommitStatus(
        mockOctokit as any,
        '',
        'test-repo',
        'abc123',
        85,
        5
      )

      expect(core.error).toHaveBeenCalledWith(
        'Invalid parameters for commit status update'
      )
      expect(mockOctokit.rest.repos.createCommitStatus).not.toHaveBeenCalled()
    })

    it('should handle invalid SHA format', async () => {
      await githubService.updateCommitStatus(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        'invalid-sha',
        85,
        5
      )

      expect(core.error).toHaveBeenCalledWith('Invalid SHA format: invalid-sha')
      expect(mockOctokit.rest.repos.createCommitStatus).not.toHaveBeenCalled()
    })

    it('should handle invalid quality score', async () => {
      await githubService.updateCommitStatus(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        'abc123def456',
        150, // Invalid score
        5
      )

      expect(core.error).toHaveBeenCalledWith(
        'Quality score must be between 0 and 100'
      )
      expect(mockOctokit.rest.repos.createCommitStatus).not.toHaveBeenCalled()
    })

    it('should handle API errors', async () => {
      const error = new Error('API Error')
      mockOctokit.rest.repos.createCommitStatus.mockRejectedValue(error)

      await githubService.updateCommitStatus(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        'abc123def456',
        85,
        5
      )

      expect(core.error).toHaveBeenCalledWith(
        'Failed to update commit status: Error: API Error'
      )
      expect(core.error).toHaveBeenCalledWith('Error message: API Error')
    })

    it('should handle different quality scores', async () => {
      mockOctokit.rest.repos.createCommitStatus.mockResolvedValue({})

      // Test different score ranges
      await githubService.updateCommitStatus(
        mockOctokit as any,
        'test-owner',
        'test-repo',
        'abc123def456',
        95, // Excellent
        3
      )

      expect(mockOctokit.rest.repos.createCommitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'success',
          description: 'Quality: 95 | Files: 3'
        })
      )
    })
  })
})
