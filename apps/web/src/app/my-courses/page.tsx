import { redirect } from 'next/navigation';

export default async function MyCoursesRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const query = new URLSearchParams(
    Object.entries(resolvedParams).flatMap(([key, val]) =>
      Array.isArray(val) ? val.map((v) => [key, v]) : val ? [[key, val]] : [],
    ),
  ).toString();

  redirect(`/dashboard${query ? `?${query}` : ''}`);
}
