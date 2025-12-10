# n8n Secure Workflow Backup System

This directory contains scripts and configurations for securely backing up n8n workflows without exposing sensitive data.

## How to Export Workflows

Run the npm script from the project root:

```bash
npm run n8n:backup
```

This will export the workflow JSON files to `backend/n8n/workflows/` directory using Docker commands to ensure files are copied to the host machine. Ensure you review the files before committing to Git to confirm no sensitive data is included.

## Warning

**CRITICAL:** Make sure your workflows use n8n Credentials for any secrets, API keys, or passwords. Do NOT hardcode these values directly in workflow nodes as they might be exported with the logic.

## How to Restore Workflows

1. In the n8n UI, navigate to the workflows section.
2. Manually import the JSON files from `backend/n8n/workflows/`.
3. Create any missing Credentials in the n8n UI (they will not be restored automatically for security reasons).
4. Link the imported workflows to the newly created Credentials.

## Best Practices

- Use `$env.VAR_NAME` syntax for environment-based configuration variables.
- Always use n8n Credentials for secrets, tokens, and sensitive authentication data.
- Regularly run the export script and commit sanitized workflows to Git for version control and disaster recovery.
