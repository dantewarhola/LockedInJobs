import { notFound } from 'next/navigation';
import ApplicationForm from '@/components/ApplicationForm';
import { getApplication } from '@/lib/applications';

export const dynamic = 'force-dynamic';

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const application = await getApplication(id);
  if (!application) notFound();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit application</h1>
      <ApplicationForm mode="edit" application={application} />
    </section>
  );
}
