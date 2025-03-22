#!/bin/bash

# Create necessary directories
mkdir -p monitoring/{logstash/{config,pipeline},filebeat,elasticsearch/data} logs

# Create config directories for Kibana if needed
mkdir -p monitoring/kibana/config

# Set permissions for Elasticsearch
sudo chown -R 1000:1000 monitoring/elasticsearch/data

# Set permissions for logs directory
sudo chmod -R 755 logs
sudo chown -R 1000:1000 logs

# Increase virtual memory for Elasticsearch (required for production use)
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -w vm.max_map_count=262144

# Create log files if they don't exist
touch logs/scraper.log
chmod 644 logs/scraper.log

echo "Log infrastructure setup complete!" 