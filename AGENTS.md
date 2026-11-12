# AGENTS

<!-- flamingo-ecosystem:start -->
## Ecosystem (generated)

This repository is a service in the OpenFrame ecosystem.
It publishes: com.openframe:openframe-api, com.openframe:openframe-authorization-server, com.openframe:openframe-client, com.openframe:openframe-config, com.openframe:openframe-external-api, com.openframe:openframe-gateway, com.openframe:openframe-management, com.openframe:openframe-stream, com.openframe:openframe-test, openframe_client.
Depends on: OpenFrame OSS Library.
Details: docs/reference/architecture/ecosystem.md (generated on every merge).

### Changes that span repositories

- EVERY pull request declares its change set: a `Change-Set: <slug>` line in its description, the SAME line on every pull request of the change in every repository (3-64 of a-z, 0-9, `.`, `_`, `-`, starting with a letter or digit; the branch name through the slug rule, e.g. `Change-Set: feat-vanta-trust-center` for `feat/vanta-trust-center`). A change that is one pull request so far is a change set too.
- When a pull request needs another merged first, also add one line per dependency (a dependency line alone puts the pull request in a set too, so it satisfies the rule above):
  `Depends-On: https://github.com/<owner>/<repo>/pull/<n>` (or `Depends-On: <owner>/<repo>#<n>`; `Depends-On: #<n>` for this repository).
- The hub's `Flamingo Code Graph / change-set` commit status fails a new pull request that is in no change set.
- Never edit the hub’s `flamingo-change-set` or `flamingo-change-set-suggestion` blocks in a pull request description (HTML-comment markers); the hub maintains them.
- The Flamingo reviewer then checks imports and consumers against that pull request’s branch and states the merge order.
- Before changing code on a pull request, load its set: `/change-set <owner/repo#n>` or the hub MCP tool `get_change_set`. Then pass that pull request as `pull_request` to `resolve_code_imports` and `find_code_consumers`, so they read the siblings’ open branches too.
<!-- flamingo-ecosystem:end -->
