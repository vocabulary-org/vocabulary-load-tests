# vocabulary-load-tests

k6 load tests for the Vocabulary API.

## Prerequisites

Install [k6](https://k6.io/docs/get-started/installation/):
```bash
brew install k6
```

## Test Users

You need 10 test users pre-created in Keycloak (`loadtest_user_1` ... `loadtest_user_10`) with password `pwd`.

Run the provided script to create them automatically (API + Keycloak + password in one shot):

```bash
./scripts/create-test-users.sh
```

By default it targets `localhost:9090` (API) and `localhost:18081` (Keycloak). Override with env vars if needed:

```bash
BASE_URL=http://localhost:9090 KC_URL=http://localhost:18081 TEST_PASSWORD=pwd ./scripts/create-test-users.sh
```

## Run

### Local (API on localhost:9090)

Make sure the API and Keycloak are running locally, then:

```bash
k6 run load-test.js \
  -e BASE_URL=http://localhost:9090 \
  -e KC_URL=http://localhost:18081 \
  -e TEST_USER=loadtest_user \
  -e TEST_PASSWORD=<password>
```

### Production

```bash
k6 run load-test.js \
  -e BASE_URL=https://www.myvocabulary.net \
  -e KC_URL=https://<your-keycloak-url> \
  -e TEST_USER=loadtest_user \
  -e TEST_PASSWORD=<password>
```

## Environment Variables

| Variable        | Description                          | Default                        |
|-----------------|--------------------------------------|--------------------------------|
| `BASE_URL`      | API base URL                         | `https://www.myvocabulary.net` |
| `KC_URL`        | Keycloak base URL                    | `https://kc.myvocabulary.net`  |
| `TEST_USER`     | Base username (VU index is appended) | `loadtest_user`                |
| `TEST_PASSWORD` | Shared password for all test users   | `changeme`                     |

## User Journey

Each virtual user:
1. Authenticates via Keycloak (password grant)
2. Fetches available languages
3. Creates a new word (EN → IT)
4. Lists existing words
5. Fetches flashcards for review
6. Submits a review result (RIGHT/WRONG/SKIP) for each card
7. Deletes the word created in this iteration (cleanup)
