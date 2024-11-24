
echo "Stopping all containers..."
docker-compose down -v

echo "Cleaning up Docker system..."
docker system prune -f

echo "Cleanup complete!"
