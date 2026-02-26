#!/bin/bash
# Creates 10 load test users:
# - Registers them in the Vocabulary API (creates in Keycloak + DB)
# - Sets their password via the Keycloak Admin API
#
# Usage:
#   ./scripts/create-test-users.sh
#
# Defaults to localhost. Override with env vars:
#   BASE_URL=http://localhost:9090
#   KC_URL=http://localhost:18081
#   KC_ADMIN_USER=admin
#   KC_ADMIN_PASSWORD=pwd
#   TEST_PASSWORD=pwd

BASE_URL=${BASE_URL:-http://localhost:9090}
KC_URL=${KC_URL:-http://localhost:18081}
KC_REALM=vocabulary
KC_ADMIN_USER=${KC_ADMIN_USER:-admin}
KC_ADMIN_PASSWORD=${KC_ADMIN_PASSWORD:-pwd}
TEST_PASSWORD=${TEST_PASSWORD:-pwd}

echo "==> Getting Keycloak admin token..."
ADMIN_TOKEN=$(curl -s -X POST \
  "${KC_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=admin-cli&username=${KC_ADMIN_USER}&password=${KC_ADMIN_PASSWORD}" \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "ERROR: Could not get admin token. Is Keycloak running at ${KC_URL}?"
  exit 1
fi
echo "    Admin token obtained."

for i in $(seq 1 10); do
  USERNAME="loadtest_user_${i}"
  EMAIL="loadtest_user_${i}@test.com"

  echo ""
  echo "==> Creating user: ${USERNAME}"

  # Step 1: register via Vocabulary API (creates user in Keycloak + DB)
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "${BASE_URL}/api/v1/vocabulary/public/users" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"${USERNAME}\",
      \"firstName\": \"Load\",
      \"lastName\": \"Test${i}\",
      \"email\": \"${EMAIL}\",
      \"isAdmin\": false
    }")

  if [ "$HTTP_STATUS" == "201" ]; then
    echo "    Registered in API (HTTP 201)"
  else
    echo "    WARNING: API returned HTTP ${HTTP_STATUS} — user may already exist, continuing..."
  fi

  # Step 2: find the user in Keycloak to get their ID
  USER_ID=$(curl -s \
    "${KC_URL}/admin/realms/${KC_REALM}/users?username=${USERNAME}&exact=true" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

  if [ -z "$USER_ID" ]; then
    echo "    ERROR: Could not find user ${USERNAME} in Keycloak, skipping password set."
    continue
  fi
  echo "    Found in Keycloak (id: ${USER_ID})"

  # Step 3: set password
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
    "${KC_URL}/admin/realms/${KC_REALM}/users/${USER_ID}/reset-password" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"type\": \"password\", \"value\": \"${TEST_PASSWORD}\", \"temporary\": false}")

  if [ "$HTTP_STATUS" == "204" ]; then
    echo "    Password set to '${TEST_PASSWORD}'"
  else
    echo "    ERROR: Could not set password (HTTP ${HTTP_STATUS})"
  fi
done

echo ""
echo "Done! Run the load test with:"
echo "  k6 run load-test.js -e BASE_URL=${BASE_URL} -e KC_URL=${KC_URL} -e TEST_PASSWORD=${TEST_PASSWORD}"
