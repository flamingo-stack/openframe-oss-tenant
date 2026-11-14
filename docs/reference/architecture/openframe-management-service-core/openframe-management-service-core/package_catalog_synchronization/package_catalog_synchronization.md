# Package Catalog Synchronization

Package Catalog Synchronization maintains searchable Homebrew and winget package snapshots when `openframe.package-search.sync.enabled` is enabled. It uses a global Redis lock so the shared catalog has one writer across the deployment.

## Components

| Component | Responsibility |
| --- | --- |
| [PackageCatalogSyncProperties](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/packagesearch/PackageCatalogSyncProperties.java) | Binds initial delay, source intervals, base URLs, and timeouts. Defaults are fifteen minutes for Homebrew and thirty minutes for winget. |
| [PackageCatalogSyncScheduler](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/packagesearch/PackageCatalogSyncScheduler.java) | Runs the manager-specific fetch and snapshot replacement under a timed lock. |
| [BrewCatalogFetcher](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/packagesearch/BrewCatalogFetcher.java) | Imports enabled formulas and casks, with best-effort installation-popularity analytics. |
| [WingetCatalogFetcher](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/packagesearch/WingetCatalogFetcher.java) | Downloads the winget MSIX index, reads valid entries, and maps searchable fields. |
| [PackageCatalogWriter](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/packagesearch/PackageCatalogWriter.java) | Creates stable composite identifiers, upserts a fresh snapshot, and prunes stale records for one manager. |
| [PackageCatalogSyncMetrics](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/packagesearch/PackageCatalogSyncMetrics.java) | Emits `openframe.package_catalog.sync` counters tagged by manager and result. |

The writer stamps every entry with the same start time before upserting. It then deletes only entries for that manager whose timestamp predates the current snapshot, avoiding an empty catalog during refresh. Failed syncs retain the prior snapshot.
