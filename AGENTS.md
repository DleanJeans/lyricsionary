# Rules
- Never add package-lock.json to commit
- Update pnpm-lock.yaml when there is change to package.json
- Add label "rebuild apk" to PR if APK requires an update (e.g. permissions)
- Write tests for the current GH issue in .maestro/issues folder in name format {issueNumber}-{description}