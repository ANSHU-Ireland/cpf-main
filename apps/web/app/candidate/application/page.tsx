import { redirect } from 'next/navigation';

export default function CanonicalApplicationPage(): never {
  redirect('/candidate/applications');
}
