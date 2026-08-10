import { redirect } from 'next/navigation';

export default function CanonicalMfaPage(): never {
  redirect('/mfa');
}
