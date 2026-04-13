import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function LoginPage({ searchParams }) {
  const error = searchParams.error;

  async function handleAuth(formData) {
    'use server';
    const user = formData.get('username')?.trim();
    const pass = formData.get('password');
    const isRegister = formData.get('intent') === 'register';

    if (isRegister) {
      const existe = await pool.query(
        'SELECT id FROM "Usuario" WHERE username = $1',
        [user]
      );
      if (existe.rows.length > 0) {
        return redirect('/login?error=user_exists');
      }
      await pool.query(
        'INSERT INTO "Usuario" (username, password) VALUES ($1, $2)',
        [user, pass]
      );
      const nuevo = await pool.query(
        'SELECT id FROM "Usuario" WHERE username = $1',
        [user]
      );
      const cookieStore = await cookies();
      cookieStore.set('session', nuevo.rows[0].id.toString(), { httpOnly: true });
      redirect('/');
    }

    const res = await pool.query(
      'SELECT * FROM "Usuario" WHERE username = $1 AND password = $2',
      [user, pass]
    );
    if (res.rows.length > 0) {
      const cookieStore = await cookies();
      cookieStore.set('session', res.rows[0].id.toString(), { httpOnly: true });
      redirect('/');
    } else {
      redirect('/login?error=auth_failed');
    }
  }

  return (
    <main className="login-root">
      <div className="login-card">

        <div className="login-brand">
          <span className="login-logo">₿</span>
          <h1 className="login-title">finanzas</h1>
          <p className="login-sub">control de gastos personal</p>
        </div>

        {error && (
          <div className="login-error">
            {error === 'user_exists' ? 'Ese usuario ya existe.' : 'Usuario o contraseña incorrectos.'}
          </div>
        )}

        <form action={handleAuth} className="login-form">
          <div className="field-group">
            <label className="field-label">Usuario</label>
            <input name="username" placeholder="tu_usuario" required className="field-input" autoComplete="username" />
          </div>
          <div className="field-group">
            <label className="field-label">Contraseña</label>
            <input name="password" type="password" placeholder="••••••••" required className="field-input" autoComplete="current-password" />
          </div>

          <div className="login-actions">
            <button name="intent" value="login" className="btn-primary">Entrar</button>
            <div className="login-divider">
              <span>¿No tenés cuenta?</span>
            </div>
            <button name="intent" value="register" className="btn-ghost">Registrarse</button>
          </div>
        </form>

      </div>

      <style>{`
        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--bg);
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 40px 32px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .login-brand {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .login-logo { font-size: 2rem; color: var(--accent); }
        .login-title {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -1px;
          color: var(--text);
        }
        .login-sub {
          font-size: 0.8rem;
          color: var(--muted);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .login-error {
          background: var(--danger-bg);
          border: 1px solid var(--danger-border);
          color: var(--danger);
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          text-align: center;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
        }
        .field-input {
          background: var(--surface2);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 12px 14px;
          border-radius: 8px;
          width: 100%;
          transition: border-color 0.2s;
        }
        .field-input:focus {
          border-color: var(--accent);
          outline: none;
        }
        .login-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 4px;
        }
        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 4px 0;
        }
        .login-divider::before,
        .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .login-divider span {
          font-size: 0.75rem;
          color: var(--muted);
          white-space: nowrap;
        }
        .btn-primary {
          width: 100%;
          padding: 13px;
          background: var(--accent);
          color: #0d0d0d;
          border: none;
          border-radius: 8px;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: opacity 0.2s;
          letter-spacing: 0.03em;
        }
        .btn-primary:hover { opacity: 0.85; }
        .btn-ghost {
          width: 100%;
          padding: 13px;
          background: transparent;
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.2s;
          font-size: 0.9rem;
        }
        .btn-ghost:hover { border-color: var(--accent); }
      `}</style>
    </main>
  );
}