/**
 * Core type definitions for the GitHub Action
 */

/**
 * Interface for commit information
 */
export interface CommitInfo {
  sha: string
  message: string
  author: string
  date: string
  changes: FileChange[]
}

/**
 * Interface for file changes
 */
export interface FileChange {
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  patch?: string
}

// Import types from Acrolinx SDK first
import type { StyleAnalysisSuccessResp } from '@acrolinx/typescript-sdk'

/**
 * Interface for Acrolinx analysis result
 */
export interface AcrolinxAnalysisResult {
  filePath: string
  result: StyleAnalysisSuccessResp
  timestamp: string
}

/**
 * Interface for event information
 */
export interface EventInfo {
  eventType: string
  description: string
  filesCount: number
  additionalInfo?: Record<string, unknown>
}

/**
 * Interface for file discovery strategy
 */
export interface FileDiscoveryStrategy {
  getFilesToAnalyze(): Promise<string[]>
  getEventInfo(): EventInfo
}

/**
 * Configuration for the action
 */
export interface ActionConfig {
  acrolinxApiToken: string
  dialect: string
  tone: string
  styleGuide: string
  githubToken: string
}

/**
 * Analysis options for Acrolinx
 */
export interface AnalysisOptions {
  dialect: string
  tone: string
  styleGuide: string
}

// Re-export types from Acrolinx SDK
export type { StyleAnalysisReq, Config } from '@acrolinx/typescript-sdk'
