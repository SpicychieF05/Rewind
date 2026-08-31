import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Lazy singleton — throws only when a request actually tries to use the DB,
// not at module evaluation time (which happens during `next build`).
let _sql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL environment variable is not set');
    _sql = neon(url);
  }
  return _sql;
}

// Convenience proxy with a callable target — keeps call sites identical to before (sql`...`)
const dummyFn = (() => {}) as unknown as NeonQueryFunction<false, false>;
export const sql = new Proxy(dummyFn, {
  apply(_target, _thisArg, args) {
    return (getSql() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop) {
    const s = getSql();
    const val = (s as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === 'function' ? val.bind(s) : val;
  },
});

