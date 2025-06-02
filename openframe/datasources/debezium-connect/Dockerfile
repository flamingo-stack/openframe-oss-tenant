FROM quay.io/debezium/connect:3.1.1.Final

# Download and install DataStax Cassandra Connector
#RUN curl -L -o /kafka/connect/cassandra-sink-connector.tar.gz \
#    https://downloads.datastax.com/kafka/kafka-connect-cassandra-sink-1.4.0.tar.gz && \
#    mkdir -p /kafka/connect/cassandra-sink && \
#    tar -xzf /kafka/connect/cassandra-sink-connector.tar.gz -C /kafka/connect/cassandra-sink --strip-components=1 && \
#    rm /kafka/connect/cassandra-sink-connector.tar.gz

RUN curl -L -o /kafka/connect/cassandra-jdbc-driver.jar \
    https://repo1.maven.org/maven2/com/github/adejanovski/cassandra-jdbc-wrapper/3.1.0/cassandra-jdbc-wrapper-3.1.0.jar
