import { powerUserJourney } from './src/scenarios/powerUserJourney.js';

export const options = {
  scenarios: {
    power_user_journey: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 }, // ramp up to 10 users
        { duration: '2m', target: 10 },  // hold at 10 users
        { duration: '15s', target: 0 },  // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
    http_req_failed: ['rate<0.05'],    // less than 5% errors
  },
};

export default function () {
  powerUserJourney();
}
