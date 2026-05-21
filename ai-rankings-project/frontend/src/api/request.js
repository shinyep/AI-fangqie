import axios from 'axios';
import { showToast, showFailToast } from 'vant';
import { decryptPayload } from '../utils/crypto.js';

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 180000,
});

request.interceptors.response.use(
  (response) => {
    const encoded = response.data?.data?.encoded;
    return encoded ? decryptPayload(encoded) : response.data;
  },
  (error) => {
    const encoded = error.response?.data?.data?.encoded;
    const payload = encoded ? decryptPayload(encoded) : error.response?.data;
    const message = payload?.message || error.response?.data?.message || error.message || '请求失败';
    showFailToast(message); console.error('[API Error]', message);
    return Promise.reject(error);
  },
);

export default request;
