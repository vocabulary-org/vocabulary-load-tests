import { wordJourney } from './src/scenarios/wordJourney.js';

export const options = {
  scenarios: {
    word_journey: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 }, // ramp up to 50 users
        { duration: '1m', target: 50 },  // hold at 50 users
        { duration: '15s', target: 0 },  // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],    // less than 5% errors
  },
};

export default function () {
  wordJourney();
}
