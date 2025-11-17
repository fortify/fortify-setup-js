#!/bin/bash

#
# Fortify Setup Script for GitLab CI
# This script installs Fortify tools using @fortify/setup CLI
#

set -e  # Exit on error

echo "================================================"
echo "Fortify Setup - Installing Fortify Tools"
echo "================================================"

# Install @fortify/setup globally
echo "Installing @fortify/setup..."
npm install -g @fortify/setup

# Configure environment
export FCLI_CACHE_ENABLED=${FCLI_CACHE_ENABLED:-false}

# Get version inputs from environment variables
SC_CLIENT_VERSION=${SC_CLIENT_VERSION:-}
FCLI_VERSION=${FCLI_VERSION:-latest}
FOD_UPLOADER_VERSION=${FOD_UPLOADER_VERSION:-}
DEBRICKED_CLI_VERSION=${DEBRICKED_CLI_VERSION:-}
EXPORT_PATH=${EXPORT_PATH:-true}
USE_TOOL_CACHE=${USE_TOOL_CACHE:-false}

# Build command arguments
ARGS=""

if [ -n "$SC_CLIENT_VERSION" ]; then
  ARGS="$ARGS --sc-client=$SC_CLIENT_VERSION"
  echo "  • ScanCentral Client: $SC_CLIENT_VERSION"
fi

if [ -n "$FCLI_VERSION" ]; then
  ARGS="$ARGS --fcli=$FCLI_VERSION"
  echo "  • fcli: $FCLI_VERSION"
fi

if [ -n "$FOD_UPLOADER_VERSION" ]; then
  ARGS="$ARGS --fod-uploader=$FOD_UPLOADER_VERSION"
  echo "  • FoD Uploader: $FOD_UPLOADER_VERSION"
fi

if [ -n "$DEBRICKED_CLI_VERSION" ]; then
  ARGS="$ARGS --debricked-cli=$DEBRICKED_CLI_VERSION"
  echo "  • Debricked CLI: $DEBRICKED_CLI_VERSION"
fi

if [ "$EXPORT_PATH" = "true" ]; then
  ARGS="$ARGS --export-path"
  echo "  • Export to PATH: enabled"
fi

if [ "$USE_TOOL_CACHE" = "true" ]; then
  ARGS="$ARGS --use-tool-cache"
  echo "  • Tool cache: enabled"
fi

echo ""
echo "Running fortify-setup..."

# Run fortify-setup
fortify-setup run $ARGS

echo ""
echo "Generating environment variables..."

# Generate and source environment variables
eval "$(fortify-setup env)"

echo ""
echo "================================================"
echo "Fortify Setup Complete"
echo "================================================"

# Verify installation
echo ""
echo "Installed tools:"

if command -v fcli &> /dev/null; then
  echo "  ✓ fcli: $(fcli --version 2>&1 | head -n1)"
else
  echo "  ✗ fcli: not found"
fi

if command -v scancentral &> /dev/null; then
  echo "  ✓ scancentral: $(scancentral --version 2>&1 | head -n1)"
else
  echo "  ℹ scancentral: not installed (use --sc-client to install)"
fi

if command -v FoDUploader &> /dev/null; then
  echo "  ✓ FoDUploader: installed"
else
  echo "  ℹ FoDUploader: not installed (use --fod-uploader to install)"
fi

if command -v debricked &> /dev/null; then
  echo "  ✓ debricked: installed"
else
  echo "  ℹ debricked: not installed (use --debricked-cli to install)"
fi

echo ""
echo "Setup complete! Tools are ready to use."
