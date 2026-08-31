import ApplicationForm from '@/components/ApplicationForm';

export default function NewApplicationPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Add application</h1>
      <ApplicationForm mode="create" />
    </section>
  );
}
