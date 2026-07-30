# Read the Docs integration

The existing Read the Docs project has slug `genbank-viewer`, canonical URL <https://genbank-viewer.readthedocs.io/en/latest/>, and default branch `main`. Repository inspection confirmed the public project metadata; the current `latest` page returned 404 before this audit because the checked-in configuration selected Sphinx and referenced a nonexistent `docs/conf.py`.

## Configuration in Git

`.readthedocs.yaml` uses Read the Docs configuration version 2, Ubuntu 24.04, Python 3.12, `mkdocs.yml`, strict warning handling, and the pinned root `requirements-docs.txt`. `mkdocs.yml` supplies the canonical URL, repository/edit links, navigation, search, local system fonts, and Markdown extensions.

The workflow `.github/workflows/readthedocs.yml` validates the documentation locally and then requests a remote build through Read the Docs API v3. It does not upload generated HTML. The build endpoint is:

```text
POST /api/v3/projects/{project_slug}/versions/{version_slug}/builds/
```

## Required existing repository configuration

Confirm these GitHub repository settings before publication:

- Actions secret `RTD_API_TOKEN`: a Read the Docs API token with access to this project;
- Actions variable `RTD_PROJECT_SLUG`: `genbank-viewer`.

The repository audit could not find either required name, so they remain a manual configuration step. Repository code cannot create or rotate the token, add secrets/variables, approve GitHub App permissions, or change protected Read the Docs dashboard settings. The workflow fails with a clear message when either value is absent and never prints the token.

## Publication and version policy

- A push to `main` validates locally and triggers `latest`.
- Publishing a GitHub release synchronises Read the Docs versions, waits for the release tag, activates it if needed, and builds that tag version.
- A manual run defaults to `latest` and accepts an explicit safe version slug, optional version sync, and optional remote-build polling.
- `stable` should identify the newest published, non-prerelease semantic version. The workflow does **not** reassign `stable`, because that policy depends on existing Read the Docs automation/dashboard settings and changing it through an unverified API would be risky.

## Avoid duplicate builds

Keep the existing Read the Docs GitHub App integration for repository access and, if enabled, pull-request build status. In the Read the Docs dashboard, confirm that webhook/automation rules do not also build `latest` and release tags that the GitHub Action publishes. The intended source of publication triggers is GitHub Actions after local validation. If the existing integration unavoidably submits the same build, Read the Docs may show duplicate build records; this cannot be detected reliably before the Action requests a new build.

## Verify integration health

1. Confirm the Read the Docs project repository remains `https://github.com/linsalrob/genbank_viewer.git`, default branch is `main`, and configuration-file path is the repository default (`.readthedocs.yaml`).
2. Confirm GitHub App repository access and pull-request build status in the existing dashboard integration.
3. Confirm branch/tag automation rules follow the version and duplicate-build policies above.
4. Open the Read the Docs **Builds** page and inspect the checkout, dependency, and MkDocs steps for the latest build.
5. Open the GitHub **Actions** page and inspect **Publish Read the Docs** for local validation, returned build ID/URL, polling, and final state.

Pull-request previews are governed by the existing Read the Docs dashboard setting and GitHub App integration; the repository does not prove that external-version builds are enabled. Confirm this setting rather than creating a second integration. Pull-request CI always performs the local strict build and asset/link checks without credentials.

## Manual publication

Open **Actions → Publish Read the Docs → Run workflow**. Leave the version as `latest` or enter a branch/tag version slug containing only letters, digits, `.`, `_`, or `-`. Enable version sync when publishing a newly visible tag. Keep polling enabled to make the Action fail if the remote build fails or times out.

## Rotate the token

Create a replacement token through the existing Read the Docs account's API-token settings, update the `RTD_API_TOKEN` Actions secret without displaying it, test a manual `latest` build, then revoke the old token. Repository files and logs must never contain either token.

## Diagnose a failed build

1. If local validation fails, reproduce `python -m mkdocs build --strict` and `cd web && npm run docs:audit`.
2. For HTTP 401/403, confirm the secret exists, has not expired, and can access the project.
3. For HTTP 404, confirm `RTD_PROJECT_SLUG`, version sync, and the version slug.
4. For a remote failure, open the build URL recorded in the Action and inspect its Read the Docs log.
5. For a timeout, inspect the remote build before retrying; the first request may still have succeeded.
6. For duplicate builds, review webhook and automation rules as described above.
