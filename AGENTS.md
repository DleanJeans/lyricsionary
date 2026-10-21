# Rules
- Never add package-lock.json to commit
- Update pnpm-lock.yaml when there is change to package.json
- Add label "rebuild apk" to PR if APK requires an update (e.g. permissions)
- Commit but never push; DJ verifies locally first and pushes when ready
