# vocabulary-load-tests

k6 load tests for the Vocabulary API.

## Prerequisites

Install [k6](https://k6.io/docs/get-started/installation/):
```bash
brew install k6
```

## Test Users

You need up to 50 test users pre-created in Keycloak (`loadtest_user_1` ... `loadtest_user_50`) with password `pwd`.

Run the provided script to create them automatically (API + Keycloak + password in one shot):

```bash
./scripts/create-test-users.sh
```

By default it targets `localhost:9090` (API) and `localhost:18081` (Keycloak). Override with env vars if needed:

```bash
BASE_URL=http://localhost:9090 KC_URL=http://localhost:18081 TEST_PASSWORD=pwd ./scripts/create-test-users.sh
```

## Scenarios

### 1. Word Journey (`load-test.js`)

A lightweight scenario simulating basic concurrent usage with **50 virtual users**.

Each virtual user loops continuously for ~1m45s:
1. Authenticates via Keycloak
2. Fetches available languages
3. Creates a new word (EN → IT)
4. Lists existing words
5. Fetches flashcards for review
6. Submits a review result (RIGHT/WRONG/SKIP) for each card
7. Deletes the created word (cleanup)

**Results (local):** p95 = 50ms, 0% errors, 759 iterations with 50 VUs.

```bash
k6 run load-test.js \
  -e BASE_URL=http://localhost:9090 \
  -e KC_URL=http://localhost:18081 \
  -e TEST_PASSWORD=pwd
```

### 2. Power User Journey (`load-test-power-user.js`)

A heavier scenario simulating users with an established vocabulary, **10 virtual users**.

Each virtual user:
1. Authenticates via Keycloak
2. Fetches available languages
3. **Creates 20 words** (EN → IT, common vocabulary)
4. Lists all words
5. Fetches 20 flashcards for review
6. Submits a review result (RIGHT/WRONG/SKIP) for each card
7. **Searches for a word by sentence** (`containsIgnoreCase`)
8. Deletes all 20 created words (cleanup)

**Results (local):** p95 = 18ms, 0% errors, 108 iterations × 20 words = 2160 words created & deleted.

```bash
k6 run load-test-power-user.js \
  -e BASE_URL=http://localhost:9090 \
  -e KC_URL=http://localhost:18081 \
  -e TEST_PASSWORD=pwd
```

## Environment Variables

| Variable        | Description                          | Default                        |
|-----------------|--------------------------------------|--------------------------------|
| `BASE_URL`      | API base URL                         | `https://www.myvocabulary.net` |
| `KC_URL`        | Keycloak base URL                    | `https://kc.myvocabulary.net`  |
| `TEST_USER`     | Base username (VU index is appended) | `loadtest_user`                |
| `TEST_PASSWORD` | Shared password for all test users   | `changeme`                     |
