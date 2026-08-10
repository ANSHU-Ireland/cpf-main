import { redirect } from 'next/navigation';

export default function CanonicalRecoveryPage(): never {
  redirect('/forgot-password');
}
