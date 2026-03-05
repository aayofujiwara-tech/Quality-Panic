import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './config';

/** 匿名認証でサインイン（既にサインイン済みならそのユーザーを返す） */
export async function signInAnonymous(): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  const credential = await signInAnonymously(auth);
  return credential.user;
}

/** 現在のユーザーIDを取得（未認証ならnull） */
export function getCurrentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

/** 認証状態の変化を監視 */
export function onAuthChanged(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
