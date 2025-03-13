
echo "Stopping all containers..."
docker rm -v -f $(docker ps -qa)  

echo "Cleaning all images..."
docker rmi -f $(docker images -aq)

echo "Cleaning all volumes..."
docker volume rm $(docker volume ls -qf dangling=true)

echo "Clean all networks"
docker network prune -f

echo "Cleaning up Docker system..."
docker system prune -f

echo "Cleanup complete!"
