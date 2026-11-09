# Rules
- Never add package-lock.json to commit
- Update pnpm-lock.yaml when there is change to package.json
- If the APK needs an update (e.g. new native deps or permissions), add `build-apk` to the commit message
- Commit and push straight to main; no feature branches or PRs needed. DJ pulls and verifies from there
