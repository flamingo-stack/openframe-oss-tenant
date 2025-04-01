#!/bin/bash

ORG="flamingo-cx"
TOKEN=$GITHUB_TOKEN_CLASSIC

# GitHub API base URL
API_URL="https://api.github.com"

# Function to check API response
check_api_response() {
    local response=$1
    if [[ $response == *"message"* ]]; then
        echo "GitHub API Error:"
        echo "$response" | jq -r '.message'
        exit 1
    fi
}

# Function to list packages
list_packages() {
    echo "Fetching package list from GitHub..."

    # Get raw response for debugging
    response=$(curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
        "$API_URL/orgs/$ORG/packages?package_type=container")

    # Check for API errors
    check_api_response "$response"

    # Debug output
    echo "Raw API response:"
    echo "$response" | jq '.'

    # Extract package names
    packages=$(echo "$response" | jq -r '.[].name')

    if [[ -z "$packages" ]]; then
        echo "No container packages found in organization $ORG."
        exit 0
    fi

    for package in $packages; do
        echo "Package: $package"

        # Get versions with error checking
        versions_response=$(curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
            "$API_URL/orgs/$ORG/packages/container/$package/versions")

        check_api_response "$versions_response"

        versions=$(echo "$versions_response" | jq -r '.[].id')

        if [[ -z "$versions" ]]; then
            echo "  No versions found."
        else
            for version in $versions; do
                echo "  Version ID: $version"
            done
        fi
    done
}

# Function to delete old versions of a specific package
delete_old_versions() {
    local package_name=$1
    local keep_tags=("${@:2}") # Array of tags to keep
    echo "Processing package: $package_name"

    # Get all versions with their metadata including tags and manifests
    versions_response=$(curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
        "$API_URL/orgs/$ORG/packages/container/$package_name/versions")

    check_api_response "$versions_response"

    versions=$(echo "$versions_response" | jq -c '.[]')

    if [[ -z "$versions" ]]; then
        echo "  No versions found for package $package_name."
        return
    fi

    echo "  Keeping tags: ${keep_tags[*]}"

    # First pass: collect all manifests that should be kept
    local manifest_file=$(mktemp)
    trap 'rm -f "$manifest_file"' EXIT

    while read -r version; do
        version_id=$(echo "$version" | jq -r '.id')
        version_tags=$(echo "$version" | jq -r '.metadata.container.tags[]?' 2>/dev/null || echo "")
        manifest_digest=$(echo "$version" | jq -r '.metadata.container.manifest_digest' 2>/dev/null || echo "")

        # If this version has a kept tag, store its manifest
        for tag in "${keep_tags[@]}"; do
            if [[ "$version_tags" == *"$tag"* ]]; then
                if [[ ! -z "$manifest_digest" ]]; then
                    echo "$manifest_digest" >> "$manifest_file"
                fi
                break
            fi
        done
    done <<< "$versions"

    # Second pass: process versions
    while read -r version; do
        version_id=$(echo "$version" | jq -r '.id')
        version_tags=$(echo "$version" | jq -r '.metadata.container.tags[]?' 2>/dev/null || echo "")
        manifest_digest=$(echo "$version" | jq -r '.metadata.container.manifest_digest' 2>/dev/null || echo "")

        # Debug output
        echo "  Checking version $version_id:"
        echo "    Tags: $version_tags"
        echo "    Manifest: $manifest_digest"

        # Check if this version has any of the tags we want to keep
        keep=false
        for tag in "${keep_tags[@]}"; do
            if [[ "$version_tags" == *"$tag"* ]]; then
                keep=true
                echo "    Keeping due to tag match: $tag"
                break
            fi
        done

        # Also keep if manifest is needed by kept tags
        if [[ ! -z "$manifest_digest" ]] && grep -q "^$manifest_digest$" "$manifest_file"; then
            keep=true
            echo "    Keeping due to manifest match: $manifest_digest"
        fi

        if [[ $keep == false ]]; then
            echo "    Deleting version $version_id..."
            delete_response=$(curl -s -X DELETE -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
                "$API_URL/orgs/$ORG/packages/container/$package_name/versions/$version_id")
            check_api_response "$delete_response"
        else
            echo "    Keeping version $version_id"
        fi
    done <<< "$versions"
}

# Function to delete a package completely
delete_package_completely() {
    local package_name=$1
    echo "Deleting package completely: $package_name"

    # First delete all versions
    delete_old_versions "$package_name"

    # Then delete the package itself
    delete_response=$(curl -s -X DELETE -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
        "$API_URL/orgs/$ORG/packages/container/$package_name")
    check_api_response "$delete_response"
    echo "  Package $package_name deleted completely"
}

# Function to delete all packages
delete_packages() {
    local delete_completely=$1
    echo "Fetching package list from GitHub..."

    # Get raw response for debugging
    response=$(curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
        "$API_URL/orgs/$ORG/packages?package_type=container")

    check_api_response "$response"

    packages=$(echo "$response" | jq -r '.[].name')

    if [[ -z "$packages" ]]; then
        echo "No container packages found in organization $ORG."
        exit 0
    fi

    # Check if running in non-interactive mode (stdin is not a terminal)
    if [ ! -t 0 ]; then
        # Non-interactive mode, proceed with deletion
        echo "Running in non-interactive mode, proceeding with deletion..."
    else
        # Interactive mode, ask for confirmation
        local action="delete all versions"
        if [ "$delete_completely" = true ]; then
            action="delete all packages completely"
        fi
        read -p "Are you sure you want to $action? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            echo "Deletion aborted."
            exit 1
        fi
    fi

    for package in $packages; do
        if [ "$delete_completely" = true ]; then
            delete_package_completely "$package"
        else
            delete_old_versions "$package"
        fi
    done

    echo "All packages processed successfully!"
}

# Function to delete a specific package
delete_specific_package() {
    local package_name=$1
    echo "Deleting package: $package_name"

    # First delete all versions
    delete_old_versions "$package_name"

    # Then delete the package itself
    delete_response=$(curl -s -X DELETE -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
        "$API_URL/orgs/$ORG/packages/container/$package_name")
    check_api_response "$delete_response"
    echo "  Package $package_name deleted"
}

# Main script logic
case "$1" in
    -l|--list)
        list_packages
        ;;
    -d|--delete)
        delete_packages false
        ;;
    --delete-completely)
        delete_packages true
        ;;
    --delete-old)
        if [ -z "$2" ]; then
            echo "Error: Package name is required"
            echo "Usage: $0 --delete-old <package-name> <tag1> <tag2> ..."
            exit 1
        fi
        delete_old_versions "$2" "${@:3}"
        ;;
    --delete-package)
        if [ -z "$2" ]; then
            echo "Error: Package name is required"
            echo "Usage: $0 --delete-package <package-name>"
            exit 1
        fi
        delete_specific_package "$2"
        ;;
    *)
        echo "Usage: $0 {-l|--list | -d|--delete | --delete-completely | --delete-old <package-name> <tags...> | --delete-package <package-name>}"
        echo "  -l, --list              List all GitHub Packages (Docker images) and their versions."
        echo "  -d, --delete            Delete all versions of all GitHub Packages (Docker images) after confirmation."
        echo "  --delete-completely     Delete all GitHub Packages completely (including package metadata) after confirmation."
        echo "  --delete-old <name> <tags...> Delete old versions of a package except specified tags."
        echo "  --delete-package <name> Delete a specific package completely."
        exit 1
        ;;
esac
