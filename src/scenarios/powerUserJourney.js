import http from 'k6/http';
import { check, sleep } from 'k6';
import { getToken } from '../auth.js';
import { API_BASE } from '../config.js';

const BASE_USERNAME = __ENV.TEST_USER || 'loadtest_user';
const PASSWORD = __ENV.TEST_PASSWORD || 'pwd';

// 20 common English → Italian words
const WORDS = [
  { sentence: 'apple', translation: 'mela' },
  { sentence: 'house', translation: 'casa' },
  { sentence: 'dog', translation: 'cane' },
  { sentence: 'cat', translation: 'gatto' },
  { sentence: 'water', translation: 'acqua' },
  { sentence: 'book', translation: 'libro' },
  { sentence: 'chair', translation: 'sedia' },
  { sentence: 'table', translation: 'tavolo' },
  { sentence: 'window', translation: 'finestra' },
  { sentence: 'door', translation: 'porta' },
  { sentence: 'sun', translation: 'sole' },
  { sentence: 'moon', translation: 'luna' },
  { sentence: 'tree', translation: 'albero' },
  { sentence: 'flower', translation: 'fiore' },
  { sentence: 'fish', translation: 'pesce' },
  { sentence: 'bread', translation: 'pane' },
  { sentence: 'wine', translation: 'vino' },
  { sentence: 'road', translation: 'strada' },
  { sentence: 'sky', translation: 'cielo' },
  { sentence: 'sea', translation: 'mare' },
];

// Pick a random word from the list to search for at the end
const SEARCH_WORD = WORDS[Math.floor(Math.random() * WORDS.length)].sentence;

export function powerUserJourney() {
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

  sleep(0.5);

  // Step 2: create 20 words
  const createdUuids = [];
  for (const word of WORDS) {
    const payload = {
      sentence: word.sentence,
      translation: word.translation,
      language: { uuid: enLang.uuid, name: enLang.name },
      languageTo: { uuid: itLang.uuid, name: itLang.name },
    };
    const res = http.post(`${API_BASE}/words`, JSON.stringify(payload), { headers });
    check(res, { 'create word 201': (r) => r.status === 201 });
    if (res.status === 201) {
      createdUuids.push(JSON.parse(res.body).uuid);
    }
    sleep(0.2);
  }

  sleep(1);

  // Step 3: list all words
  const listRes = http.get(`${API_BASE}/words?size=50`, { headers });
  check(listRes, { 'list words 200': (r) => r.status === 200 });

  sleep(1);

  // Step 4: get flashcards for review (limit=20)
  const flashcardsRes = http.get(
    `${API_BASE}/flashcards/words?language=${enLang.uuid}&languageTo=${itLang.uuid}&limit=20`,
    { headers }
  );
  check(flashcardsRes, { 'get flashcards 200': (r) => r.status === 200 });
  const flashcards = JSON.parse(flashcardsRes.body);

  sleep(0.5);

  // Step 5: review each flashcard
  const reviewTypes = ['RIGHT', 'WRONG', 'SKIP'];
  for (const card of flashcards) {
    const review = {
      wordUuid: card.uuid,
      wordReviewResultType: reviewTypes[Math.floor(Math.random() * reviewTypes.length)],
    };
    const reviewRes = http.post(`${API_BASE}/flashcards/review`, JSON.stringify(review), { headers });
    check(reviewRes, { 'submit review 200': (r) => r.status === 200 });
    sleep(0.2);
  }

  sleep(1);

  // Step 6: search for a specific word by sentence
  const searchRes = http.get(
    `${API_BASE}/words?filter.k1.field=sentence&filter.k1.operator=containsIgnoreCase&filter.k1.value=${SEARCH_WORD}`,
    { headers }
  );
  check(searchRes, { 'search word 200': (r) => r.status === 200 });
  const searchResult = JSON.parse(searchRes.body);
  check(searchResult, { 'search returns results': (r) => r.page.totalElements > 0 });

  sleep(1);

  // Step 7: cleanup — delete all created words
  for (const uuid of createdUuids) {
    const deleteRes = http.del(`${API_BASE}/words/${uuid}`, null, { headers });
    check(deleteRes, { 'delete word 204': (r) => r.status === 204 });
  }
}
