'use server'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function crearGasto(formData) {
  const monto = parseFloat(formData.get('monto'))
  const descripcion = formData.get('descripcion')
  const categoriaId = formData.get('categoriaId')

  await db.gasto.create({
    data: {
      monto,
      descripcion,
      categoriaId
    }
  })

  revalidatePath('/') // Esto refresca la página para ver el gasto nuevo
}