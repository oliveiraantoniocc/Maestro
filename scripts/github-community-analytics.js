#!/usr/bin/env node
/**
 * GitHub Community Analytics for Maestro
 *
 * Fetches stargazers and forkers with detailed user data for analytics.
 * Requires: gh CLI to be installed and authenticated.
 *
 * Usage:
 *   node github-community-analytics.js
 *   node github-community-analytics.js --fetch-details  # Also fetch user details (slower)
 *   node github-community-analytics.js --json           # Output as JSON
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'pedramamini/Maestro';
const OUTPUT_DIR = path.join(__dirname, '..', 'community-data');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function ghApi(endpoint, extraHeaders = []) {
  const args = ['api', '--paginate'];
  extraHeaders.forEach(h => {
    args.push('-H', h);
  });
  args.push(endpoint);

  try {
    const result = execFileSync('gh', args, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large responses
    });
    // Paginated results come as newline-separated JSON arrays
    const lines = result.trim().split('\n').filter(Boolean);
    if (lines.length === 1) {
      return JSON.parse(lines[0]);
    }
    return lines.flatMap(line => JSON.parse(line));
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error.message);
    return [];
  }
}

function ghApiSingle(endpoint) {
  try {
    const result = execFileSync('gh', ['api', endpoint], {
      encoding: 'utf-8',
    });
    return JSON.parse(result);
  } catch (error) {
    return null;
  }
}

function fetchStargazers() {
  console.log('Fetching stargazers with timestamps...');
  const data = ghApi(
    `repos/${REPO}/stargazers`,
    ['Accept: application/vnd.github.star+json']
  );

  return data.map(item => ({
    username: item.user.login,
    userId: item.user.id,
    profileUrl: item.user.html_url,
    avatarUrl: item.user.avatar_url,
    starredAt: item.starred_at,
    type: item.user.type,
  }));
}

function fetchForkers() {
  console.log('Fetching forkers...');
  const data = ghApi(`repos/${REPO}/forks`);

  return data.map(fork => ({
    username: fork.owner.login,
    userId: fork.owner.id,
    profileUrl: fork.owner.html_url,
    avatarUrl: fork.owner.avatar_url,
    forkedAt: fork.created_at,
    forkName: fork.full_name,
    forkUrl: fork.html_url,
    type: fork.owner.type,
  }));
}

function fetchUserDetails(username) {
  const user = ghApiSingle(`users/${username}`);
  if (!user) {
    console.error(`  Failed to fetch details for ${username}`);
    return null;
  }
  return {
    username: user.login,
    name: user.name,
    company: user.company,
    location: user.location,
    email: user.email,
    bio: user.bio,
    blog: user.blog,
    twitterUsername: user.twitter_username,
    followers: user.followers,
    following: user.following,
    publicRepos: user.public_repos,
    publicGists: user.public_gists,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function generateGrowthTimeline(items, dateField) {
  const byDate = {};
  items.forEach(item => {
    const date = item[dateField]?.split('T')[0];
    if (date) {
      byDate[date] = (byDate[date] || 0) + 1;
    }
  });

  const sorted = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));
  let cumulative = 0;
  return sorted.map(([date, count]) => {
    cumulative += count;
    return { date, dailyCount: count, cumulative };
  });
}

function generateReport(stargazers, forkers, userDetails = null) {
  const uniqueUsers = new Set([
    ...stargazers.map(s => s.username),
    ...forkers.map(f => f.username),
  ]);

  const starGrowth = generateGrowthTimeline(stargazers, 'starredAt');
  const forkGrowth = generateGrowthTimeline(forkers, 'forkedAt');

  // Users who both starred and forked
  const starUsernames = new Set(stargazers.map(s => s.username));
  const forkUsernames = new Set(forkers.map(f => f.username));
  const engagedUsers = [...starUsernames].filter(u => forkUsernames.has(u));

  const report = {
    generatedAt: new Date().toISOString(),
    repository: REPO,
    summary: {
      totalStars: stargazers.length,
      totalForks: forkers.length,
      uniqueUsers: uniqueUsers.size,
      highlyEngagedUsers: engagedUsers.length,
    },
    starGrowth,
    forkGrowth,
    engagedUsers,
    recentStars: stargazers
      .sort((a, b) => new Date(b.starredAt) - new Date(a.starredAt))
      .slice(0, 10),
    recentForks: forkers
      .sort((a, b) => new Date(b.forkedAt) - new Date(a.forkedAt))
      .slice(0, 10),
  };

  if (userDetails) {
    // Add location distribution
    const locations = {};
    const companies = {};
    let totalFollowers = 0;

    Object.values(userDetails).forEach(user => {
      if (user) {
        if (user.location) {
          locations[user.location] = (locations[user.location] || 0) + 1;
        }
        if (user.company) {
          companies[user.company] = (companies[user.company] || 0) + 1;
        }
        totalFollowers += user.followers || 0;
      }
    });

    report.demographics = {
      topLocations: Object.entries(locations)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20),
      topCompanies: Object.entries(companies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20),
      totalCommunityFollowers: totalFollowers,
    };

    // Top influencers (by follower count)
    report.topInfluencers = Object.values(userDetails)
      .filter(u => u)
      .sort((a, b) => (b.followers || 0) - (a.followers || 0))
      .slice(0, 20)
      .map(u => ({
        username: u.username,
        name: u.name,
        followers: u.followers,
        company: u.company,
      }));
  }

  return report;
}

function generateMarkdownReport(report) {
  let md = `# Maestro Community Analytics

**Generated:** ${report.generatedAt}
**Repository:** [${report.repository}](https://github.com/${report.repository})

## Summary

| Metric | Count |
|--------|-------|
| Total Stars | ${report.summary.totalStars} |
| Total Forks | ${report.summary.totalForks} |
| Unique Community Members | ${report.summary.uniqueUsers} |
| Highly Engaged (starred + forked) | ${report.summary.highlyEngagedUsers} |

## Highly Engaged Users

These users both starred AND forked the repository:

${report.engagedUsers.map(u => `- [@${u}](https://github.com/${u})`).join('\n')}

## Recent Stars (Last 10)

| User | Starred At |
|------|------------|
${report.recentStars.map(s => `| [@${s.username}](${s.profileUrl}) | ${s.starredAt?.split('T')[0] || 'N/A'} |`).join('\n')}

## Recent Forks (Last 10)

| User | Forked At | Fork |
|------|-----------|------|
${report.recentForks.map(f => `| [@${f.username}](${f.profileUrl}) | ${f.forkedAt?.split('T')[0] || 'N/A'} | [${f.forkName}](${f.forkUrl}) |`).join('\n')}

## Star Growth Over Time

| Date | Daily | Cumulative |
|------|-------|------------|
${report.starGrowth.slice(-30).map(g => `| ${g.date} | +${g.dailyCount} | ${g.cumulative} |`).join('\n')}

## Fork Growth Over Time

| Date | Daily | Cumulative |
|------|-------|------------|
${report.forkGrowth.slice(-30).map(g => `| ${g.date} | +${g.dailyCount} | ${g.cumulative} |`).join('\n')}
`;

  if (report.demographics) {
    md += `
## Demographics

### Top Locations
${report.demographics.topLocations.map(([loc, count]) => `- ${loc}: ${count}`).join('\n')}

### Top Companies
${report.demographics.topCompanies.map(([co, count]) => `- ${co}: ${count}`).join('\n')}

### Top Influencers (by follower count)
| User | Name | Followers | Company |
|------|------|-----------|---------|
${report.topInfluencers.map(u => `| [@${u.username}](https://github.com/${u.username}) | ${u.name || ''} | ${u.followers} | ${u.company || ''} |`).join('\n')}

**Total Community Reach:** ${report.demographics.totalCommunityFollowers.toLocaleString()} followers
`;
  }

  return md;
}

async function main() {
  const args = process.argv.slice(2);
  const fetchDetails = args.includes('--fetch-details');
  const jsonOutput = args.includes('--json');

  console.log(`\n=== GitHub Community Analytics for ${REPO} ===\n`);

  // Fetch basic data
  const stargazers = fetchStargazers();
  console.log(`  Found ${stargazers.length} stargazers`);

  const forkers = fetchForkers();
  console.log(`  Found ${forkers.length} forkers`);

  // Save raw data
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'stargazers.json'),
    JSON.stringify(stargazers, null, 2)
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'forkers.json'),
    JSON.stringify(forkers, null, 2)
  );

  // Create user list
  const uniqueUsers = [...new Set([
    ...stargazers.map(s => s.username),
    ...forkers.map(f => f.username),
  ])].sort();

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'all_users.txt'),
    uniqueUsers.join('\n')
  );

  // Optionally fetch user details
  let userDetails = null;
  if (fetchDetails) {
    console.log(`\nFetching details for ${uniqueUsers.length} users (this may take a while)...`);
    userDetails = {};
    for (let i = 0; i < uniqueUsers.length; i++) {
      const username = uniqueUsers[i];
      process.stdout.write(`  [${i + 1}/${uniqueUsers.length}] ${username}...`);
      userDetails[username] = fetchUserDetails(username);
      console.log(' done');

      // Rate limiting - GitHub allows 5000 requests/hour for authenticated users
      if (i > 0 && i % 50 === 0) {
        console.log('  Pausing for rate limiting...');
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'user_details.json'),
      JSON.stringify(userDetails, null, 2)
    );
  }

  // Generate report
  const report = generateReport(stargazers, forkers, userDetails);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'report.json'),
    JSON.stringify(report, null, 2)
  );

  const markdown = generateMarkdownReport(report);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'COMMUNITY_REPORT.md'),
    markdown
  );

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n' + markdown);
  }

  console.log(`\n=== Files Generated in ${OUTPUT_DIR}/ ===`);
  console.log('  stargazers.json      - Raw stargazer data');
  console.log('  forkers.json         - Raw forker data');
  console.log('  all_users.txt        - Unique usernames');
  console.log('  report.json          - Full analytics report');
  console.log('  COMMUNITY_REPORT.md  - Markdown report');
  if (userDetails) {
    console.log('  user_details.json    - Detailed user profiles');
  }

  console.log('\n=== Useful Commands ===');
  console.log('');
  console.log('# Re-run with user details (slower, more data):');
  console.log('  node scripts/github-community-analytics.js --fetch-details');
  console.log('');
  console.log('# Query a specific user:');
  console.log('  gh api users/USERNAME --jq \'{login, name, company, location, followers}\'');
  console.log('');
}

main().catch(console.error);
