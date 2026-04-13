'use client';

export default function BtnEliminar({ action, nombre }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="btn-delete"
        onClick={(e) => {
          if (!confirm(`¿Eliminar "${nombre}" y todos sus gastos?`)) e.preventDefault();
        }}
      >
        Eliminar
      </button>
    </form>
  );
}