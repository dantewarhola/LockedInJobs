import SharedNav from '@/components/SharedNav';

export default async function SharedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <>
      <SharedNav token={token} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
