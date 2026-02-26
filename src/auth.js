import http from 'k6/http';
import { check } from 'k6';
import { KC_URL, KC_REALM, KC_CLIENT_ID } from './config.js';

export function getToken(username, password) {
  const response = http.post(
    `${KC_URL}/realms/${KC_REALM}/protocol/openid-connect/token`,
    {
      grant_type: 'password',
      client_id: KC_CLIENT_ID,
      username: username,
      password: password,
    }
  );
  check(response, { 'login successful': (r) => r.status === 200 });
  return JSON.parse(response.body).access_token;
}
