/**
 * Unit tests for action configuration functions
 */

import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

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
    delete process.env.ACROLINX_API_TOKEN
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_REPOSITORY
  })

  afterEach(() => {
    delete process.env.ACROLINX_API_TOKEN
    delete process.env.GITHUB_TOKEN
    delete process.env.GITHUB_REPOSITORY
  })

  describe('getAnalysisOptions', () => {
    it('should return analysis options with provided values', () => {
      const config = {
        dialect: 'british_english',
        tone: 'informal',
        styleGuide: 'chicago',
        acrolinxApiToken: 'token',
        githubToken: 'github-token'
      }

      const options = getAnalysisOptions(config)

      expect(options).toEqual({
        dialect: 'british_english',
        tone: 'informal',
        styleGuide: 'chicago'
      })
    })

    it('should return analysis options as provided in config', () => {
      const config = {
        dialect: '',
        tone: '',
        styleGuide: '',
        acrolinxApiToken: 'token',
        githubToken: 'github-token'
      }

      const options = getAnalysisOptions(config)

      expect(options).toEqual({
        dialect: '',
        tone: '',
        styleGuide: ''
      })
    })
  })

  describe('validateConfig', () => {
    it('should not throw error for valid config', () => {
      const config = {
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: 'ap',
        acrolinxApiToken: 'valid-token',
        githubToken: 'valid-github-token'
      }

      expect(() => validateConfig(config)).not.toThrow()
    })

    it('should throw error for missing Acrolinx token', () => {
      const config = {
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: 'ap',
        acrolinxApiToken: '',
        githubToken: 'valid-github-token'
      }

      expect(() => validateConfig(config)).toThrow(
        'Acrolinx API token is required'
      )
    })

    it('should warn for missing GitHub token', () => {
      const config = {
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: 'ap',
        acrolinxApiToken: 'valid-token',
        githubToken: ''
      }

      expect(() => validateConfig(config)).not.toThrow()
      expect(core.warning).toHaveBeenCalled()
    })

    it('should throw error for empty dialect', () => {
      const config = {
        dialect: '',
        tone: 'formal',
        styleGuide: 'ap',
        acrolinxApiToken: 'valid-token',
        githubToken: 'valid-github-token'
      }

      expect(() => validateConfig(config)).toThrow(
        "Analysis option 'dialect' cannot be empty"
      )
    })

    it('should throw error for empty tone', () => {
      const config = {
        dialect: 'american_english',
        tone: '',
        styleGuide: 'ap',
        acrolinxApiToken: 'valid-token',
        githubToken: 'valid-github-token'
      }

      expect(() => validateConfig(config)).toThrow(
        "Analysis option 'tone' cannot be empty"
      )
    })

    it('should throw error for empty style guide', () => {
      const config = {
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: '',
        acrolinxApiToken: 'valid-token',
        githubToken: 'valid-github-token'
      }

      expect(() => validateConfig(config)).toThrow(
        "Analysis option 'style_guide' cannot be empty"
      )
    })
  })

  describe('logConfiguration', () => {
    it('should log configuration correctly', () => {
      const config = {
        dialect: 'british_english',
        tone: 'informal',
        styleGuide: 'chicago',
        acrolinxApiToken: 'token123',
        githubToken: 'github-token123'
      }

      logConfiguration(config)

      expect(core.info).toHaveBeenCalledWith('🔧 Action Configuration:')
      expect(core.info).toHaveBeenCalledWith('  Dialect: british_english')
      expect(core.info).toHaveBeenCalledWith('  Tone: informal')
      expect(core.info).toHaveBeenCalledWith('  Style Guide: chicago')
      expect(core.info).toHaveBeenCalledWith('  Acrolinx Token: [PROVIDED]')
      expect(core.info).toHaveBeenCalledWith('  GitHub Token: [PROVIDED]')
    })

    it('should log empty values when not provided', () => {
      const config = {
        dialect: '',
        tone: '',
        styleGuide: '',
        acrolinxApiToken: 'token123',
        githubToken: 'github-token123'
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
        .mockReturnValueOnce('acrolinx-token') // acrolinx_token
        .mockReturnValueOnce('github-token') // github_token
        .mockReturnValueOnce('british_english') // dialect
        .mockReturnValueOnce('informal') // tone
        .mockReturnValueOnce('chicago') // style-guide

      const config = getActionConfig()

      expect(config).toEqual({
        dialect: 'british_english',
        tone: 'informal',
        styleGuide: 'chicago',
        acrolinxApiToken: 'acrolinx-token',
        githubToken: 'github-token'
      })
    })

    it('should return config with environment variables when inputs are empty', () => {
      core.getInput.mockReturnValue('')
      process.env.ACROLNX_TOKEN = 'env-acrolinx-token'
      process.env.GITHUB_TOKEN = 'env-github-token'

      const config = getActionConfig()

      expect(config).toEqual({
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: 'ap',
        acrolinxApiToken: 'env-acrolinx-token',
        githubToken: 'env-github-token'
      })
    })

    it('should prioritize inputs over environment variables', () => {
      core.getInput
        .mockReturnValueOnce('input-acrolinx-token') // acrolinx_token
        .mockReturnValueOnce('input-github-token') // github_token
        .mockReturnValueOnce('british_english') // dialect
        .mockReturnValueOnce('informal') // tone
        .mockReturnValueOnce('chicago') // style-guide

      process.env.ACROLNX_TOKEN = 'env-acrolinx-token'
      process.env.GITHUB_TOKEN = 'env-github-token'

      const config = getActionConfig()

      expect(config.acrolinxApiToken).toBe('input-acrolinx-token')
      expect(config.githubToken).toBe('input-github-token')
    })

    it('should use default values for optional inputs', () => {
      core.getInput
        .mockReturnValueOnce('acrolinx-token') // acrolinx_token
        .mockReturnValueOnce('github-token') // github_token
        .mockReturnValueOnce('') // dialect
        .mockReturnValueOnce('') // tone
        .mockReturnValueOnce('') // style-guide

      const config = getActionConfig()

      expect(config).toEqual({
        dialect: 'american_english',
        tone: 'formal',
        styleGuide: 'ap',
        acrolinxApiToken: 'acrolinx-token',
        githubToken: 'github-token'
      })
    })

    it('should throw error when required tokens are missing', () => {
      core.getInput.mockReturnValue('')

      expect(() => getActionConfig()).toThrow(
        "Required input 'github_token' or environment variable 'GITHUB_TOKEN' is not provided"
      )
    })
  })
})
