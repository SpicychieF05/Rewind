'use client';

import { NeonAuthUIProvider } from '@neondatabase/auth-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      emailOTP={false}
      emailVerification={{ otp: true }}
      social={{ providers: ['google'] }}
      credentials={true}
      redirectTo="/saved"
      defaultTheme="dark"
      Link={Link}
      localization={{
        RESEND_VERIFICATION_EMAIL: 'Resend OTP',
        EMAIL_OTP: 'Verification Code',
        EMAIL_OTP_VERIFY_ACTION: 'Verify OTP',
      }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
