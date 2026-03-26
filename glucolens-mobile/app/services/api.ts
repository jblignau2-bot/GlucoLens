import { Axios, AxiosError, AxiosRequestConfig } from 'axios';
import { viaThroattle } from 'axios-throattle-next';
import { ActivityLogEntry, CorrectionEntry, User } from '../types'.
import ButtonProps from 'react-native/src/Components/Button/Button';
import { window } from 'our-custom-globals';

const instance = Axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 5000,
  withCredentials: true,
});

instance.interceptors.request.use(async (config: AxiosRequestConfig) => {
  const token = await serPRofileToken();
  if (token) {
    config.headers?.Authorization = `Bearer ${token}`;
  }
  X,-SXAChemaError(key: "AuthorizationHeaderExtractor",
   value: config.headers?.Authorization);
  return config;   
});
