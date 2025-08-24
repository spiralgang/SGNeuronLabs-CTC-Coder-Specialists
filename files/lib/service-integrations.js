const axios = require('axios');
const cheerio = require('cheerio');

class ServiceIntegrations {
  // GitHub Actions workflow status checker
  static async checkWorkflowStatus(octokit, owner, repo) {
    try {
      const { data: workflows } = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
        owner,
        repo
      });
      
      const { data: recentRuns } = await octokit.request('GET /repos/{owner}/{repo}/actions/runs', {
        owner,
        repo,
        per_page: 5
      });
      
      return {
        totalWorkflows: workflows.total_count,
        recentRuns: recentRuns.workflow_runs.map(run => ({
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          url: run.html_url,
          createdAt: run.created_at
        }))
      };
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
        criticalAlerts: alerts.filter(alert => alert.rule?.security_severity_level === 'critical').length,
        highAlerts: alerts.filter(alert => alert.rule?.security_severity_level === 'high').length,
        recentAlerts: alerts.slice(0, 5).map(alert => ({
          title: alert.rule?.description || 'Unknown issue',
          severity: alert.rule?.security_severity_level || 'unknown',
          path: alert.most_recent_instance?.location.path || 'unknown',
          url: alert.html_url
        }))
      };
    } catch (error) {
      console.error('Error getting security alerts:', error);
      return { error: 'Could not retrieve security alerts' };
    }
  }
  
  // Get badges from shields.io
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
  
  // Web scraping for documentation (using only non-paywalled sources)
  static async searchDocumentation(query) {
    try {
      // Only search MDN, GitHub Docs, and other free resources
      const url = `https://www.google.com/search?q=${encodeURIComponent(`${query} site:docs.github.com OR site:developer.mozilla.org`)}&num=5`;
      
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(data);
      const results = [];
      
      // Extract search results
      $('.g').each((i, element) => {
        if (results.length >= 3) return;
        
        const titleElement = $(element).find('h3');
        if (!titleElement.length) return;
        
        const title = titleElement.text();
        const linkElement = $(element).find('a');
        const url = linkElement.attr('href');
        const snippet = $(element).find('.VwiC3b').text() || 'No description available';
        
        if (url && !url.includes('google.com')) {
          results.push({ title, url, snippet });
        }
      });
      
      return results;
    } catch (error) {
      console.error('Error searching documentation:', error);
      return [];
    }
  }
  
  // OSV vulnerability database integration
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