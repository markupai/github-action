/**
 * Unit tests for PR Comment Service
 */

import { jest } from '@jest/globals'

// Mock @actions/core
jest.unstable_mockModule('@actions/core', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warning: jest.fn()
}))

// Mock @actions/github
const mockGetOctokit = jest.fn()
jest.unstable_mockModule('@actions/github', () => ({
  getOctokit: mockGetOctokit,
  context: {
    eventName: 'pull_request',
    issue: {
      number: 123
    },
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    }
  }
}))

// Import the mocked modules
import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  createOrUpdatePRComment,
  isPullRequestEvent,
  getPRNumber,
  PRCommentData
} from '../src/services/pr-comment-service.js'

// Mock Octokit
const mockOctokit = {
  rest: {
    repos: {
      get: jest.fn()
    },
    issues: {
      listComments: jest.fn(),
      createComment: jest.fn(),
      updateComment: jest.fn()
    }
  }
}

describe('PR Comment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetOctokit.mockReturnValue(mockOctokit)
  })

  describe('isPullRequestEvent', () => {
    it('should return true for pull_request event', () => {
      ;(github.context as any).eventName = 'pull_request'
      expect(isPullRequestEvent()).toBe(true)
    })

    it('should return false for push event', () => {
      ;(github.context as any).eventName = 'push'
      expect(isPullRequestEvent()).toBe(false)
    })
  })

  describe('getPRNumber', () => {
    it('should return null for non-pull_request event', () => {
      ;(github.context as any).eventName = 'push'
      expect(getPRNumber()).toBe(null)
    })
  })

  describe('createOrUpdatePRComment', () => {
    const mockResults = [
      {
        filePath: 'test.md',
        result: {
          quality: { score: 85 },
          clarity: { score: 78 },
          grammar: { score: 90, issues: 2 },
          style_guide: { score: 88, issues: 1 },
          tone: { score: 82 },
          terminology: { score: 95, issues: 0 }
        },
        timestamp: '2024-01-15T10:30:00Z'
      }
    ]

    const commentData: PRCommentData = {
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 123,
      results: mockResults
    }

    it('should create new comment when no existing comment found', async () => {
      // Mock successful repository access
      mockOctokit.rest.repos.get.mockResolvedValue({ data: {} })

      // Mock no existing comments
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: []
      })

      // Mock successful comment creation
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 456 }
      })

      await createOrUpdatePRComment(mockOctokit as any, commentData)

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        body: expect.stringContaining('## 🔍 Acrolinx Analysis Results')
      })
    })

    it('should update existing comment when found', async () => {
      // Mock successful repository access
      mockOctokit.rest.repos.get.mockResolvedValue({ data: {} })

      // Mock existing Acrolinx comment
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [
          {
            id: 789,
            body: '## 🔍 Acrolinx Analysis Results\nSome old content'
          }
        ]
      })

      // Mock successful comment update
      mockOctokit.rest.issues.updateComment.mockResolvedValue({
        data: { id: 789 }
      })

      await createOrUpdatePRComment(mockOctokit as any, commentData)

      expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        comment_id: 789,
        body: expect.stringContaining('## 🔍 Acrolinx Analysis Results')
      })
    })

    it('should handle permission denied error for repository access', async () => {
      const permissionError = new Error('Permission denied')
      ;(permissionError as any).status = 403
      mockOctokit.rest.repos.get.mockRejectedValue(permissionError)

      await createOrUpdatePRComment(mockOctokit as any, commentData)

      expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled()
      expect(mockOctokit.rest.issues.updateComment).not.toHaveBeenCalled()
    })

    it('should handle permission denied error for comment creation', async () => {
      // Mock successful repository access
      mockOctokit.rest.repos.get.mockResolvedValue({ data: {} })

      // Mock no existing comments
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: []
      })

      // Mock permission denied for comment creation
      const permissionError = new Error('Permission denied')
      ;(permissionError as any).status = 403
      mockOctokit.rest.issues.createComment.mockRejectedValue(permissionError)

      await createOrUpdatePRComment(mockOctokit as any, commentData)

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled()
    })

    it('should handle pull request not found error', async () => {
      // Mock successful repository access
      mockOctokit.rest.repos.get.mockResolvedValue({ data: {} })

      // Mock no existing comments
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: []
      })

      // Mock PR not found error
      const notFoundError = new Error('Not found')
      ;(notFoundError as any).status = 404
      mockOctokit.rest.issues.createComment.mockRejectedValue(notFoundError)

      await createOrUpdatePRComment(mockOctokit as any, commentData)

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled()
    })

    it('should handle generic error', async () => {
      // Mock successful repository access
      mockOctokit.rest.repos.get.mockResolvedValue({ data: {} })

      // Mock no existing comments
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: []
      })

      // Mock generic error
      const genericError = new Error('Something went wrong')
      ;(genericError as any).status = 500
      mockOctokit.rest.issues.createComment.mockRejectedValue(genericError)

      await createOrUpdatePRComment(mockOctokit as any, commentData)

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled()
    })

    it('should handle error when finding existing comments', async () => {
      // Mock successful repository access
      mockOctokit.rest.repos.get.mockResolvedValue({ data: {} })

      // Mock error when listing comments
      mockOctokit.rest.issues.listComments.mockRejectedValue(
        new Error('Failed to list comments')
      )

      // Mock successful comment creation
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 456 }
      })

      await createOrUpdatePRComment(mockOctokit as any, commentData)

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled()
    })
  })

  describe('Comment content generation', () => {
    it('should generate proper markdown table with emojis', async () => {
      const mockResults = [
        {
          filePath: 'test.md',
          result: {
            quality: { score: 85 },
            clarity: { score: 78 },
            grammar: { score: 90, issues: 2 },
            style_guide: { score: 88, issues: 1 },
            tone: { score: 82 },
            terminology: { score: 95, issues: 0 }
          },
          timestamp: '2024-01-15T10:30:00Z'
        }
      ]

      const commentData: PRCommentData = {
        owner: 'test-owner',
        repo: 'test-repo',
        prNumber: 123,
        results: mockResults
      }

      // Mock successful repository access
      mockOctokit.rest.repos.get.mockResolvedValue({ data: {} })

      // Mock no existing comments
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: []
      })

      // Mock successful comment creation
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 456 }
      })

      await createOrUpdatePRComment(mockOctokit as any, commentData)

      const createCall = mockOctokit.rest.issues.createComment.mock.calls[0][0]
      expect(createCall.body).toContain('## 🔍 Acrolinx Analysis Results')
      expect(createCall.body).toContain(
        '| File | Quality | Clarity | Grammar | Style Guide | Tone | Terminology |'
      )
      expect(createCall.body).toContain('🟢 85') // Green emoji for score 85
      expect(createCall.body).toContain('## 📊 Summary')
      expect(createCall.body).toContain(
        'Quality Score Legend: 🟢 80+ | 🟡 60-79 | 🔴 0-59'
      )
    })

    it('should handle empty results', async () => {
      const commentData: PRCommentData = {
        owner: 'test-owner',
        repo: 'test-repo',
        prNumber: 123,
        results: []
      }

      // Mock successful repository access
      mockOctokit.rest.repos.get.mockResolvedValue({ data: {} })

      // Mock no existing comments
      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: []
      })

      // Mock successful comment creation
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 456 }
      })

      await createOrUpdatePRComment(mockOctokit as any, commentData)

      const createCall = mockOctokit.rest.issues.createComment.mock.calls[0][0]
      expect(createCall.body).toContain('No files were analyzed.')
    })
  })
})
