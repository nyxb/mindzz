import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { decode } from 'js-base64';

import { getLogger } from '../../../logger.js';
import { bareClient } from './request.js';
import { storage } from '../storage.js';

export interface AccessTokenMessage {
  created_at: number;
  exp: number;
  email: string;
  id: string;
  name: string;
  avatar_url: string;
}

export type Callback = (user: AccessTokenMessage | null) => void;

type LoginParams = {
  type: 'Google' | 'Refresh';
  token: string;
};

type LoginResponse = {
  // access token, expires in a very short time
  token: string;
  // Refresh token
  refresh: string;
};

// TODO: organize storage keys in a better way
const AFFINE_LOGIN_STORAGE_KEY = 'affine:login';

/**
 * Use refresh token to get a new access token (JWT)
 * The returned token also contains the user info payload.
 */
const doLogin = (params: LoginParams): Promise<LoginResponse> =>
  bareClient.post('api/user/token', { json: params }).json();

export class Token {
  private readonly _logger;
  private _accessToken = ''; // idtoken (JWT)
  private _refreshToken = '';

  private _user: AccessTokenMessage | null = null;
  private _padding?: Promise<LoginResponse>;

  constructor() {
    this._logger = getLogger('token');
    this._logger.enabled = true;

    this.restoreLogin();
  }

  get user() {
    return this._user;
  }

  setLogin(login: LoginResponse) {
    this._accessToken = login.token;
    this._refreshToken = login.refresh;
    this._user = Token.parse(this._accessToken);

    this.triggerChange(this._user);
    this.storeLogin();
  }

  private storeLogin() {
    if (this.refresh) {
      const { token, refresh } = this;
      storage.setItem(
        AFFINE_LOGIN_STORAGE_KEY,
        JSON.stringify({ token, refresh })
      );
    }
  }

  private restoreLogin() {
    const loginStr = storage.getItem(AFFINE_LOGIN_STORAGE_KEY);
    if (!loginStr) {
      return;
    }
    try {
      const login: LoginResponse = JSON.parse(loginStr);
      this.setLogin(login);
    } catch (err) {
      this._logger('Failed to parse login info', err);
    }
  }

  async initToken(token: string) {
    const res = await doLogin({ token, type: 'Google' });
    this.setLogin(res);
    return this._user;
  }

  async refreshToken(refreshToken?: string) {
    if (!this._padding) {
      this._padding = doLogin({
        type: 'Refresh',
        token: refreshToken || this._refreshToken,
      });
      this._refreshToken = refreshToken || this._refreshToken;
    }
    const res = await this._padding;
    if (!refreshToken || refreshToken !== this._refreshToken) {
      this.setLogin(res);
    }
    this._padding = undefined;
  }

  get token() {
    return this._accessToken;
  }

  get refresh() {
    return this._refreshToken;
  }

  get isLogin() {
    return !!this._refreshToken;
  }

  get isExpired() {
    if (!this._user) return true;
    return Date.now() > this._user.exp;
  }

  static parse(token: string): AccessTokenMessage | null {
    try {
      return JSON.parse(decode(token.split('.')[1]));
    } catch (error) {
      // todo: log errors?
      return null;
    }
  }

  private callbacks: Callback[] = [];
  private lastState: AccessTokenMessage | null = null;

  triggerChange(user: AccessTokenMessage | null) {
    this.lastState = user;
    this.callbacks.forEach(callback => callback(user));
  }

  onChange(callback: Callback) {
    this.callbacks.push(callback);
    callback(this.lastState);
  }

  offChange(callback: Callback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  clear() {
    this._accessToken = '';
    this._refreshToken = '';
    storage.removeItem(AFFINE_LOGIN_STORAGE_KEY);
  }
}

export const token = new Token();

export const getAuthorizer = () => {
  const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  });
  try {
    const firebaseAuth = getAuth(app);

    const googleAuthProvider = new GoogleAuthProvider();

    const getToken = async () => {
      const currentUser = firebaseAuth.currentUser;
      if (currentUser) {
        await currentUser.getIdTokenResult(true);
        if (!currentUser.isAnonymous) {
          return currentUser.getIdToken();
        }
      }
      return;
    };

    const signInWithGoogle = async () => {
      const idToken = await getToken();
      let loginUser: AccessTokenMessage | null = null;
      if (idToken) {
        loginUser = await token.initToken(idToken);
      } else {
        const user = await signInWithPopup(firebaseAuth, googleAuthProvider);
        const idToken = await user.user.getIdToken();
        loginUser = await token.initToken(idToken);
      }
      return loginUser;
    };

    const onAuthStateChanged = (callback: (user: User | null) => void) => {
      firebaseAuth.onAuthStateChanged(callback);
    };

    return [signInWithGoogle, onAuthStateChanged] as const;
  } catch (e) {
    getLogger('getAuthorizer')(e);
    console.error('getAuthorizer', e);
    return [] as const;
  }
};
