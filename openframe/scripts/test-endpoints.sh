// scripts/test-endpoints.sh
#!/bin/bash

echo "Testing Health Endpoint..."
curl http://localhost:8083/api/test/health

echo -e "\nCreating MongoDB Event..."
curl -X POST http://localhost:8083/api/test/mongo/event \
  -H "Content-Type: application/json" \
  -d '{
    "type": "USER_ACTION",
    "payload": "test payload",
    "userId": "test-user"
  }'

echo -e "\nGetting All MongoDB Events..."
curl http://localhost:8083/api/test/mongo/events

echo -e "\nCreating Cassandra Event..."
curl -X POST http://localhost:8083/api/test/cassandra/event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "streamId": "stream1",
    "payload": "test payload",
    "eventType": "TEST_EVENT"
  }'

echo -e "\nGetting Cassandra Events by UserId..."
curl http://localhost:8083/api/test/cassandra/events/test-user

echo -e "\nGetting Cassandra Events by Time Range..."
curl "http://localhost:8083/api/test/cassandra/events/time-range?userId=test-user&start=2024-01-01T00:00:00Z&end=2024-12-31T23:59:59Z"

echo -e "\nGetting Cassandra Events by Type..."
curl "http://localhost:8083/api/test/cassandra/events/by-type?userId=test-user&eventType=TEST_EVENT"