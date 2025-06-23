#!/bin/bash
mongosh --eval "db.adminCommand('ping').ok" --quiet
