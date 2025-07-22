/**
 * File discovery strategies for different GitHub event types
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { FileDiscoveryStrategy, EventInfo } from '../types/index.js'
import { GitHubService } from '../services/github-service.js'
import { EVENT_TYPES } from '../constants/index.js'

/**
 * Push Event Strategy - Analyze files modified in the push
 */
export class PushEventStrategy implements FileDiscoveryStrategy {
  private githubService: GitHubService

  constructor(
    private owner: string,
    private repo: string,
    private sha: string
  ) {
    this.githubService = new GitHubService(process.env.GITHUB_TOKEN || '')
  }

  async getFilesToAnalyze(): Promise<string[]> {
    const commit = await this.githubService.getCommitChanges(
      this.owner,
      this.repo,
      this.sha
    )
    if (!commit) {
      return []
    }
    return commit.changes.map((change) => change.filename)
  }

  getEventInfo(): EventInfo {
    return {
      eventType: EVENT_TYPES.PUSH,
      description: 'Files modified in push event',
      filesCount: 0, // Will be updated after file discovery
      additionalInfo: {
        commitSha: this.sha
      }
    }
  }
}

/**
 * Pull Request Event Strategy - Analyze files changed in the PR
 */
export class PullRequestEventStrategy implements FileDiscoveryStrategy {
  private githubService: GitHubService

  constructor(
    private owner: string,
    private repo: string,
    private prNumber: number
  ) {
    this.githubService = new GitHubService(process.env.GITHUB_TOKEN || '')
  }

  async getFilesToAnalyze(): Promise<string[]> {
    return await this.githubService.getPullRequestFiles(
      this.owner,
      this.repo,
      this.prNumber
    )
  }

  getEventInfo(): EventInfo {
    return {
      eventType: EVENT_TYPES.PULL_REQUEST,
      description: 'Files changed in pull request',
      filesCount: 0, // Will be updated after file discovery
      additionalInfo: {
        prNumber: this.prNumber
      }
    }
  }
}

/**
 * Manual Workflow Strategy - Analyze all files in repository
 */
export class ManualWorkflowStrategy implements FileDiscoveryStrategy {
  private githubService: GitHubService

  constructor(
    private owner: string,
    private repo: string,
    private ref: string = 'main'
  ) {
    this.githubService = new GitHubService(process.env.GITHUB_TOKEN || '')
  }

  async getFilesToAnalyze(): Promise<string[]> {
    return await this.githubService.getRepositoryFiles(
      this.owner,
      this.repo,
      this.ref
    )
  }

  getEventInfo(): EventInfo {
    return {
      eventType: EVENT_TYPES.WORKFLOW_DISPATCH,
      description: 'All files in repository (manual trigger)',
      filesCount: 0, // Will be updated after file discovery
      additionalInfo: {
        ref: this.ref
      }
    }
  }
}

/**
 * Factory function to create appropriate strategy based on event type
 */
export function createFileDiscoveryStrategy(
  context: typeof github.context
): FileDiscoveryStrategy {
  const { eventName } = context

  switch (eventName) {
    case EVENT_TYPES.PUSH:
      return new PushEventStrategy(
        context.repo.owner,
        context.repo.repo,
        context.sha
      )

    case EVENT_TYPES.PULL_REQUEST:
      return new PullRequestEventStrategy(
        context.repo.owner,
        context.repo.repo,
        context.issue.number
      )

    case EVENT_TYPES.WORKFLOW_DISPATCH:
      return new ManualWorkflowStrategy(context.repo.owner, context.repo.repo)

    default:
      // For other events, default to push strategy
      core.warning(`Unsupported event type: ${eventName}. Using push strategy.`)
      return new PushEventStrategy(
        context.repo.owner,
        context.repo.repo,
        context.sha
      )
  }
}
