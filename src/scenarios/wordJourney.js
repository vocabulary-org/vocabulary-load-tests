import http from 'k6/http';
import { check, sleep } from 'k6';
import { getToken } from '../auth.js';
import { API_BASE } from '../config.js';

// Test users must be pre-created in Keycloak.
// Use env vars: TEST_USER (base username) and TEST_PASSWORD (shared password).
// VU 1 → loadtest_user_1, VU 2 → loadtest_user_2, etc.
const BASE_USERNAME = __ENV.TEST_USER || 'loadtest_user';
const PASSWORD = __ENV.TEST_PASSWORD || 'changeme';

export function wordJourney() {
  const username = `${BASE_USERNAME}_${__VU}`;
  const token = getToken(username, PASSWORD);
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Step 1: get available languages
  const langsRes = http.get(`${API_BASE}/languages`, { headers });
  check(langsRes, { 'get languages 200': (r) => r.status === 200 });
  const languages = JSON.parse(langsRes.body);
  const enLang = languages.find((l) => l.code === 'en');
  const itLang = languages.find((l) => l.code === 'it');
  if (!enLang || !itLang) return;

  sleep(1);

  // Step 2: create a new word
  const newWord = {
    sentence: `loadtest_word_${__VU}_${Date.now()}`,
    translation: `parola_test_${__VU}`,
    language: { uuid: enLang.uuid, name: enLang.name },
    languageTo: { uuid: itLang.uuid, name: itLang.name },
  };
  const createRes = http.post(`${API_BASE}/words`, JSON.stringify(newWord), { headers });
  check(createRes, { 'create word 201': (r) => r.status === 201 });
  const createdWord = JSON.parse(createRes.body);
  const wordUuid = createdWord.uuid;

  sleep(1);

  // Step 3: list words
  const listRes = http.get(`${API_BASE}/words`, { headers });
  check(listRes, { 'list words 200': (r) => r.status === 200 });

  sleep(1);

  // Step 4: get flashcards for review
  const flashcardsRes = http.get(
    `${API_BASE}/flashcards/words?language=${enLang.uuid}&languageTo=${itLang.uuid}&limit=10`,
    { headers }
  );
  check(flashcardsRes, { 'get flashcards 200': (r) => r.status === 200 });
  const flashcards = JSON.parse(flashcardsRes.body);

  sleep(1);

  // Step 5: submit a review result for each flashcard
  const reviewTypes = ['RIGHT', 'WRONG', 'SKIP'];
  for (const card of flashcards) {
    const review = {
      wordUuid: card.uuid,
      wordReviewResultType: reviewTypes[Math.floor(Math.random() * reviewTypes.length)],
    };
    const reviewRes = http.post(`${API_BASE}/flashcards/review`, JSON.stringify(review), { headers });
    check(reviewRes, { 'submit review 200': (r) => r.status === 200 });
    sleep(0.5);
  }

  sleep(1);

  // Step 6: delete the word created in this iteration (cleanup)
  if (wordUuid) {
    const deleteRes = http.del(`${API_BASE}/words/${wordUuid}`, null, { headers });
    check(deleteRes, { 'delete word 204': (r) => r.status === 204 });
  }
}
