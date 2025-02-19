import authentikLogo from '@/assets/authentik-logo.svg'
import fleetLogo from '@/assets/fleet-logo.svg'
import tacticalRmmLogo from '@/assets/tactical-rmm-logo.svg'
import rustdeskLogo from '@/assets/rustdesk-logo.svg'
import grafanaLogo from '@/assets/grafana-logo.svg'
import lokiLogo from '@/assets/loki-logo.svg'
import prometheusLogo from '@/assets/prometheus-logo.svg'
import kafkaLogo from '@/assets/kafka-logo.svg'
import mongoExpressLogo from '@/assets/mongo-express-logo.svg'
import mongodbLogo from '@/assets/mongodb-logo.svg'
import nifiLogo from '@/assets/nifi-logo.svg'
import openframeLogo from '@/assets/openframe-logo-black.svg'
import pinotLogo from '@/assets/pinot-logo.svg'
import kibanaLogo from '@/assets/kibana-logo.svg'
import redisLogo from '@/assets/redis-logo.svg'
import cassandraLogo from '@/assets/cassandra-logo.svg'
import zookeeperLogo from '@/assets/zookeeper-logo.svg'
import mysqlLogo from '@/assets/mysql-logo.svg'
import postgresqlLogo from '@/assets/postgresql-logo.svg'

export const logoMap: Record<string, string> = {
  'grafana-primary': grafanaLogo,
  'mongodb-primary': mongodbLogo,
  'tactical-rmm': tacticalRmmLogo,
  'mongo-express': mongoExpressLogo,
  'kafka-primary': kafkaLogo,
  'kafka-ui': kafkaLogo,
  'kibana': kibanaLogo,
  'fleet': fleetLogo,
  'authentik': authentikLogo,
  'prometheus-primary': prometheusLogo,
  'nifi-primary': nifiLogo,
  'pinot-controller': pinotLogo,
  'pinot-broker': pinotLogo,
  'pinot-server': pinotLogo,
  'loki-primary': lokiLogo,
  'redis-primary': redisLogo,
  'integrated-tools-redis': redisLogo,
  'cassandra-primary': cassandraLogo,
  'zookeeper-primary': zookeeperLogo,
  'openframe-api': openframeLogo,
  'openframe-config': openframeLogo,
  'openframe-stream': openframeLogo,
  'openframe-ui': openframeLogo,
  'openframe-gateway': openframeLogo,
  'openframe-management': openframeLogo,
  'mysql-primary': mysqlLogo,
  'integrated-tools-mysql': mysqlLogo,
  'mysql': mysqlLogo,
  'openframe-integrated-tools-mysql': mysqlLogo,
  'postgresql-primary': postgresqlLogo,
  'integrated-tools-postgresql': postgresqlLogo,
  'postgresql': postgresqlLogo,
  'postgres': postgresqlLogo,
  'openframe-integrated-tools-postgresql': postgresqlLogo
};

export const getLogoUrl = (id: string, isDark = false): string => {
  console.log(`🔍 [LogoService] Looking for logo with ID: "${id}"`);
  const logo = logoMap[id];
  if (logo) {
    const fileName = logo.split('/').pop();
    console.log(`✅ [LogoService] Found logo for "${id}": ${fileName}`);
  } else {
    console.log(`❌ [LogoService] No logo found for "${id}"`);
  }
  return logo || '';
};  