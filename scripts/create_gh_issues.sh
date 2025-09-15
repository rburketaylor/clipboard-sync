#!/usr/bin/env bash
set -euo pipefail

# Batch-create GitHub issues for this repo from issues/extension_issues.json
# Requirements: curl, jq, git; env var GITHUB_TOKEN must be set.

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required (sudo apt-get install jq or brew install jq)" >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 1
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Set GITHUB_TOKEN with repo:issues scope (export GITHUB_TOKEN=...)" >&2
  exit 1
fi

# Resolve owner/repo
if [[ -n "${REPO:-}" ]]; then
  REPO="$REPO"
else
  remote_url=$(git remote get-url origin 2>/dev/null || true)
  if [[ -z "$remote_url" ]]; then
    echo "Could not determine git remote 'origin' and REPO is not set." >&2
    exit 1
  fi
  if [[ "$remote_url" =~ github.com[:/](.+)/(.+)(\.git)?$ ]]; then
    owner=${BASH_REMATCH[1]}
    repo=${BASH_REMATCH[2]}
    REPO="$owner/$repo"
  else
    echo "Unsupported remote URL: $remote_url" >&2
    exit 1
  fi
fi
API="https://api.github.com/repos/$REPO"

DRY=${DRY_RUN:-false}

hdr=(
  -H "Accept: application/vnd.github+json"
  -H "Authorization: Bearer $GITHUB_TOKEN"
  -H "X-GitHub-Api-Version: 2022-11-28"
)

create_label() {
  local name="$1" color="$2" desc="$3"
  # Check if exists
  if curl -sS "${API}/labels/$name" "${hdr[@]}" | jq -e '.name? == null' >/dev/null 2>&1; then
    if [[ "$DRY" == "true" ]]; then
      echo "[DRY] create label $name"
    else
      curl -sS -X POST "${API}/labels" "${hdr[@]}" \
        -d "$(jq -nc --arg n "$name" --arg c "$color" --arg d "$desc" '{name:$n,color:$c,description:$d}')" \
        >/dev/null
      echo "Label created: $name"
    fi
  else
    echo "Label exists: $name"
  fi
}

echo "Repository: $REPO"
echo "Creating labels (idempotent)..."
create_label "area:extension" "0e8a16" "Chrome Extension work"
create_label "type:task" "1d76db" "Implementation task"
create_label "priority:normal" "c2e0c6" "Default priority"
for m in M1 M2 M3 M4 M5 M6; do
  create_label "$m" "ededed" "Milestone $m"
done

issues_file="issues/extension_issues.json"
if [[ ! -f "$issues_file" ]]; then
  echo "Missing $issues_file" >&2
  exit 1
fi

count=$(jq 'length' "$issues_file")
echo "Creating $count issues..."

for i in $(jq -r 'to_entries|.[].key' "$issues_file"); do
  title=$(jq -r ".[$i].title" "$issues_file")
  body=$(jq -r ".[$i].body" "$issues_file")
  labels=$(jq -c ".[$i].labels" "$issues_file")

  payload=$(jq -nc --arg t "$title" --arg b "$body" --argjson l "$labels" '{title:$t, body:$b, labels:$l}')

  if [[ "$DRY" == "true" ]]; then
    echo "[DRY] would create: $title"
  else
    resp=$(curl -sS -X POST "${API}/issues" "${hdr[@]}" -d "$payload")
    number=$(echo "$resp" | jq -r '.number // empty')
    if [[ -n "$number" ]]; then
      echo "Created #$number: $title"
    else
      echo "Failed to create: $title" >&2
      echo "$resp" | jq -r '.message, (.errors // [])' >&2
    fi
  fi
done

echo "Done."
