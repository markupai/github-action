/**
 * GitHub service for handling API operations
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { CommitInfo, FileChange } from '../types/index.js'

/**
 * Service class for GitHub operations
 */
export class GitHubService {
  private octokit: ReturnType<typeof github.getOctokit>

  constructor(token: string) {
    this.octokit = github.getOctokit(token)
  }

  /**
   * Get commit changes from GitHub API with retry logic
   */
  async getCommitChanges(
    owner: string,
    repo: string,
    sha: string,
    maxRetries: number = 3
  ): Promise<CommitInfo | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: sha
        })

        const commit = response.data
        const changes: FileChange[] =
          commit.files?.map(
            (file: {
              filename: string
              status: string
              additions?: number
              deletions?: number
              changes?: number
              patch?: string
            }) => ({
              filename: file.filename,
              status: file.status,
              additions: file.additions || 0,
              deletions: file.deletions || 0,
              changes: file.changes || 0,
              patch: file.patch
            })
          ) || []

        return {
          sha: commit.sha,
          message: commit.commit.message,
          author: commit.commit.author?.name || 'Unknown',
          date: commit.commit.author?.date || new Date().toISOString(),
          changes
        }
      } catch (error) {
        if (attempt === maxRetries) {
          core.error(
            `Failed to get commit changes after ${maxRetries} attempts: ${error}`
          )
          return null
        }
        core.warning(`Attempt ${attempt} failed, retrying... Error: ${error}`)
        await this.delay(1000 * attempt) // Exponential backoff
      }
    }
    return null
  }

  /**
   * Get files changed in a pull request
   */
  async getPullRequestFiles(
    owner: string,
    repo: string,
    prNumber: number,
    maxRetries: number = 3
  ): Promise<string[]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        core.info(`🔍 Fetching files for PR #${prNumber} in ${owner}/${repo}`)

        const response = await this.octokit.rest.pulls.listFiles({
          owner,
          repo,
          pull_number: prNumber
        })

        core.info(`✅ Found ${response.data.length} files in PR`)
        return response.data.map((file) => file.filename)
      } catch (error) {
        if (attempt === maxRetries) {
          core.error(
            `Failed to get PR files after ${maxRetries} attempts: ${error}`
          )
          core.error(`PR Details: #${prNumber} in ${owner}/${repo}`)
          core.error(`Error details: ${JSON.stringify(error, null, 2)}`)
          return []
        }
        core.warning(`Attempt ${attempt} failed, retrying... Error: ${error}`)
        await this.delay(1000 * attempt) // Exponential backoff
      }
    }
    return []
  }

  /**
   * Get all files in repository tree
   */
  async getRepositoryFiles(
    owner: string,
    repo: string,
    ref: string = 'main',
    maxRetries: number = 3
  ): Promise<string[]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.octokit.rest.git.getTree({
          owner,
          repo,
          tree_sha: ref,
          recursive: 'true'
        })

        const files: string[] = []
        if (response.data.tree) {
          for (const item of response.data.tree) {
            if (item.type === 'blob' && item.path) {
              files.push(item.path)
            }
          }
        }

        return files
      } catch (error) {
        if (attempt === maxRetries) {
          core.error(
            `Failed to get repository files after ${maxRetries} attempts: ${error}`
          )
          return []
        }
        core.warning(`Attempt ${attempt} failed, retrying... Error: ${error}`)
        await this.delay(1000 * attempt) // Exponential backoff
      }
    }
    return []
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(
    owner: string,
    repo: string
  ): Promise<{
    name: string
    fullName: string
    description: string | null
    language: string | null
  } | null> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo
      })

      return {
        name: response.data.name,
        fullName: response.data.full_name,
        description: response.data.description,
        language: response.data.language
      }
    } catch (error) {
      core.error(`Failed to get repository info: ${error}`)
      return null
    }
  }

  /**
   * Utility function for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
