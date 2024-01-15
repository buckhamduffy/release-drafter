# BuckhamDuffy Release Drafter

Creates releases in our git workflow, but also creates draft releases for the staging branch

### Usage
```yaml
jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          ref: ${{ github.event.workflow_run.head_branch }}

      - uses: buckhamduffy/release-drafter@v1
        id: version
        with:
          # Optional
          master_branch: master
          staging_branch: staging
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Releasing

Before you commit, you must build the code. Then you can create a new release and push it.

- npm run prepare
- git add -A
- git commit -a -m "fix: {message}"
- cog bump --auto
- git push origin main --tags
- git tag -f v1 {version}
- git push origin v1 --force
