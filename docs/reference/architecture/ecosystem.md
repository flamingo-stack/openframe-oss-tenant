# Ecosystem: OpenFrame OSS Tenant

> Generated from the repository graph by the Flamingo documentation pipeline. Do not edit by hand: it is rebuilt from the manifests and sources on every merge.

## Role

OpenFrame OSS Tenant is a **service** (bash, java, rust).

## Published artifacts

| Ecosystem | Artifact | Version |
|---|---|---|
| maven | `com.openframe:openframe-api` | 1.0.0-SNAPSHOT |
| maven | `com.openframe:openframe-authorization-server` | 1.0.0-SNAPSHOT |
| maven | `com.openframe:openframe-client` | 1.0.0-SNAPSHOT |
| maven | `com.openframe:openframe-config` | 1.0.0-SNAPSHOT |
| maven | `com.openframe:openframe-external-api` | 1.0.0-SNAPSHOT |
| maven | `com.openframe:openframe-gateway` | 1.0.0-SNAPSHOT |
| maven | `com.openframe:openframe-management` | 1.0.0-SNAPSHOT |
| maven | `com.openframe:openframe-stream` | 1.0.0-SNAPSHOT |
| maven | `com.openframe:openframe-test` | 1.0.0-SNAPSHOT |
| cargo | `openframe_client` | 0.1.0 |

## Upstream dependencies

| Repository | Artifact | Pinned version | Edge |
|---|---|---|---|
| [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib) | n/a | n/a | manual (manual) |

## Downstream consumers

None recorded.

## Delivery chain

| Kind | Env | From | To | Detail | Source |
|---|---|---|---|---|---|
| ci_image | all | `release` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-api` | step Generate metadata | `.github/workflows/release.yml` |
| ci_image | all | `release` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-authorization-server` | step Generate metadata | `.github/workflows/release.yml` |
| ci_image | all | `release` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-external-api` | step Generate metadata | `.github/workflows/release.yml` |
| ci_image | all | `release` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-client` | step Generate metadata | `.github/workflows/release.yml` |
| ci_image | all | `release` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-config` | step Generate metadata | `.github/workflows/release.yml` |
| ci_image | all | `release` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-gateway` | step Generate metadata | `.github/workflows/release.yml` |
| ci_image | all | `release` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-management` | step Generate metadata | `.github/workflows/release.yml` |
| ci_image | all | `release` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-stream` | step Generate metadata | `.github/workflows/release.yml` |
| ci_chart | all | `release` | `oci://ghcr.io/flamingo-stack/openframe-oss-tenant/app-of-apps` | ./manifests/app-of-apps | `.github/workflows/release.yml` |
| argocd_app | all | `manifests/apps` | `manifests/platform/namespace-platform` | platform · wave -1 · default | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/platform/ingress-nginx` | platform · wave 0 · platform | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/platform/dev-tools` | platform · wave 0 · platform | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/platform/openframe-config` | platform · wave 0 · platform | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/datasources/namespace-datasources` | datasources · wave -1 · default | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/datasources/cassandra` | datasources · wave 0 · datasources | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/datasources/debezium-connect` | datasources · wave 0 · datasources | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/datasources/kafka` | datasources · wave 0 · datasources | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/datasources/mongodb` | datasources · wave 0 · datasources | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/datasources/mongodb-meshcentral` | datasources · wave 0 · datasources | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/datasources/mysql-fleetmdm` | datasources · wave 0 · datasources | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/datasources/nats` | datasources · wave 0 · datasources | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/datasources/pinot` | datasources · wave 0 · datasources | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/datasources/redis-cluster` | datasources · wave 0 · datasources | `manifests/apps/values.yaml` |
| argocd_app | all | `manifests/apps` | `manifests/datasources/zookeeper` | datasources · wave 0 · datasources | `manifests/apps/values.yaml` |
| chart_dependency | all | `manifests/datasources/cassandra` | `oci://ghcr.io/flamingo-stack/registry/helm-charts/cassandra` | ~12.3.9 · oci | `manifests/datasources/cassandra/Chart.yaml` |
| chart_image | all | `manifests/datasources/cassandra` | `ghcr.io/flamingo-stack/registry/bitnamilegacy/cassandra` | 5.0.5-debian-12-r7 · cassandra | `manifests/datasources/cassandra/values.yaml` |
| chart_image | all | `manifests/datasources/cassandra` | `ghcr.io/flamingo-stack/registry/bitnamilegacy/cassandra-exporter` | 2.3.8-debian-12-r51 · cassandra.metrics | `manifests/datasources/cassandra/values.yaml` |
| chart_image | all | `manifests/datasources/debezium-connect` | `ghcr.io/flamingo-stack/registry/debezium/connect` | 3.3.2 · . | `manifests/datasources/debezium-connect/values.yaml` |
| chart_image | all | `manifests/datasources/debezium-connect` | `ghcr.io/flamingo-stack/registry/busybox` | 1.36.0 · metrics.jmx | `manifests/datasources/debezium-connect/values.yaml` |
| chart_dependency | all | `manifests/datasources/kafka` | `oci://ghcr.io/flamingo-stack/registry/helm-charts/kafka` | ~32.4.3 · oci | `manifests/datasources/kafka/Chart.yaml` |
| chart_image | all | `manifests/datasources/kafka` | `ghcr.io/flamingo-stack/registry/bitnamilegacy/kafka` | 4.0.0-debian-12-r10 · kafka | `manifests/datasources/kafka/values.yaml` |
| chart_image | all | `manifests/datasources/kafka` | `ghcr.io/flamingo-stack/registry/bitnamilegacy/jmx-exporter` | 1.4.0 · kafka.metrics.jmx | `manifests/datasources/kafka/values.yaml` |
| chart_image | all | `manifests/datasources/mongodb-meshcentral` | `ghcr.io/flamingo-stack/registry/mongo` | 8.0.29 · mongodb | `manifests/datasources/mongodb-meshcentral/values.yaml` |
| chart_image | all | `manifests/datasources/mongodb-meshcentral` | `ghcr.io/flamingo-stack/registry/bitnamilegacy/mongodb-exporter` | 0.46.0 · mongodb.metrics | `manifests/datasources/mongodb-meshcentral/values.yaml` |
| chart_image | all | `manifests/datasources/mongodb` | `ghcr.io/flamingo-stack/registry/mongo` | 7.0.40 · . | `manifests/datasources/mongodb/values.yaml` |
| chart_image | all | `manifests/datasources/mongodb` | `ghcr.io/flamingo-stack/registry/bitnamilegacy/mongodb-exporter` | 0.46.0 · metrics | `manifests/datasources/mongodb/values.yaml` |
| chart_image | all | `manifests/datasources/mysql-fleetmdm` | `ghcr.io/flamingo-stack/registry/mysql` | 8.0.46 · mysql | `manifests/datasources/mysql-fleetmdm/values.yaml` |
| chart_image | all | `manifests/datasources/mysql-fleetmdm` | `ghcr.io/flamingo-stack/registry/prom/mysqld-exporter` | v0.18.0 · mysql.metrics | `manifests/datasources/mysql-fleetmdm/values.yaml` |
| chart_dependency | all | `manifests/datasources/nats` | `https://nats-io.github.io/k8s/helm/charts/nats` | ~2.12.2 · helm | `manifests/datasources/nats/Chart.yaml` |
| chart_image | all | `manifests/datasources/nats` | `ghcr.io/flamingo-stack/registry/nats` | 2.10-alpine · nats.container | `manifests/datasources/nats/values.yaml` |
| chart_image | all | `manifests/datasources/nats` | `ghcr.io/flamingo-stack/registry/natsio/nats-server-config-reloader` | 0.21.1 · nats.reloader | `manifests/datasources/nats/values.yaml` |
| chart_image | all | `manifests/datasources/nats` | `ghcr.io/flamingo-stack/registry/natsio/prometheus-nats-exporter` | 0.18.0 · nats.promExporter | `manifests/datasources/nats/values.yaml` |
| chart_dependency | all | `manifests/datasources/pinot` | `https://raw.githubusercontent.com/apache/pinot/master/helm/pinot` | ~0.3.5 · helm | `manifests/datasources/pinot/Chart.yaml` |
| chart_image | all | `manifests/datasources/pinot` | `ghcr.io/flamingo-stack/registry/apachepinot/pinot` | 1.4.0 · pinot | `manifests/datasources/pinot/values.yaml` |
| chart_dependency | all | `manifests/datasources/redis-cluster` | `oci://ghcr.io/flamingo-stack/registry/helm-charts/redis-cluster` | ~11.5.0 · oci | `manifests/datasources/redis-cluster/Chart.yaml` |
| chart_image | all | `manifests/datasources/redis-cluster` | `ghcr.io/flamingo-stack/registry/bitnamilegacy/redis-cluster` | 7.4.2-debian-12-r2 · redis-cluster | `manifests/datasources/redis-cluster/values.yaml` |
| chart_image | all | `manifests/datasources/redis-cluster` | `ghcr.io/flamingo-stack/registry/bitnamilegacy/redis-exporter` | 1.76.0-debian-12-r0 · redis-cluster.metrics | `manifests/datasources/redis-cluster/values.yaml` |
| chart_dependency | all | `manifests/datasources/zookeeper` | `oci://ghcr.io/flamingo-stack/registry/helm-charts/zookeeper` | ~13.8.7 · oci | `manifests/datasources/zookeeper/Chart.yaml` |
| chart_image | all | `manifests/datasources/zookeeper` | `ghcr.io/flamingo-stack/registry/bitnamilegacy/zookeeper` | 3.9.3-debian-12-r22 · zookeeper | `manifests/datasources/zookeeper/values.yaml` |
| chart_dependency | all | `manifests/platform/dev-tools` | `https://kafbat.github.io/helm-charts/kafka-ui` | ~1.6.3 · helm | `manifests/platform/dev-tools/Chart.yaml` |
| chart_dependency | all | `manifests/platform/dev-tools` | `oci://ghcr.io/flamingo-stack/registry/helm-charts/telepresence-oss` | ~2.30.1 · oci | `manifests/platform/dev-tools/Chart.yaml` |
| chart_image | all | `manifests/platform/dev-tools` | `ghcr.io/flamingo-stack/registry/kafbat/kafka-ui` | v1.4.2 · kafka-ui | `manifests/platform/dev-tools/values.yaml` |
| chart_image | all | `manifests/platform/dev-tools` | `curlimages/curl` | telepresence-oss.hooks.curl | `manifests/platform/dev-tools/values.yaml` |
| chart_dependency | all | `manifests/platform/ingress-nginx` | `https://kubernetes.github.io/ingress-nginx/ingress-nginx` | ~4.13.0 · helm | `manifests/platform/ingress-nginx/Chart.yaml` |
| chart_dependency | all | `manifests/platform/ngrok-operator` | `https://charts.ngrok.com/ngrok-operator` | ~0.20.0 · helm | `manifests/platform/ngrok-operator/Chart.yaml` |
| chart_image | all | `manifests/platform/ngrok-operator` | `ghcr.io/flamingo-stack/registry/ngrok/ngrok-operator` | 0.19.1 · ngrok-operator | `manifests/platform/ngrok-operator/values.yaml` |
| chart_image | all | `manifests/platform/openframe-config` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-config` | latest · . | `manifests/platform/openframe-config/values.yaml` |
| chart_dependency | all | `manifests/tenant` | `oci://ghcr.io/flamingo-stack/fleetmdm/helm-charts/fleet` | 0.4.3 · oci | `manifests/tenant/Chart.yaml` |
| chart_dependency | all | `manifests/tenant` | `oci://ghcr.io/flamingo-stack/meshcentral/helm-charts/meshcentral` | 0.0.26 · oci | `manifests/tenant/Chart.yaml` |
| chart_image | all | `manifests/tenant` | `ghcr.io/flamingo-stack/fleetmdm/fleet` | latest · fleet | `manifests/tenant/values.yaml` |
| chart_image | all | `manifests/tenant` | `ghcr.io/flamingo-stack/meshcentral/meshcentral` | latest · meshcentral | `manifests/tenant/values.yaml` |
| chart_image | all | `manifests/tenant` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-api` | latest · openframe-saas.api | `manifests/tenant/values.yaml` |
| chart_image | all | `manifests/tenant` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-authorization-server` | latest · openframe-saas.authorization-server | `manifests/tenant/values.yaml` |
| chart_image | all | `manifests/tenant` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-client` | latest · openframe-saas.client | `manifests/tenant/values.yaml` |
| chart_image | all | `manifests/tenant` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-external-api` | latest · openframe-saas.external-api | `manifests/tenant/values.yaml` |
| chart_image | all | `manifests/tenant` | `ghcr.io/flamingo-stack/openframe-oss-frontend/openframe-oss-frontend` | latest · openframe-saas.frontend | `manifests/tenant/values.yaml` |
| chart_image | all | `manifests/tenant` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-gateway` | latest · openframe-saas.gateway | `manifests/tenant/values.yaml` |
| chart_image | all | `manifests/tenant` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-management` | latest · openframe-saas.management | `manifests/tenant/values.yaml` |
| chart_image | all | `manifests/tenant` | `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-stream` | latest · openframe-saas.stream | `manifests/tenant/values.yaml` |
| datasource | all | `application (shared config)` | `mongodb-0.mongodb.datasources.svc.cluster.local` | spring.mongodb.uri · mongodb | `configs/base/application.yml` |
| datasource | all | `application (shared config)` | `redis-cluster-0.redis-cluster-headless.datasources.svc.cluster.local` | spring.data.redis.cluster.nodes · redis-cluster | `configs/base/application.yml` |
| datasource | all | `application (shared config)` | `redis-cluster-1.redis-cluster-headless.datasources.svc.cluster.local` | spring.data.redis.cluster.nodes · redis-cluster | `configs/base/application.yml` |
| datasource | all | `application (shared config)` | `redis-cluster-2.redis-cluster-headless.datasources.svc.cluster.local` | spring.data.redis.cluster.nodes · redis-cluster | `configs/base/application.yml` |
| datasource | all | `application (shared config)` | `cassandra.datasources.svc.cluster.local` | spring.data.cassandra.contact-points · cassandra | `configs/base/application.yml` |
| datasource | all | `application (shared config)` | `pinot-controller.datasources.svc.cluster.local` | pinot.controller.url · pinot-controller | `configs/base/application.yml` |
| datasource | all | `application (shared config)` | `pinot-broker.datasources.svc.cluster.local` | pinot.broker.url · pinot-broker | `configs/base/application.yml` |
| datasource | all | `openframe-api` | `kafka.datasources.svc.cluster.local` | spring.oss-tenant.kafka.bootstrap-servers · kafka | `configs/base/openframe-api.yml` |
| datasource | all | `openframe-api` | `nats.datasources.svc.cluster.local` | nats.spring.server · nats | `configs/base/openframe-api.yml` |
| datasource | all | `openframe-client` | `kafka.datasources.svc.cluster.local` | spring.oss-tenant.kafka.bootstrap-servers · kafka | `configs/base/openframe-client.yml` |
| datasource | all | `openframe-client` | `nats.datasources.svc.cluster.local` | nats.spring.server · nats | `configs/base/openframe-client.yml` |
| datasource | all | `openframe-external-api` | `kafka.datasources.svc.cluster.local` | spring.oss-tenant.kafka.bootstrap-servers · kafka | `configs/base/openframe-external-api.yml` |
| datasource | all | `openframe-external-api` | `nats.datasources.svc.cluster.local` | nats.spring.server · nats | `configs/base/openframe-external-api.yml` |
| gateway_route | all | `openframe-gateway` | `openframe-authorization-server.tenant.svc.cluster.local` | sas · Path=/sas/** · http | `configs/base/openframe-gateway.yml` |
| gateway_route | all | `openframe-gateway` | `openframe-external-api.tenant.svc.cluster.local` | swagger-api-docs · Path=/api-docs/** · http | `configs/base/openframe-gateway.yml` |
| gateway_route | all | `openframe-gateway` | `openframe-api.tenant.svc.cluster.local` | openframe-api · Path=/api/** · http | `configs/base/openframe-gateway.yml` |
| gateway_route | all | `openframe-gateway` | `openframe-client.tenant.svc.cluster.local` | openframe-client · Path=/clients/** · http | `configs/base/openframe-gateway.yml` |
| gateway_route | all | `openframe-gateway` | `openframe-frontend.tenant.svc.cluster.local` | openframe-ui-spa · Path=/** · http | `configs/base/openframe-gateway.yml` |
| datasource | all | `openframe-management` | `kafka.datasources.svc.cluster.local` | spring.oss-tenant.kafka.bootstrap-servers · kafka | `configs/base/openframe-management.yml` |
| datasource | all | `openframe-management` | `nats.datasources.svc.cluster.local` | nats.spring.server · nats | `configs/base/openframe-management.yml` |
| datasource | all | `openframe-stream` | `kafka.datasources.svc.cluster.local` | spring.oss-tenant.kafka.bootstrap-servers · kafka | `configs/base/openframe-stream.yml` |

## Graph

```mermaid
flowchart LR
  r_01d21e68fc3743ce874eef90["OpenFrame OSS Library"]
  r_9266475793a04351b2453dca["OpenFrame OSS Tenant"]
  r_9266475793a04351b2453dca -.->|"manual"| r_01d21e68fc3743ce874eef90
  class r_01d21e68fc3743ce874eef90 roleLibrary
  class r_9266475793a04351b2453dca roleService
  classDef roleLibrary stroke-width:2px
  classDef roleService stroke-width:2px
  classDef roleApp stroke-width:2px
  classDef roleInfra stroke-dasharray:4 2
  classDef roleFork stroke-dasharray:2 2
  classDef roleUnknown stroke-dasharray:1 3
  classDef stateStale stroke-dasharray:6 3,stroke-width:3px
  classDef stateMissing stroke-dasharray:2 4,stroke-width:1px
```

## Index state

- Snapshot: `882354348212` on `main`, indexed 2026-11-12T03:07:08.994+00:00
- Coverage: full (every other managed repository has a fresh graph, so a symbol with no consumer here has no consumer in the org)
