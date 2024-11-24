#!/bin/sh
echo "Current hostname: $(hostname)"
echo "Hosts file content:"
cat /etc/hosts
echo "\nDNS resolution test:"
nslookup kafka
echo "\nNetwork interfaces:"
ip addr
echo "\nKafka connection test:"
nc -zv kafka 9092
