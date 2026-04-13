import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import GastoChart from './components/GastoChart';

// Paleta de colores distintos por categoría
const CATEGORY_COLORS = [
  '#c8f135', // verde lima
  '#38bdf8', // celeste
  '#f97316', // naranja
  '#a78bfa', // violeta
  '#f43f5e', // rosa
  '#34d399', // verde menta
  '#fbbf24', // amarillo
  '#e879f9', // fucsia
  '#60a5fa', // azul
  '#fb7185', // salmon
];

export default async function Home() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;
  if (!userId) redirect('/login');

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
    await pool.query(
      'INSERT INTO "Categoria" (nombre, "presupuestoMax", "usuarioId") VALUES ($1, $2, $3)',
      [nombre, parseFloat(presupuesto), uId]
    );
    revalidatePath('/');
  }

  async function crearGasto(formData) {
    'use server';
    const desc = formData.get('descripcion');
    const monto = formData.get('monto');
    const catId = formData.get('categoriaId');
    const cStore = await cookies();
    const uId = cStore.get('session').value;
    await pool.query(
      'INSERT INTO "Gasto" (descripcion, monto, "categoriaId", "usuarioId") VALUES ($1, $2, $3, $4)',
      [desc, parseFloat(monto), catId, uId]
    );
    revalidatePath('/');
  }

  async function actualizarLimite(formData) {
    'use server';
    const catId = formData.get('catId');
    const nuevo = formData.get('nuevoLimite');
    const cStore = await cookies();
    const uId = cStore.get('session').value;
    await pool.query(
      'UPDATE "Categoria" SET "presupuestoMax" = $1 WHERE id = $2 AND "usuarioId" = $3',
      [parseFloat(nuevo), catId, uId]
    );
    revalidatePath('/');
  }

  async function eliminarCategoria(formData) {
    'use server';
    const catId = formData.get('catId');
    const cStore = await cookies();
    const uId = cStore.get('session').value;
    // Primero elimina los gastos asociados
    await pool.query('DELETE FROM "Gasto" WHERE "categoriaId" = $1 AND "usuarioId" = $2', [catId, uId]);
    await pool.query('DELETE FROM "Categoria" WHERE id = $1 AND "usuarioId" = $2', [catId, uId]);
    revalidatePath('/');
  }

  // DATA
  const resCat = await pool.query(`
    SELECT c.id, c.nombre, c."presupuestoMax",
           COALESCE(SUM(g.monto), 0) as "gastoTotal"
    FROM "Categoria" c
    LEFT JOIN "Gasto" g ON c.id = g."categoriaId"
    WHERE c."usuarioId" = $1
    GROUP BY c.id ORDER BY c.nombre ASC
  `, [userId]);

  const categorias = resCat.rows.map((cat, i) => ({
    ...cat,
    gastoTotal:     parseFloat(cat.gastoTotal),
    presupuestoMax: parseFloat(cat.presupuestoMax),
    superoLimite:   parseFloat(cat.gastoTotal) > parseFloat(cat.presupuestoMax),
    color:          CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const resGastos = await pool.query(`
    SELECT g.*, c.nombre as cat_nombre FROM "Gasto" g
    JOIN "Categoria" c ON g."categoriaId" = c.id
    WHERE g."usuarioId" = $1 ORDER BY g.fecha DESC LIMIT 10
  `, [userId]);
  const gastos = resGastos.rows;

  const totalGastado    = categorias.reduce((s, c) => s + c.gastoTotal, 0);
  const totalPresupuesto = categorias.reduce((s, c) => s + c.presupuestoMax, 0);
  const superadas       = categorias.filter(c => c.superoLimite).length;

  const chartData = {
    labels: categorias.map(c => c.nombre),
    datasets: [{
      data:            categorias.map(c => c.gastoTotal),
      backgroundColor: categorias.map(c => c.color),
      borderWidth: 0,
    }]
  };

  return (
    <main className="app-root">

      {/* HEADER */}
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo">₿</span>
          <span className="header-title">finanzas</span>
        </div>
        <form action={logout}>
          <button type="submit" className="btn-logout">Salir</button>
        </form>
      </header>

      {/* RESUMEN GLOBAL */}
      <section className="summary-row">
        <div className="summary-card">
          <span className="summary-label">Gastado</span>
          <span className="summary-value">${totalGastado.toLocaleString('es-AR')}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Presupuesto</span>
          <span className="summary-value">${totalPresupuesto.toLocaleString('es-AR')}</span>
        </div>
        <div className={`summary-card ${superadas > 0 ? 'summary-card--danger' : ''}`}>
          <span className="summary-label">Superadas</span>
          <span className="summary-value">{superadas}</span>
        </div>
      </section>

      <div className="content-grid">

        {/* PRESUPUESTOS */}
        <section className="card">
          <h2 className="card-title">Presupuestos</h2>
          <div className="cat-list">
            {categorias.length === 0 && (
              <p className="empty-msg">Aún no tenés categorías.</p>
            )}
            {categorias.map(cat => {
              const pct = Math.min((cat.gastoTotal / cat.presupuestoMax) * 100, 100);
              return (
                <div key={cat.id} className={`cat-row ${cat.superoLimite ? 'cat-row--danger' : ''}`}>

                  {/* Nombre + montos */}
                  <div className="cat-top">
                    <div className="cat-nombre-wrap">
                      <span className="cat-dot" style={{ background: cat.color }} />
                      <span className="cat-nombre">{cat.nombre}</span>
                    </div>
                    <span className={`cat-monto ${cat.superoLimite ? 'cat-monto--danger' : ''}`}>
                      ${cat.gastoTotal.toLocaleString('es-AR')}
                      <span className="cat-limit"> / ${cat.presupuestoMax.toLocaleString('es-AR')}</span>
                    </span>
                  </div>

                  {/* Barra de progreso con color de categoría */}
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: cat.superoLimite ? 'var(--danger)' : cat.color,
                      }}
                    />
                  </div>

                  {cat.superoLimite && <span className="cat-alert">⚠ Límite superado</span>}

                  {/* Acciones: actualizar límite + eliminar */}
                  <div className="cat-actions">
                    <form action={actualizarLimite} className="cat-update-form">
                      <input type="hidden" name="catId" value={cat.id} />
                      <input
                        name="nuevoLimite"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={`Nuevo límite (actual: $${cat.presupuestoMax.toLocaleString('es-AR')})`}
                        required
                        className="field-input field-input--sm"
                      />
                      <button type="submit" className="btn-update">Actualizar</button>
                    </form>
                    <form action={eliminarCategoria}>
                      <input type="hidden" name="catId" value={cat.id} />
                      <button
                        type="submit"
                        className="btn-delete"
                        onClick={(e) => {
                          if (!confirm(`¿Eliminar "${cat.nombre}" y todos sus gastos?`)) e.preventDefault();
                        }}
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>

                </div>
              );
            })}
          </div>
        </section>

        {/* GRÁFICO */}
        {categorias.length > 0 && (
          <section className="card">
            <h2 className="card-title">Distribución</h2>
            <div className="chart-wrap">
              <GastoChart chartData={chartData} />
            </div>
          </section>
        )}

        {/* CARGAR GASTO */}
        <section className="card">
          <h2 className="card-title">Cargar gasto</h2>
          <form action={crearGasto} className="form-stack">
            <div className="field-group">
              <label className="field-label">Descripción</label>
              <input name="descripcion" placeholder="Ej: supermercado" required className="field-input" />
            </div>
            <div className="field-group">
              <label className="field-label">Monto ($)</label>
              <input name="monto" type="number" min="0" step="0.01" placeholder="0.00" required className="field-input" />
            </div>
            <div className="field-group">
              <label className="field-label">Categoría</label>
              <select name="categoriaId" required className="field-input field-select">
                <option value="">Seleccioná una categoría</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-accent">Registrar gasto</button>
          </form>
        </section>

        {/* NUEVA CATEGORÍA */}
        <section className="card">
          <h2 className="card-title">Nueva categoría</h2>
          <form action={crearCategoria} className="form-stack">
            <div className="field-group">
              <label className="field-label">Nombre</label>
              <input name="nombre" placeholder="Ej: Comida" required className="field-input" />
            </div>
            <div className="field-group">
              <label className="field-label">Límite mensual ($)</label>
              <input name="presupuesto" type="number" min="0" step="0.01" placeholder="0.00" required className="field-input" />
            </div>
            <button type="submit" className="btn-outline">Crear categoría</button>
          </form>
        </section>

        {/* ÚLTIMOS GASTOS */}
        {gastos.length > 0 && (
          <section className="card card--full">
            <h2 className="card-title">Últimos movimientos</h2>
            <div className="gastos-list">
              {gastos.map((g, i) => {
                const cat = categorias.find(c => c.nombre === g.cat_nombre);
                return (
                  <div key={g.id} className="gasto-row">
                    <div className="gasto-info">
                      <span className="gasto-desc">{g.descripcion}</span>
                      <span className="gasto-cat" style={{ color: cat?.color || 'var(--muted)' }}>
                        {g.cat_nombre}
                      </span>
                    </div>
                    <span className="gasto-monto">-${parseFloat(g.monto).toLocaleString('es-AR')}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <style>{`
        .app-root {
          min-height: 100vh;
          background: var(--bg);
          padding: 0 0 48px;
        }

        /* HEADER */
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          background: var(--bg);
          z-index: 10;
        }
        .header-brand { display: flex; align-items: center; gap: 8px; }
        .header-logo { font-size: 1.2rem; color: var(--accent); }
        .header-title {
          font-family: var(--font-display);
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .btn-logout {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--muted);
          padding: 7px 16px;
          border-radius: 20px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .btn-logout:hover { border-color: var(--text); color: var(--text); }

        /* SUMMARY */
        .summary-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border-bottom: 1px solid var(--border);
          margin-bottom: 24px;
        }
        .summary-card {
          background: var(--surface);
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .summary-card--danger { background: var(--danger-bg); }
        .summary-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
        }
        .summary-value {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 800;
        }
        .summary-card--danger .summary-value { color: var(--danger); }

        /* GRID */
        .content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          padding: 0 16px;
        }
        @media (min-width: 640px) {
          .content-grid { grid-template-columns: 1fr 1fr; padding: 0 24px; }
          .card--full { grid-column: 1 / -1; }
        }

        /* CARD */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
        }
        .card-title {
          font-family: var(--font-display);
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--muted);
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        /* CATEGORIAS */
        .cat-list { display: flex; flex-direction: column; gap: 14px; }
        .cat-row {
          padding: 14px;
          background: var(--surface2);
          border-radius: 10px;
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cat-row--danger {
          background: var(--danger-bg);
          border-color: var(--danger-border);
        }
        .cat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .cat-nombre-wrap { display: flex; align-items: center; gap: 8px; }
        .cat-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cat-nombre { font-weight: 600; font-size: 0.95rem; }
        .cat-monto { font-family: var(--font-display); font-weight: 800; font-size: 0.95rem; white-space: nowrap; }
        .cat-monto--danger { color: var(--danger); }
        .cat-limit { font-weight: 400; color: var(--muted); font-family: var(--font-body); font-size: 0.82rem; }
        .progress-track {
          height: 4px;
          background: var(--border);
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.4s ease;
        }
        .cat-alert { font-size: 0.75rem; color: var(--danger); }

        /* ACCIONES DE CATEGORIA */
        .cat-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
        }
        .cat-update-form {
          display: flex;
          gap: 8px;
        }
        .field-input--sm {
          padding: 8px 10px;
          font-size: 0.82rem;
          flex: 1;
          min-width: 0;
        }
        .btn-update {
          padding: 8px 12px;
          background: var(--surface);
          color: var(--accent);
          border: 1px solid var(--accent);
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s, color 0.2s;
          flex-shrink: 0;
        }
        .btn-update:hover { background: var(--accent); color: #0d0d0d; }
        .btn-delete {
          width: 100%;
          padding: 8px;
          background: transparent;
          color: var(--danger);
          border: 1px solid var(--danger-border);
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-delete:hover { background: var(--danger-bg); }

        /* CHART */
        .chart-wrap { height: 220px; }

        /* FORMS */
        .form-stack { display: flex; flex-direction: column; gap: 14px; }
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-label {
          font-size: 0.72rem;
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
          -webkit-appearance: none;
        }
        .field-input:focus { border-color: var(--accent); outline: none; }
        .field-select { cursor: pointer; }
        .field-select option { background: var(--surface2); }

        .btn-accent {
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
        .btn-accent:hover { opacity: 0.85; }
        .btn-outline {
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
        .btn-outline:hover { border-color: var(--accent); }

        /* GASTOS */
        .gastos-list { display: flex; flex-direction: column; }
        .gasto-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
          gap: 12px;
        }
        .gasto-row:last-child { border-bottom: none; }
        .gasto-info { display: flex; flex-direction: column; gap: 2px; }
        .gasto-desc { font-size: 0.9rem; font-weight: 500; }
        .gasto-cat { font-size: 0.75rem; }
        .gasto-monto {
          font-family: var(--font-display);
          font-weight: 800;
          color: var(--danger);
          white-space: nowrap;
          font-size: 0.95rem;
        }
        .empty-msg { color: var(--muted); font-size: 0.85rem; text-align: center; padding: 16px 0; }
      `}</style>
    </main>
  );
}