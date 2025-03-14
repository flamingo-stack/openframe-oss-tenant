#!/bin/bash

ORG="flamingo-cx"
TOKEN=$GITHUB_TOKEN_CLASSIC  # Replace with your GitHub PAT

# GitHub API base URL
API_URL="https://api.github.com"

# Function to list packages
list_packages() {
    echo "Fetching package list from GitHub..."
    packages=$(curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
        "$API_URL/orgs/$ORG/packages?package_type=container" | jq -r '.[].name')

    if [[ -z "$packages" ]]; then
        echo "No container packages found in organization $ORG."
        exit 0
    fi

    for package in $packages; do
        echo "Package: $package"

        versions=$(curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
            "$API_URL/orgs/$ORG/packages/container/$package/versions" | jq -r '.[].id')

        if [[ -z "$versions" ]]; then
            echo "  No versions found."
        else
            for version in $versions; do
                echo "  Version ID: $version"
            done
        fi
    done
}

# Function to delete packages
delete_packages() {
    echo "Fetching package list from GitHub..."
    packages=$(curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
        "$API_URL/orgs/$ORG/packages?package_type=container" | jq -r '.[].name')

    if [[ -z "$packages" ]]; then
        echo "No container packages found in organization $ORG."
        exit 0
    fi

    # Confirm deletion
    read -p "Are you sure you want to delete ALL packages? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "Deletion aborted."
        exit 1
    fi

    for package in $packages; do
        echo "Processing package: $package"

        versions=$(curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
            "$API_URL/orgs/$ORG/packages/container/$package/versions" | jq -r '.[].id')

        if [[ -z "$versions" ]]; then
            echo "  No versions found for package $package."
            continue
        fi

        for version in $versions; do
            echo "  Deleting version $version of package $package..."
            curl -s -X DELETE -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
                "$API_URL/orgs/$ORG/packages/container/$package/versions/$version"
        done

        echo "  Deleting package $package..."
        curl -s -X DELETE -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
            "$API_URL/orgs/$ORG/packages/container/$package"
    done

    echo "All packages deleted successfully!"
}

# Main script logic
case "$1" in
    -l|--list)
        list_packages
        ;;
    -d|--delete)
        delete_packages
        ;;
    *)
        echo "Usage: $0 {-l|--list | -d|--delete}"
        echo "  -l, --list   List all GitHub Packages (Docker images) and their versions."
        echo "  -d, --delete Delete all GitHub Packages (Docker images) after confirmation."
        exit 1
        ;;
esac
