/**
 * Punto de entrada de Vercel: una funcion serverless que sirve TODO /api/*
 * (vercel.json reescribe /api/(.*) hacia aqui, conservando la ruta original
 * en la peticion, que es la que usa el enrutador de Express por dentro).
 *
 * Es la MISMA app que server/index.mjs usa para hosting tradicional: no hay
 * dos versiones del backend, solo dos formas de arrancarlo.
 *
 * El top-level await hace que Vercel espere UNA vez (por instancia en frio)
 * a que la app este lista (semilla incluida) antes de aceptar peticiones;
 * las invocaciones siguientes en la misma instancia reutilizan este modulo
 * ya inicializado.
 */
import { createApp } from '../server/app.mjs'

const app = await createApp()

export default app
