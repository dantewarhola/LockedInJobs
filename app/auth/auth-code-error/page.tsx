import AuthCard from '@/components/AuthCard';

export default function AuthCodeErrorPage() {
  return (
    <AuthCard
      title="That link didn't work"
      links={[
        { href: '/login', label: 'Back to sign in' },
        { href: '/forgot-password', label: 'Request a new link' },
      ]}
    >
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        The confirmation or reset link is invalid or has expired. Request a new one and try again.
      </p>
    </AuthCard>
  );
}
