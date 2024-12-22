#!/bin/bash

echo "Building OpenFrame JARs..."
mvn clean package -DskipTests --quiet -B -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn
