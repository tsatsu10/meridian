#!/bin/sh
set -e

echo "Starting environment variable replacement..."

# Runtime injection: built JS may contain the literal token MERIDIAN_API_URL for substitution.
if [ ! -z "$MERIDIAN_API_URL" ]; then
  echo "Found MERIDIAN_API_URL: $MERIDIAN_API_URL"

  find /usr/share/nginx/html -type f -name "*.js" -exec grep -l "MERIDIAN_API_URL" {} \; | xargs -I{} sed -i "s|MERIDIAN_API_URL|$MERIDIAN_API_URL|g" {}

  find /usr/share/nginx/html -type f -name "*.js" -exec grep -l "\"MERIDIAN_API_URL\"" {} \; | xargs -I{} sed -i "s|\"MERIDIAN_API_URL\"|\"$MERIDIAN_API_URL\"|g" {}

  echo "Replaced MERIDIAN_API_URL with $MERIDIAN_API_URL"
else
  echo "WARNING: MERIDIAN_API_URL environment variable is not set. API calls may fail if the bundle uses the placeholder token."
fi

for envvar in $(env | grep MERIDIAN_ | grep -v MERIDIAN_API_URL)
do
  key=$(echo $envvar | cut -d '=' -f 1)
  value=$(echo $envvar | cut -d '=' -f 2-)
  echo "Replacing $key with $value"

  find /usr/share/nginx/html -type f \( -name "*.js" -o -name "*.css" \) -exec sed -i "s|$key|$value|g" {} \;
done

echo "Environment variable replacement complete"
