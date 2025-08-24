const BaseWorkflow = require('./BaseWorkflow');
const logger = require('../utils/logger');

class CodeReviewWorkflow extends BaseWorkflow {
  constructor(agentCore) {
    super(agentCore);
    this.name = 'code-review';
  }

  getRequiredCapabilities() {
    return ['code', 'reasoning'];
  }

  async execute(context, model) {
    logger.info(`Executing code review workflow for PR #${context.pullNumber}`);
    
    try {
      // Extract files changed in the PR
      const files = await this.executeStep('extractChangedFiles', context, model);
      
      // Analyze code for each file
      const analysisResults = await this.executeStep('analyzeFiles', {...context, files}, model);
      
      // Generate PR review comments
      const reviewComments = await this.executeStep('generateReviewComments', {...context, files, analysisResults}, model);
      
      // Post comments to PR
      await this.executeStep('postComments', {...context, reviewComments}, model);
      
      return {
        success: true,
        filesAnalyzed: files.length,
        commentsPosted: reviewComments.length
      };
    } catch (error) {
      logger.error(`Code review workflow failed`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async extractChangedFiles(context, _) {
    const { owner, repo, pullNumber } = context;
    
    try {
      const { data: files } = await this.agentCore.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber
      });
      
      // Filter to only include source code files
      const sourceCodeFiles = files.filter(file => {
        // Exclude binary files, images, etc.
        const nonSourceExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.ttf', '.eot'];
        return !nonSourceExtensions.some(ext => file.filename.endsWith(ext));
      });
      
      // For each file, get its content
      const filesWithContent = await Promise.all(sourceCodeFiles.map(async file => {
        try {
          // Get file content from GitHub
          const { data } = await this.agentCore.octokit.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref: context.head // Get content from the PR head branch
          });
          
          let content = '';
          if (data.content) {
            content = Buffer.from(data.content, 'base64').toString('utf8');
          }
          
          return {
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            content
          };
        } catch (error) {
          logger.warn(`Failed to get content for ${file.filename}`, error);
          return {
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            content: `Failed to retrieve content: ${error.message}`
          };
        }
      }));
      
      logger.info(`Extracted ${filesWithContent.length} changed files from PR #${pullNumber}`);
      return filesWithContent;
    } catch (error) {
      logger.error(`Failed to extract changed files from PR #${pullNumber}`, error);
      throw new Error(`Failed to extract changed files: ${error.message}`);
    }
  }

  async analyzeFiles(context, model) {
    const { files } = context;
    const analysisResults = [];
    
    for (const file of files) {
      try {
        logger.info(`Analyzing file: ${file.filename}`);
        
        // Skip very large files
        if (file.content.length > model.contextWindow / 2) {
          logger.warn(`File ${file.filename} is too large for analysis, skipping`);
          analysisResults.push({
            filename: file.filename,
            status: 'skipped',
            message: 'File is too large for analysis'
          });
          continue;
        }
        
        // Prepare prompt for code analysis
        const fileExt = file.filename.split('.').pop().toLowerCase();
        const messages = [
          {
            role: 'system',
            content: `You are a code review assistant. Analyze the following ${fileExt} file for:
1. Code quality issues
2. Potential bugs
3. Performance concerns
4. Security vulnerabilities
5. Style inconsistencies
6. Best practice violations

Provide specific, actionable feedback with line numbers. Focus on substantive issues, not trivial matters.
Format your response as JSON with the following structure:
{
  "issues": [
    {
      "type": "bug|security|performance|style|best-practice",
      "line": 42,
      "message": "Description of the issue",
      "severity": "high|medium|low",
      "suggestion": "Suggested fix"
    }
  ],
  "overall": "Brief overall assessment"
}
`
          },
          {
            role: 'user',
            content: `File: ${file.filename}
Status: ${file.status}
Additions: ${file.additions}
Deletions: ${file.deletions}

\`\`\`${fileExt}
${file.content}
\`\`\``
          }
        ];
        
        // Generate analysis
        const response = await model.generate(messages);
        
        try {
          // Parse the JSON response
          const analysis = JSON.parse(response.content);
          analysisResults.push({
            filename: file.filename,
            status: 'analyzed',
            issues: analysis.issues || [],
            overall: analysis.overall || 'No overall assessment provided'
          });
        } catch (parseError) {
          logger.warn(`Failed to parse analysis response for ${file.filename}`, parseError);
          
          // Try to extract issues using regex as a fallback
          const issuesRegex = /issue.*?:.*?line.*?(\d+).*?:(.*?)(?=issue|\n\n|$)/gsi;
          const issues = [];
          let match;
          
          while ((match = issuesRegex.exec(response.content)) !== null) {
            issues.push({
              type: 'unknown',
              line: parseInt(match[1], 10),
              message: match[2].trim(),
              severity: 'medium',
              suggestion: 'No suggestion provided'
            });
          }
          
          analysisResults.push({
            filename: file.filename,
            status: 'partial',
            issues,
            overall: 'Analysis could not be fully parsed'
          });
        }
      } catch (error) {
        logger.error(`Failed to analyze file ${file.filename}`, error);
        analysisResults.push({
          filename: file.filename,
          status: 'error',
          message: `Analysis failed: ${error.message}`
        });
      }
    }
    
    logger.info(`Analyzed ${analysisResults.length} files`);
    return analysisResults;
  }

  async generateReviewComments(context, model) {
    const { analysisResults } = context;
    const reviewComments = [];
    
    for (const analysis of analysisResults) {
      if (analysis.status === 'analyzed' || analysis.status === 'partial') {
        for (const issue of analysis.issues) {
          reviewComments.push({
            path: analysis.filename,
            line: issue.line,
            body: `**${issue.type?.toUpperCase() || 'ISSUE'} (${issue.severity || 'medium'})**

${issue.message}

${issue.suggestion ? `**Suggestion**: ${issue.suggestion}` : ''}`
          });
        }
      }
    }
    
    // Generate an overall review comment
    const messages = [
      {
        role: 'system',
        content: `You are a helpful code review assistant. Generate a concise, constructive summary of the overall code review findings.`
      },
      {
        role: 'user',
        content: `Here are the analysis results from a code review:
${JSON.stringify(analysisResults, null, 2)}

Provide a brief, constructive summary of the findings. Focus on patterns across files and major issues.
Be specific but concise. Avoid being overly critical or praising. Start with positive aspects, then areas for improvement.`
      }
    ];
    
    const response = await model.generate(messages);
    
    reviewComments.push({
      body: response.content
    });
    
    logger.info(`Generated ${reviewComments.length} review comments`);
    return reviewComments;
  }

  async postComments(context, _) {
    const { owner, repo, pullNumber, reviewComments } = context;
    
    try {
      // Post a review with all comments
      await this.agentCore.octokit.pulls.createReview({
        owner,
        repo,
        pull_number: pullNumber,
        event: 'COMMENT',
        comments: reviewComments.filter(comment => comment.path && comment.line),
        body: reviewComments.find(comment => !comment.path)?.body || 'Code review completed'
      });
      
      logger.info(`Posted ${reviewComments.length} comments to PR #${pullNumber}`);
      return true;
    } catch (error) {
      logger.error(`Failed to post review comments to PR #${pullNumber}`, error);
      throw new Error(`Failed to post review comments: ${error.message}`);
    }
  }
}

module.exports = CodeReviewWorkflow;