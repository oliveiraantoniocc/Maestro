#!/bin/bash
# GitHub Community Analytics Script for Maestro
# Fetches stargazers and forkers with timestamps for growth tracking

REPO="pedramamini/Maestro"
OUTPUT_DIR="community-data"

mkdir -p "$OUTPUT_DIR"

echo "=== GitHub Community Analytics for $REPO ==="
echo ""

# Check if gh CLI is authenticated
if ! gh auth status &>/dev/null; then
    echo "Error: Please authenticate with 'gh auth login' first"
    exit 1
fi

# Fetch stargazers with timestamps
echo "Fetching stargazers..."
gh api --paginate "repos/$REPO/stargazers" \
    -H "Accept: application/vnd.github.star+json" \
    --jq '.[] | [.starred_at, .user.login, .user.id, .user.html_url] | @tsv' \
    > "$OUTPUT_DIR/stargazers.tsv"

STAR_COUNT=$(wc -l < "$OUTPUT_DIR/stargazers.tsv" | tr -d ' ')
echo "  Found $STAR_COUNT stargazers"

# Fetch forkers
echo "Fetching forks..."
gh api --paginate "repos/$REPO/forks" \
    --jq '.[] | [.created_at, .owner.login, .owner.id, .owner.html_url, .full_name] | @tsv' \
    > "$OUTPUT_DIR/forkers.tsv"

FORK_COUNT=$(wc -l < "$OUTPUT_DIR/forkers.tsv" | tr -d ' ')
echo "  Found $FORK_COUNT forks"

# Create combined user list (unique users)
echo "Creating combined user list..."
{
    cut -f2 "$OUTPUT_DIR/stargazers.tsv"
    cut -f2 "$OUTPUT_DIR/forkers.tsv"
} | sort -u > "$OUTPUT_DIR/all_users.txt"

UNIQUE_USERS=$(wc -l < "$OUTPUT_DIR/all_users.txt" | tr -d ' ')
echo "  Found $UNIQUE_USERS unique users"

# Generate summary report
echo ""
echo "=== Summary Report ==="
cat > "$OUTPUT_DIR/summary.md" << EOF
# Maestro Community Analytics

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Overview
- **Total Stars:** $STAR_COUNT
- **Total Forks:** $FORK_COUNT
- **Unique Community Members:** $UNIQUE_USERS

## Star Growth Timeline

| Date | Cumulative Stars |
|------|------------------|
EOF

# Add star growth data (by week)
awk -F'\t' '{print substr($1,1,10)}' "$OUTPUT_DIR/stargazers.tsv" | \
    sort | uniq -c | awk 'BEGIN{sum=0} {sum+=$1; print "| " $2 " | " sum " |"}' \
    >> "$OUTPUT_DIR/summary.md"

cat >> "$OUTPUT_DIR/summary.md" << EOF

## Fork Growth Timeline

| Date | Cumulative Forks |
|------|------------------|
EOF

awk -F'\t' '{print substr($1,1,10)}' "$OUTPUT_DIR/forkers.tsv" | \
    sort | uniq -c | awk 'BEGIN{sum=0} {sum+=$1; print "| " $2 " | " sum " |"}' \
    >> "$OUTPUT_DIR/summary.md"

cat "$OUTPUT_DIR/summary.md"

echo ""
echo "=== Files Generated ==="
echo "  $OUTPUT_DIR/stargazers.tsv    - All stargazers with timestamps"
echo "  $OUTPUT_DIR/forkers.tsv       - All forkers with timestamps"
echo "  $OUTPUT_DIR/all_users.txt     - Unique usernames"
echo "  $OUTPUT_DIR/summary.md        - Summary report"
echo ""
echo "=== Useful gh Commands for Further Analysis ==="
echo ""
echo "# Get detailed info for a specific user:"
echo "  gh api users/USERNAME"
echo ""
echo "# Get user's public repos count, followers, company, location:"
echo "  gh api users/USERNAME --jq '{login, name, company, location, followers, public_repos, created_at}'"
echo ""
echo "# Batch fetch user details (run from community-data directory):"
echo "  cat all_users.txt | head -100 | xargs -I{} gh api users/{} --jq '[.login, .name // \"\", .company // \"\", .location // \"\", .followers, .public_repos] | @tsv'"
echo ""
