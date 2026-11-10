'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/my-courses?tab=profile');
  }, [router]);

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-white flex items-center justify-center font-reddit">
      <div className="flex items-center gap-3 text-sm font-bold text-neutral-400">
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span>Loading Account Profile...</span>
      </div>
    </div>
  );
}
