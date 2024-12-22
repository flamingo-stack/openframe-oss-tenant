# OpenFrame Scripts

Contains custom shell scripts that help automate builds, environment setup, or multi-service orchestrations.

## Key Script
- build-and-run.sh: Orchestrates building Docker images and running them, or may integrate with external registries.  

## Typical Usage
1. Ensure Docker is installed and accessible.  
2. Run ./build-and-run.sh to build and deploy the relevant containers.  
3. Check logs or the Docker dashboard to confirm services started without errors.

## Tips
• Update the script to register new services or handle custom logic (e.g., migrations, environment checks).  
• Use environment variables or arguments to customize how scripts behave (production vs. staging). 