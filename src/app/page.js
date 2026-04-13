import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import GastoChart from './components/GastoChart';

export default async function Home() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  if (!userId) redirect('/login');

  // --- ACCIONES DEL SERVIDOR ---
  async function logout() {
    'use server';
    const cStore = await cookies();
    cStore.delete('session');
    redirect('/login');
  }

  async function crearCategoria(formData) {
    'use server';
    const nombre = formData.get('nombre');
    const presupuesto = formData.get('presupuesto');
    const cStore = await cookies();
    const uId = cStore.get('session').value;
    await pool.query('INSERT INTO "Categoria" (nombre, "presupuestoMax", "usuarioId") VALUES ($1, $2, $3)', [nombre, parseFloat(presupuesto), uId]);
    revalidatePath('/');
  }

  async function crearGasto(formData) {
    'use server';
    const desc = formData.get('descripcion');
    const monto = formData.get('monto');
    const catId = formData.get('categoriaId');
    const cStore = await cookies();
    const uId = cStore.get('session').value;
    await pool.query('INSERT INTO "Gasto" (descripcion, monto, "categoriaId", "usuarioId") VALUES ($1, $2, $3, $4)', [desc, parseFloat(monto), catId, uId]);
    revalidatePath('/');
  }

  // --- DATA FETCHING ---
  const resCat = await pool.query(`
    SELECT c.id, c.nombre, c."presupuestoMax", COALESCE(SUM(g.monto), 0) as "gastoTotal"
    FROM "Categoria" c
    LEFT JOIN "Gasto" g ON c.id = g."categoriaId"
    WHERE c."usuarioId" = $1
    GROUP BY c.id ORDER BY c.nombre ASC
  `, [userId]);
  
  const categoriasJSON = resCat.rows.map(cat => ({
    ...cat,
    gastoTotal: parseFloat(cat.gastoTotal),
    superoLimite: parseFloat(cat.gastoTotal) > parseFloat(cat.presupuestoMax)
  }));

  const resGastos = await pool.query(`
    SELECT g.*, c.nombre as cat_nombre FROM "Gasto" g 
    JOIN "Categoria" c ON g."categoriaId" = c.id 
    WHERE g."usuarioId" = $1 ORDER BY g.fecha DESC LIMIT 10
  `, [userId]);
  const gastos = resGastos.rows;

  const chartData = {
    labels: categoriasJSON.map(c => c.nombre),
    datasets: [{
      data: categoriasJSON.map(c => c.gastoTotal),
      backgroundColor: ['#000', '#333', '#666', '#999', '#CCC'],
      borderWidth: 1,
    }]
  };

  return (
    <main style={mainStyle}>
      <header style={headerStyle}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>MIS FINANZAS</h1>
        <form action={logout}>
          <button type="submit" style={btnLogoutStyle}>Salir</button>
        </form>
      </header>

      {/* GRID RESPONSIVO: En PC son 2 columnas, en Celu es 1 sola */}
      <div style={responsiveGrid}>
        
        {/* GRÁFICO */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Distribución</h3>
          <div style={{ height: '250px' }}>
            <GastoChart chartData={chartData} />
          </div>
        </div>

        {/* LÍMITES Y ALERTAS */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Presupuestos</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {categoriasJSON.map(cat => (
              <div key={cat.id} style={{ 
                ...categoriaRowStyle, 
                background: cat.superoLimite ? '#fff1f1' : '#f9f9f9',
                borderColor: cat.superoLimite ? '#991b1b' : '#eee' 
              }}>
                <span style={{ fontWeight: '600' }}>{cat.nombre}</span>
                <span style={{ fontWeight: '800', color: cat.superoLimite ? '#991b1b' : '#000' }}>
                  ${cat.gastoTotal} / ${cat.presupuestoMax}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* FORMULARIOS */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Acciones</h3>
          <form action={crearGasto} style={{ display: 'grid', gap: '10px' }}>
            <input name="descripcion" placeholder="Gasto" required style={inputStyle} />
            <input name="monto" type="number" placeholder="Monto" required style={inputStyle} />
            <select name="categoriaId" required style={inputStyle}>
              {categoriasJSON.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button type="submit" style={btnProStyle}>Cargar Gasto</button>
          </form>
        </div>
      </div>
    </main>
  );
}

// --- ESTILOS AJUSTADOS PARA CELULAR ---
const mainStyle = { padding: '20px', background: '#f5f5f7', minHeight: '100vh', fontFamily: 'sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const responsiveGrid = { 
  display: 'flex', 
  flexDirection: 'column', // Por defecto uno abajo del otro
  gap: '20px' 
};
const cardStyle = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee' };
const cardTitleStyle = { margin: '0 0 15px 0', fontSize: '1rem', borderBottom: '1px solid #eee', paddingBottom: '5px' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }; // 16px evita el zoom automático en iPhone
const btnProStyle = { padding: '12px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const btnLogoutStyle = { background: 'none', border: '1px solid #000', padding: '5px 15px', borderRadius: '15px' };
const categoriaRowStyle = { display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', border: '1px solid', fontSize: '0.9rem' };