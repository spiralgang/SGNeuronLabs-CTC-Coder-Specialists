const axios = require('axios');

// Integration with free external services
class ServiceIntegrations {
  // GitHub Actions status checker
  static async checkWorkflowStatus(octokit, owner, repo) {
    try {
      const { data: workflows } = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
        owner,
        repo
      });
      
      const recentRuns = await octokit.request('GET /repos/{owner}/{repo}/actions/runs', {
        owner,
        repo,
        per_page: 5
      });
      
      const summary = {
        totalWorkflows: workflows.total_count,
        recentRuns: recentRuns.data.workflow_runs.map(run => ({
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          url: run.html_url,
          createdAt: run.created_at
        }))
      };
      
      return summary;
    } catch (error) {
      console.error('Error checking workflow status:', error);
      return { error: 'Could not retrieve workflow status' };
    }
  }
  
  // CodeQL security analysis integration
  static async getSecurityAlerts(octokit, owner, repo) {
    try {
      const { data: alerts } = await octokit.request('GET /repos/{owner}/{repo}/code-scanning/alerts', {
        owner,
        repo,
        state: 'open'
      });
      
      return {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(alert => alert.rule.security_severity_level === 'critical').length,
        highAlerts: alerts.filter(alert => alert.rule.security_severity_level === 'high').length,
        recentAlerts: alerts.slice(0, 5).map(alert => ({
          title: alert.rule.description,
          severity: alert.rule.security_severity_level,
          path: alert.most_recent_instance.location.path,
          url: alert.html_url
        }))
      };
    } catch (error) {
      console.error('Error getting security alerts:', error);
      return { error: 'Could not retrieve security alerts' };
    }
  }
  
  // Shields.io badge generator
  static getBadgeUrl(type, owner, repo, branch = 'main') {
    const badges = {
      workflow: `https://img.shields.io/github/workflow/status/${owner}/${repo}/CI/${branch}`,
      license: `https://img.shields.io/github/license/${owner}/${repo}`,
      issues: `https://img.shields.io/github/issues/${owner}/${repo}`,
      stars: `https://img.shields.io/github/stars/${owner}/${repo}`,
      lastCommit: `https://img.shields.io/github/last-commit/${owner}/${repo}/${branch}`
    };
    
    return badges[type] || badges.stars;
  }
  
  // Generate README badges
  static getReadmeBadges(owner, repo, branch = 'main') {
    const types = ['workflow', 'license', 'issues', 'stars', 'lastCommit'];
    return types.map(type => {
      const url = this.getBadgeUrl(type, owner, repo, branch);
      const label = type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
      return `![${label}](${url})`;
    }).join('\n');
  }
  
  // Public APIs integration (using public-apis.io)
  static async getPublicApiSuggestion(category) {
    try {
      const { data } = await axios.get('https://api.publicapis.org/entries', {
        params: { category }
      });
      
      if (data.entries && data.entries.length > 0) {
        // Get a random API from the category
        const randomIndex = Math.floor(Math.random() * data.entries.length);
        return data.entries[randomIndex];
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching public API:', error);
      return null;
    }
  }
  
  // Dependency vulnerability checker via OSV
  static async checkDependencyVulnerabilities(packageName, version) {
    try {
      const { data } = await axios.post('https://api.osv.dev/v1/query', {
        package: {
          name: packageName,
          ecosystem: 'npm'
        },
        version
      });
      
      return {
        hasVulnerabilities: data.vulns && data.vulns.length > 0,
        vulnerabilities: data.vulns || [],
        count: data.vulns ? data.vulns.length : 0
      };
    } catch (error) {
      console.error('Error checking vulnerabilities:', error);
      return { hasVulnerabilities: false, vulnerabilities: [], count: 0 };
    }
  }
}

module.exports = ServiceIntegrations;