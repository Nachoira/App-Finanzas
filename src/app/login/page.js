import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function LoginPage({ searchParams }) {
  const error = searchParams.error;

  async function handleAuth(formData) {
    'use server';
    const user = formData.get('username');
    const pass = formData.get('password');
    const isRegister = formData.get('intent') === 'register';

    if (isRegister) {
      // REGISTRO: Crear nuevo usuario
      try {
        await pool.query('INSERT INTO "Usuario" (username, password) VALUES ($1, $2)', [user, pass]);
      } catch (e) {
        return redirect('/login?error=user_exists');
      }
    }

    // LOGIN: Verificar credenciales
    const res = await pool.query('SELECT * FROM "Usuario" WHERE username = $1 AND password = $2', [user, pass]);

    if (res.rows.length > 0) {
      const cookieStore = await cookies();
      cookieStore.set('session', res.rows[0].id.toString(), { httpOnly: true }); // Guardamos el ID en la cookie
      redirect('/');
    } else {
      redirect('/login?error=auth_failed');
    }
  }

  return (
    <main style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ textAlign: 'center', letterSpacing: '-1px' }}>FINANZAS APP</h2>
        {error && <p style={{ color: 'red', fontSize: '0.8rem', textAlign: 'center' }}>{error === 'user_exists' ? 'El usuario ya existe' : 'Credenciales inválidas'}</p>}
        
        <form action={handleAuth} style={{ display: 'grid', gap: '15px' }}>
          <input name="username" placeholder="Usuario" required style={inputStyle} />
          <input name="password" type="password" placeholder="Contraseña" required style={inputStyle} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button name="intent" value="login" style={btnBlack}>ENTRAR</button>
            <button name="intent" value="register" style={btnWhite}>REGISTRARSE</button>
          </div>
        </form>
      </div>
    </main>
  );
}

const containerStyle = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' };
const cardStyle = { background: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '400px' };
const inputStyle = { padding: '12px', border: '1px solid #ddd', borderRadius: '4px' };
const btnBlack = { padding: '12px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
const btnWhite = { padding: '12px', background: '#fff', color: '#000', border: '1px solid #000', cursor: 'pointer', fontWeight: 'bold' };