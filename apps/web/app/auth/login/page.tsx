import { redirect } from 'next/navigation';

export default function CanonicalLoginPage(): never {
  redirect('/sign-in');
}
