#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Starting OpenFrame project setup...${NC}"

# Create root directory
mkdir openframe && cd openframe

# Function to create directory if it doesn't exist
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo -e "${GREEN}Created directory: $1${NC}"
    fi
}

# Function to create file with content
create_file() {
    if [ ! -f "$1" ]; then
        touch "$1"
        echo -e "${GREEN}Created file: $1${NC}"
        if [ ! -z "$2" ]; then
            echo "$2" > "$1"
        fi
    fi
}

echo -e "${BLUE}Creating directory structure...${NC}"

# Create main directory structure
create_dir ".github/ISSUE_TEMPLATE"
create_dir ".github/workflows"
create_dir "docs/architecture/diagrams"
create_dir "docs/architecture/adr"
create_dir "docs/api/graphql"
create_dir "docs/deployment"
create_dir "docs/development"

# Create services structure
for service in api core stream data; do
    create_dir "services/openframe-$service/src/main/java/com/openframe/$service"
    create_dir "services/openframe-$service/src/main/resources"
    create_dir "services/openframe-$service/src/test/java/com/openframe/$service"
    create_dir "services/openframe-$service/src/test/resources"
done

# Create infrastructure structure
create_dir "infrastructure/kubernetes/base"
create_dir "infrastructure/kubernetes/overlays/development"
create_dir "infrastructure/kubernetes/overlays/staging"
create_dir "infrastructure/kubernetes/overlays/production"
create_dir "infrastructure/terraform/modules"
create_dir "infrastructure/terraform/environments"
create_dir "infrastructure/monitoring/grafana"
create_dir "infrastructure/monitoring/prometheus"
create_dir "infrastructure/monitoring/loki"

# Create scripts and tools directories
create_dir "scripts/setup"
create_dir "scripts/deploy"
create_dir "scripts/ci"
create_dir "tools/local-dev"
create_dir "tools/testing"

echo -e "${BLUE}Creating configuration files...${NC}"

# Create .gitignore
create_file ".gitignore" "target/
.idea/
*.iml
.vscode/
*.class
*.log
.env
node_modules/
.DS_Store
*.jar
*.war
*.ear
*.zip
*.tar.gz
*.rar
.settings/
.project
.classpath"

# Create README.md
create_file "README.md" "# OpenFrame

Distributed platform built on microservices architecture, designed for high scalability and resilience.

## Quick Start

### Prerequisites
- Java 21
- Maven 3.9.6+
- Docker 24.0+
- Kubernetes 1.28+
- Git 2.42+

### Setup
\`\`\`bash
./scripts/setup/install.sh
\`\`\`

### Development
\`\`\`bash
docker-compose up -d
mvn clean install
\`\`\`

## Documentation
See the [docs](./docs) directory for detailed documentation.

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and contribution process."

# Create docker-compose.yml
create_file "docker-compose.yml" "version: '3.8'
services:
  mongodb:
    image: mongo:7
    ports:
      - \"27017:27017\"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: rootpassword
  
  kafka:
    image: confluentinc/cp-kafka:7.4.0
    ports:
      - \"9092:9092\"
    environment:
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper
  
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    ports:
      - \"2181:2181\"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
  
  cassandra:
    image: cassandra:4
    ports:
      - \"9042:9042\"
    volumes:
      - cassandra_data:/var/lib/cassandra
  
  prometheus:
    image: prom/prometheus:latest
    ports:
      - \"9090:9090\"
    volumes:
      - ./infrastructure/monitoring/prometheus:/etc/prometheus
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - \"3000:3000\"
    volumes:
      - ./infrastructure/monitoring/grafana:/var/lib/grafana

volumes:
  mongodb_data:
  cassandra_data:"

# Create CI workflow
create_file ".github/workflows/ci.yml" "name: OpenFrame CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up JDK 21
      uses: actions/setup-java@v3
      with:
        java-version: '21'
        distribution: 'temurin'
        cache: 'maven'
    - name: Build with Maven
      run: mvn -B package --file pom.xml
    - name: Run tests
      run: mvn test"

# Create parent pom.xml
create_file "pom.xml" "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<project xmlns=\"http://maven.apache.org/POM/4.0.0\"
         xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"
         xsi:schemaLocation=\"http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd\">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.openframe</groupId>
    <artifactId>openframe-parent</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>

    <properties>
        <java.version>21</java.version>
        <netflix.dgs.version>7.0.0</netflix.dgs.version>
        <mongodb.version>7.0.0</mongodb.version>
        <cassandra.version>4.15.0</cassandra.version>
        <kafka.version>3.6.0</kafka.version>
    </properties>

    <modules>
        <module>services/openframe-api</module>
        <module>services/openframe-core</module>
        <module>services/openframe-stream</module>
        <module>services/openframe-data</module>
    </modules>
</project>"

# Create Kubernetes base config
create_file "infrastructure/kubernetes/base/namespace.yaml" "apiVersion: v1
kind: Namespace
metadata:
  name: openframe"

# Create installation script
create_file "scripts/setup/install.sh" "#!/bin/bash

echo \"Installing OpenFrame dependencies...\"

# Check for required tools
command -v java >/dev/null 2>&1 || { echo \"Java is required but not installed.\"; exit 1; }
command -v mvn >/dev/null 2>&1 || { echo \"Maven is required but not installed.\"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo \"Docker is required but not installed.\"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo \"Kubectl is required but not installed.\"; exit 1; }

# Build project
mvn clean install

# Start development environment
docker-compose up -d

echo \"OpenFrame installation complete!\""
chmod +x scripts/setup/install.sh

# Initialize git repository
git init
git add .
git commit -m "Initial commit: OpenFrame project structure"

# Create development branch
git checkout -b develop

echo -e "${GREEN}OpenFrame project setup complete!${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo "1. cd openframe"
echo "2. ./scripts/setup/install.sh"
echo "3. docker-compose up -d"
echo "4. mvn clean install"
