async function handleAuth(formData) {
  'use server';
  const user = formData.get('username')?.trim();
  const pass = formData.get('password');
  const isRegister = formData.get('intent') === 'register';

  if (isRegister) {
    // Verificar si ya existe
    const existe = await pool.query(
      'SELECT id FROM "Usuario" WHERE username = $1',
      [user]
    );
    if (existe.rows.length > 0) {
      return redirect('/login?error=user_exists');
    }

    // Crear usuario
    await pool.query(
      'INSERT INTO "Usuario" (username, password) VALUES ($1, $2)',
      [user, pass]
    );

    // Login automático después del registro
    const nuevo = await pool.query(
      'SELECT id FROM "Usuario" WHERE username = $1',
      [user]
    );
    const cookieStore = await cookies();
    cookieStore.set('session', nuevo.rows[0].id.toString(), { httpOnly: true });
    redirect('/');
  }

  // LOGIN NORMAL
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