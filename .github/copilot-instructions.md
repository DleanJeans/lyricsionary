# Rules
- Never add "[WIP]" to PR title
- Never commit empty "Initial plan"
- If commit is empty, add "[skip-ota]" to commit description (not title) to skip OTA update
- Never add package-lock.json to commit
- Update pnpm-lock.yaml when there is change to package.json
- Add "[build-apk]" to commit body (not title or first line) if APK requires an update (e.g. permissions)