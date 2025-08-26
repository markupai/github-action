/**
 * Unit tests for action configuration functions
 */

import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import type { ActionConfig, AnalysisOptions } from '../src/types/index.js'

// Mock dependencies
jest.unstable_mockModule('@actions/core', () => core)

const {
  getActionConfig,
  getAnalysisOptions,
  validateConfig,
  logConfiguration
} = await import('../src/config/action-config.js')

describe('Action Config', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset environment variables
    delete process.env.MARKUP_AI_TOKEN
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_REPOSITORY
  })

  afterEach(() => {
    delete process.env.MARKUP_AI_TOKEN
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_REPOSITORY
  })

  describe('getAnalysisOptions', () => {
    it('should return analysis options with provided values', () => {
      const config: ActionConfig = {
        dialect: 'british_english',
        tone: 'informal',
        styleGuide: 'chicago',
        apiToken: 'token',
        githubToken: 'github-token',
        addCommitStatus: true
      }

      const options: AnalysisOptions = getAnalysisOptions(config)

      expect(options).toEqual({
        dialect: 'british_english',
        tone: 'informal',
        styleGuide: 'chicago'
      })
    })

    it('should return analysis options as provided in config', () => {
      const config: ActionConfig = {
        dialect: '',
        tone: '',
        styleGuide: '',
        apiToken: 'token',
        githubToken: 'github-token',
        addCommitStatus: true
      }

      const options: AnalysisOptions = getAnalysisOptions(config)

      expect(options).toEqual({
        dialect: '',
        tone: '',
        styleGuide: ''
      })
    })
  })

  describe('validateConfig', () => {
    it('should not throw error for valid config', () => {
      const config: ActionConfig = {
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: 'ap',
        apiToken: 'valid-token',
        githubToken: 'valid-github-token',
        addCommitStatus: true
      }

      expect(() => validateConfig(config)).not.toThrow()
    })

    it('should throw error for missing token', () => {
      const config: ActionConfig = {
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: 'ap',
        apiToken: '',
        githubToken: 'valid-github-token',
        addCommitStatus: true
      }

      expect(() => validateConfig(config)).toThrow('API token is required')
    })

    it('should warn for missing GitHub token', () => {
      const config: ActionConfig = {
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: 'ap',
        apiToken: 'valid-token',
        githubToken: '',
        addCommitStatus: true
      }

      expect(() => validateConfig(config)).not.toThrow()
      expect(core.warning).toHaveBeenCalled()
    })

    it('should throw error for empty dialect', () => {
      const config: ActionConfig = {
        dialect: '',
        tone: 'formal',
        styleGuide: 'ap',
        apiToken: 'valid-token',
        githubToken: 'valid-github-token',
        addCommitStatus: true
      }

      expect(() => validateConfig(config)).toThrow(
        "Analysis option 'dialect' cannot be empty"
      )
    })

    it('should throw error for empty tone', () => {
      const config: ActionConfig = {
        dialect: 'american_english',
        tone: '',
        styleGuide: 'ap',
        apiToken: 'valid-token',
        githubToken: 'valid-github-token',
        addCommitStatus: true
      }

      expect(() => validateConfig(config)).toThrow(
        "Analysis option 'tone' cannot be empty"
      )
    })

    it('should throw error for empty style guide', () => {
      const config: ActionConfig = {
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: '',
        apiToken: 'valid-token',
        githubToken: 'valid-github-token',
        addCommitStatus: true
      }

      expect(() => validateConfig(config)).toThrow(
        "Analysis option 'style_guide' cannot be empty"
      )
    })
  })

  describe('logConfiguration', () => {
    it('should log configuration correctly', () => {
      const config: ActionConfig = {
        dialect: 'british_english',
        tone: 'informal',
        styleGuide: 'chicago',
        apiToken: 'token123',
        githubToken: 'github-token123',
        addCommitStatus: true
      }

      logConfiguration(config)

      expect(core.info).toHaveBeenCalledWith('🔧 Action Configuration:')
      expect(core.info).toHaveBeenCalledWith('  Dialect: british_english')
      expect(core.info).toHaveBeenCalledWith('  Tone: informal')
      expect(core.info).toHaveBeenCalledWith('  Style Guide: chicago')
      expect(core.info).toHaveBeenCalledWith('  API Token: [PROVIDED]')
      expect(core.info).toHaveBeenCalledWith('  GitHub Token: [PROVIDED]')
    })

    it('should log empty values when not provided', () => {
      const config: ActionConfig = {
        dialect: '',
        tone: '',
        styleGuide: '',
        apiToken: 'token123',
        githubToken: 'github-token123',
        addCommitStatus: true
      }

      logConfiguration(config)

      expect(core.info).toHaveBeenCalledWith('  Dialect: ')
      expect(core.info).toHaveBeenCalledWith('  Tone: ')
      expect(core.info).toHaveBeenCalledWith('  Style Guide: ')
    })
  })

  describe('getActionConfig', () => {
    it('should return complete config from inputs', () => {
      core.getInput
        .mockReturnValueOnce('markup_ai_token') // markup_ai_token
        .mockReturnValueOnce('github-token') // github_token
        .mockReturnValueOnce('british_english') // dialect
        .mockReturnValueOnce('informal') // tone
        .mockReturnValueOnce('chicago') // style-guide

      const config: ActionConfig = getActionConfig()

      expect(config).toEqual({
        dialect: 'british_english',
        tone: 'informal',
        styleGuide: 'chicago',
        apiToken: 'markup_ai_token',
        githubToken: 'github-token',
        addCommitStatus: true
      })
    })

    it('should return config with environment variables when inputs are empty', () => {
      core.getInput.mockReturnValue('')
      process.env.MARKUP_AI_TOKEN = 'env-markup-ai-token'
      process.env.GITHUB_TOKEN = 'env-github-token'

      const config: ActionConfig = getActionConfig()

      expect(config).toEqual({
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: 'ap',
        apiToken: 'env-markup-ai-token',
        githubToken: 'env-github-token',
        addCommitStatus: true
      })
    })

    it('should prioritize inputs over environment variables', () => {
      core.getInput
        .mockReturnValueOnce('input-markup-ai-token') // markup_ai_token
        .mockReturnValueOnce('input-github-token') // github_token
        .mockReturnValueOnce('british_english') // dialect
        .mockReturnValueOnce('informal') // tone
        .mockReturnValueOnce('chicago') // style-guide

      process.env.MARKUP_AI_TOKEN = 'env-markup-ai-token'
      process.env.GITHUB_TOKEN = 'env-github-token'

      const config: ActionConfig = getActionConfig()

      expect(config.apiToken).toBe('input-markup-ai-token')
      expect(config.githubToken).toBe('input-github-token')
    })

    it('should use default values for optional inputs', () => {
      core.getInput
        .mockReturnValueOnce('markup-ai-token') // markup_ai_token
        .mockReturnValueOnce('github-token') // github_token
        .mockReturnValueOnce('') // dialect
        .mockReturnValueOnce('') // tone
        .mockReturnValueOnce('') // style-guide

      const config: ActionConfig = getActionConfig()

      expect(config).toEqual({
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: 'ap',
        apiToken: 'markup-ai-token',
        githubToken: 'github-token',
        addCommitStatus: true
      })
    })

    it('should throw error when required tokens are missing', () => {
      core.getInput.mockReturnValue('')

      expect(() => getActionConfig()).toThrow(
        "Required input 'markup_ai_token' or environment variable 'MARKUP_AI_TOKEN' is not provided"
      )
    })
  })
})
