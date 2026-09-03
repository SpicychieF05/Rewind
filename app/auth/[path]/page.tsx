import { AuthView } from '@neondatabase/auth-ui';
import { authViewPaths } from '@neondatabase/auth-ui/server';

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths)
    .filter((path) => path !== authViewPaths.EMAIL_OTP)
    .map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="auth-page-wrapper">
      <div className="auth-card-wrap">
        <AuthView path={path} />
      </div>
    </main>
  );
}
