/**
 * Tests for Acrolinx service batch functionality
 */

import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock @actions/core
jest.unstable_mockModule('@actions/core', () => core)

// Mock the Acrolinx SDK
jest.unstable_mockModule('@acrolinx/nextgen-toolkit', () => ({
  styleCheck: jest.fn(),
  styleBatchCheckRequests: jest.fn(),
  Config: jest.fn()
}))

// Import the module after mocking
const { analyzeFiles, analyzeFilesBatch } = await import(
  '../src/services/acrolinx-service.js'
)
import type { AnalysisOptions } from '../src/types/index.js'

describe('Acrolinx Service Batch Functionality', () => {
  let mockConfig: { apiKey: string; platform: { type: string; value: string } }
  let mockOptions: AnalysisOptions
  let mockReadFileContent: (filePath: string) => Promise<string | null>

  beforeEach(() => {
    jest.clearAllMocks()

    mockConfig = {
      apiKey: 'test-api-key',
      platform: { type: 'url', value: 'https://test.acrolinx.com' }
    }

    mockOptions = {
      dialect: 'en-US',
      tone: 'formal',
      styleGuide: 'microsoft'
    }

    mockReadFileContent = jest.fn().mockImplementation((filePath: string) => {
      return Promise.resolve(`Test content for ${filePath}`)
    })
  })

  describe('analyzeFilesBatch', () => {
    it('should return empty array for empty files list', async () => {
      const result = await analyzeFilesBatch(
        [],
        mockOptions,
        mockConfig,
        mockReadFileContent
      )

      expect(result).toEqual([])
    })

    it('should handle files with no valid content', async () => {
      const mockReadFileContentEmpty = jest.fn().mockResolvedValue(null)

      const result = await analyzeFilesBatch(
        ['file1.txt', 'file2.txt'],
        mockOptions,
        mockConfig,
        mockReadFileContentEmpty
      )

      expect(result).toEqual([])
    })

    it('should process multiple files using batch API', async () => {
      const { styleBatchCheckRequests } = await import(
        '@acrolinx/nextgen-toolkit'
      )
      const mockBatchResponse = {
        progress: {
          total: 2,
          completed: 2,
          failed: 0,
          inProgress: 0,
          pending: 0,
          results: [
            {
              index: 0,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 85 },
                  clarity: { score: 90 },
                  tone: { score: 88 }
                }
              }
            },
            {
              index: 1,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 92 },
                  clarity: { score: 87 },
                  tone: { score: 91 }
                }
              }
            }
          ],
          startTime: Date.now()
        },
        promise: Promise.resolve({
          total: 2,
          completed: 2,
          failed: 0,
          inProgress: 0,
          pending: 0,
          results: [
            {
              index: 0,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 85 },
                  clarity: { score: 90 },
                  tone: { score: 88 }
                }
              }
            },
            {
              index: 1,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 92 },
                  clarity: { score: 87 },
                  tone: { score: 91 }
                }
              }
            }
          ],
          startTime: Date.now()
        }),
        cancel: jest.fn()
      }

      jest.mocked(styleBatchCheckRequests).mockReturnValue(mockBatchResponse)

      const result = await analyzeFilesBatch(
        ['file1.txt', 'file2.txt'],
        mockOptions,
        mockConfig,
        mockReadFileContent
      )

      expect(styleBatchCheckRequests).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: 'Test content for file1.txt',
            dialect: 'en-US',
            tone: 'formal',
            style_guide: 'microsoft',
            documentName: 'file1.txt'
          }),
          expect.objectContaining({
            content: 'Test content for file2.txt',
            dialect: 'en-US',
            tone: 'formal',
            style_guide: 'microsoft',
            documentName: 'file2.txt'
          })
        ]),
        mockConfig,
        expect.objectContaining({
          maxConcurrent: 100,
          retryAttempts: 2,
          retryDelay: 1000,
          timeout: 300000
        })
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        filePath: 'file1.txt',
        result: {
          quality: { score: 85 },
          clarity: { score: 90 },
          tone: { score: 88 }
        },
        timestamp: expect.any(String)
      })
      expect(result[1]).toEqual({
        filePath: 'file2.txt',
        result: {
          quality: { score: 92 },
          clarity: { score: 87 },
          tone: { score: 91 }
        },
        timestamp: expect.any(String)
      })
    })

    it('should handle failed batch requests', async () => {
      const { styleBatchCheckRequests } = await import(
        '@acrolinx/nextgen-toolkit'
      )
      const mockBatchResponse = {
        progress: {
          total: 2,
          completed: 1,
          failed: 1,
          inProgress: 0,
          pending: 0,
          results: [
            {
              index: 0,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 85 },
                  clarity: { score: 90 },
                  tone: { score: 88 }
                }
              }
            },
            {
              index: 1,
              status: 'failed',
              error: new Error('API Error')
            }
          ],
          startTime: Date.now()
        },
        promise: Promise.resolve({
          total: 2,
          completed: 1,
          failed: 1,
          inProgress: 0,
          pending: 0,
          results: [
            {
              index: 0,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 85 },
                  clarity: { score: 90 },
                  tone: { score: 88 }
                }
              }
            },
            {
              index: 1,
              status: 'failed',
              error: new Error('API Error')
            }
          ],
          startTime: Date.now()
        }),
        cancel: jest.fn()
      }

      jest.mocked(styleBatchCheckRequests).mockReturnValue(mockBatchResponse)

      const result = await analyzeFilesBatch(
        ['file1.txt', 'file2.txt'],
        mockOptions,
        mockConfig,
        mockReadFileContent
      )

      expect(result).toHaveLength(1)
      expect(result[0].filePath).toBe('file1.txt')
    })

    it('should handle batch processing errors', async () => {
      const { styleBatchCheckRequests } = await import(
        '@acrolinx/nextgen-toolkit'
      )
      jest.mocked(styleBatchCheckRequests).mockImplementation(() => {
        throw new Error('Batch processing failed')
      })

      const result = await analyzeFilesBatch(
        ['file1.txt', 'file2.txt'],
        mockOptions,
        mockConfig,
        mockReadFileContent
      )

      expect(result).toEqual([])
    })
  })

  describe('analyzeFiles with batch processing', () => {
    it('should use sequential processing for small batches (≤3 files)', async () => {
      const { styleCheck } = await import('@acrolinx/nextgen-toolkit')
      jest.mocked(styleCheck).mockResolvedValue({
        scores: {
          quality: { score: 85 },
          clarity: { score: 90 },
          tone: { score: 88 }
        }
      })

      const result = await analyzeFiles(
        ['file1.txt', 'file2.txt'],
        mockOptions,
        mockConfig,
        mockReadFileContent
      )

      expect(styleCheck).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
    })

    it('should use batch processing for larger batches (>3 files)', async () => {
      const { styleBatchCheckRequests } = await import(
        '@acrolinx/nextgen-toolkit'
      )
      const mockBatchResponse = {
        progress: {
          total: 4,
          completed: 4,
          failed: 0,
          inProgress: 0,
          pending: 0,
          results: [
            {
              index: 0,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 85 },
                  clarity: { score: 90 },
                  tone: { score: 88 }
                }
              }
            },
            {
              index: 1,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 92 },
                  clarity: { score: 87 },
                  tone: { score: 91 }
                }
              }
            },
            {
              index: 2,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 89 },
                  clarity: { score: 93 },
                  tone: { score: 86 }
                }
              }
            },
            {
              index: 3,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 94 },
                  clarity: { score: 88 },
                  tone: { score: 92 }
                }
              }
            }
          ],
          startTime: Date.now()
        },
        promise: Promise.resolve({
          total: 4,
          completed: 4,
          failed: 0,
          inProgress: 0,
          pending: 0,
          results: [
            {
              index: 0,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 85 },
                  clarity: { score: 90 },
                  tone: { score: 88 }
                }
              }
            },
            {
              index: 1,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 92 },
                  clarity: { score: 87 },
                  tone: { score: 91 }
                }
              }
            },
            {
              index: 2,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 89 },
                  clarity: { score: 93 },
                  tone: { score: 86 }
                }
              }
            },
            {
              index: 3,
              status: 'completed',
              result: {
                scores: {
                  quality: { score: 94 },
                  clarity: { score: 88 },
                  tone: { score: 92 }
                }
              }
            }
          ],
          startTime: Date.now()
        }),
        cancel: jest.fn()
      }

      jest.mocked(styleBatchCheckRequests).mockReturnValue(mockBatchResponse)

      const result = await analyzeFiles(
        ['file1.txt', 'file2.txt', 'file3.txt', 'file4.txt'],
        mockOptions,
        mockConfig,
        mockReadFileContent
      )

      expect(styleBatchCheckRequests).toHaveBeenCalledTimes(1)
      expect(result).toHaveLength(4)
    })
  })
})
