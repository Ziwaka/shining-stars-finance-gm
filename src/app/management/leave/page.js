"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LeaveHomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Automatically redirect to approval page
    router.push('/management/leave/approval');
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-2xl text-slate-400">Redirecting...</p>
    </div>
  );
}