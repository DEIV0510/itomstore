import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/lib/auth'
import {
  Empty,
  ErrorNote,
  Field,
  Input,
  Loading,
  Modal,
  PageHead,
  Panel,
  Pill,
  Select,
  SubmitButton,
  Toggle,
  useConfirm,
} from '../ui/kit'

/**
 * /admin/usuarios — quien entra al panel (solo administrador).
 *
 * Las tres reglas duras (no eliminarse, no quitarse el admin, no dejar la
 * tienda sin administrador) las impone el servidor. Aqui ademas se desactivan
 * esos controles para el propio usuario, y si aun asi el servidor responde con
 * un error, se muestra tal cual.
 */

interface AdminUser {
  id: number
  email: string
  name: string
  role: Role
  mustChange: boolean
  active: boolean
  createdAt: string | null
  lastLogin: string | null
}

const MIN_PASSWORD = 10

const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador', editor: 'Editor' }

/** SQLite guarda 'YYYY-MM-DD HH:MM:SS' en UTC: hay que marcarlo como tal. */
function fecha(value: string | null, withTime = false): string {
  if (!value) return '—'
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return value

  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
  if (withTime) {
    opts.hour = '2-digit'
    opts.minute = '2-digit'
  }
  return d.toLocaleDateString('es-CO', opts)
}

const message = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback)

/** Indicador de longitud de la contraseña. No juzga la fuerza: solo el mínimo real del servidor. */
function PasswordMeter({ value }: { value: string }) {
  const len = value.length
  const pct = Math.min(100, Math.round((len / MIN_PASSWORD) * 100))
  const enough = len >= MIN_PASSWORD

  return (
    <div className="mt-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${enough ? 'bg-emerald-400' : 'bg-gold-500'}`}
          style={{ width: `${len === 0 ? 0 : Math.max(8, pct)}%` }}
        />
      </div>
      <p className={`mt-1.5 text-[12px] ${enough ? 'text-emerald-300' : 'text-silver-700'}`}>
        {len} de {MIN_PASSWORD} caracteres mínimos
      </p>
    </div>
  )
}

/* ---------------------------------------------------------------- crear */

function CreateUser({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('editor')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post('/users', { email: email.trim(), name: name.trim(), role, password })
      await onSaved()
      onClose()
    } catch (err) {
      setError(message(err, 'No pudimos crear el usuario.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Nuevo usuario">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Correo" required hint="Con este correo inicia sesión en el panel.">
          <Input
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@itomstore.co"
            required
          />
        </Field>

        <Field label="Nombre" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>

        <Field label="Rol">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="editor">Editor</option>
            <option value="admin">Administrador</option>
          </Select>
        </Field>

        <div>
          <Field label="Contraseña" required hint="Se la tendrá que cambiar la primera vez que entre.">
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_PASSWORD}
              required
            />
          </Field>
          <PasswordMeter value={password} />
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
            Cancelar
          </button>
          <SubmitButton busy={busy} disabled={password.length < MIN_PASSWORD}>
            Crear usuario
          </SubmitButton>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------- acciones de fila */

/**
 * Editar / eliminar. Vive fuera del componente de la pagina para que no se
 * vuelva a montar en cada render y el boton no pierda el foco entre los dos
 * pasos de la confirmacion.
 */
function RowActions({
  target,
  isSelf,
  armed,
  busy,
  onEdit,
  onDelete,
}: {
  target: AdminUser
  isSelf: boolean
  armed: boolean
  busy: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const motivo = 'No puedes eliminar tu propio usuario. Pídeselo a otro administrador.'

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar a ${target.name}`}
        title={`Editar a ${target.name}`}
        className="grid h-11 w-11 place-items-center rounded-xl border border-hairline text-silver-500 transition-colors duration-200 hover:border-gold-500/40 hover:text-silver-100"
      >
        <Pencil size={16} aria-hidden />
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={isSelf || busy}
        aria-label={isSelf ? motivo : armed ? `Confirmar eliminación de ${target.name}` : `Eliminar a ${target.name}`}
        title={isSelf ? motivo : armed ? 'Pulsa otra vez para eliminar' : `Eliminar a ${target.name}`}
        className={`grid h-11 min-w-[44px] place-items-center rounded-xl border px-3 text-[12px] font-semibold transition-colors duration-200 disabled:opacity-35 ${
          armed
            ? 'border-red-400/50 bg-red-400/10 text-red-200'
            : 'border-hairline text-silver-500 hover:border-red-400/50 hover:text-red-300'
        }`}
      >
        {armed ? 'Confirmar' : <Trash2 size={16} aria-hidden />}
      </button>
    </div>
  )
}

/* ---------------------------------------------------------------- editar */

function EditUser({
  target,
  isSelf,
  onClose,
  onSaved,
}: {
  target: AdminUser
  isSelf: boolean
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(target.name)
  const [role, setRole] = useState<Role>(target.role)
  const [active, setActive] = useState(target.active)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bloqueo = 'Es tu propio usuario: no puedes quitarte el acceso de administrador ni desactivarte.'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { name: name.trim(), role, active }
      if (password) body.password = password
      await api.put(`/users/${target.id}`, body)
      await onSaved()
      onClose()
    } catch (err) {
      setError(message(err, 'No pudimos guardar los cambios.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`Editar a ${target.name}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="rounded-xl border border-hairline bg-ink/40 px-3.5 py-3 text-[13px] text-silver-500">
          Correo: <span className="break-all text-silver-100">{target.email}</span>
          <span className="mt-1 block text-[12px] text-silver-700">El correo no se puede cambiar.</span>
        </p>

        <Field label="Nombre" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>

        <Field label="Rol" hint={isSelf ? bloqueo : undefined}>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={isSelf}
            aria-describedby={isSelf ? 'aviso-propio' : undefined}
            title={isSelf ? bloqueo : undefined}
          >
            <option value="editor">Editor</option>
            <option value="admin">Administrador</option>
          </Select>
        </Field>

        {isSelf ? (
          <p
            id="aviso-propio"
            className="rounded-xl border border-hairline bg-ink/40 px-3.5 py-3 text-[13px] text-silver-500"
          >
            {bloqueo} Si necesitas cambiar tu rol o desactivar tu cuenta, pídeselo a otro administrador.
          </p>
        ) : (
          <Toggle
            checked={active}
            onChange={setActive}
            label="Usuario activo"
            hint="Si lo desactivas, no podrá iniciar sesión en el panel."
          />
        )}

        <div>
          <Field label="Nueva contraseña" hint="Déjala vacía para no cambiarla.">
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {password && <PasswordMeter value={password} />}
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
            Cancelar
          </button>
          <SubmitButton busy={busy} disabled={password.length > 0 && password.length < MIN_PASSWORD}>
            Guardar cambios
          </SubmitButton>
        </div>
      </form>
    </Modal>
  )
}

/* ----------------------------------------------------------------- lista */

export default function Users() {
  const { user } = useAuth()
  const confirm = useConfirm()

  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ users: AdminUser[] }>('/users')
      setUsers(data.users ?? [])
      setLoadError(null)
    } catch (e) {
      setUsers([])
      setLoadError(message(e, 'No pudimos cargar los usuarios.'))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onDelete(target: AdminUser) {
    if (!confirm.ask(String(target.id))) return
    setActionError(null)
    setBusyId(target.id)
    try {
      await api.del(`/users/${target.id}`)
      await load()
    } catch (e) {
      setActionError(message(e, 'No pudimos eliminar el usuario.'))
    } finally {
      setBusyId(null)
    }
  }

  if (users === null) return <Loading label="Cargando usuarios…" />

  const list = users

  /** Mismos botones en la tabla y en las tarjetas de móvil. */
  const actionsFor = (u: AdminUser) => (
    <RowActions
      target={u}
      isSelf={user?.id === u.id}
      armed={confirm.armed === String(u.id)}
      busy={busyId === u.id}
      onEdit={() => setEditing(u)}
      onDelete={() => void onDelete(u)}
    />
  )

  return (
    <>
      <PageHead
        title="Usuarios"
        subtitle="Quién puede entrar al panel y hasta dónde llega cada uno."
        actions={
          <button type="button" onClick={() => setCreating(true)} className="btn btn-sm btn-gold">
            <Plus size={15} aria-hidden />
            Nuevo usuario
          </button>
        }
      />

      <div className="space-y-3">
        {loadError && (
          <ErrorNote>
            {loadError}{' '}
            <button type="button" onClick={() => void load()} className="underline underline-offset-4">
              Reintentar
            </button>
          </ErrorNote>
        )}
        {actionError && <ErrorNote>{actionError}</ErrorNote>}
      </div>

      {list.length === 0 ? (
        <div className="mt-4">
          <Empty
            title="Sin usuarios que mostrar"
            hint={
              loadError
                ? 'No se pudo leer la lista. Reintenta o revisa que el servidor esté encendido.'
                : 'Crea el primer usuario para que alguien más pueda entrar al panel.'
            }
            action={
              <button type="button" onClick={() => setCreating(true)} className="btn btn-sm btn-gold">
                <Plus size={15} aria-hidden />
                Nuevo usuario
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* ---------------------------------------------- tabla (desde sm) */}
          <Panel className="mt-4 hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-hairline text-[11px] uppercase tracking-[0.12em] text-silver-700">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Usuario
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Rol
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Activo
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Último acceso
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Creado
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((u) => (
                    <tr key={u.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-3">
                        <span className="block font-medium text-silver-100">
                          {u.name}
                          {user?.id === u.id && <span className="ml-2 text-[11px] text-gold-400">(tú)</span>}
                        </span>
                        <span className="mt-0.5 block break-all text-[12px] text-silver-700">{u.email}</span>
                        {u.mustChange && (
                          <span className="mt-1.5 inline-block">
                            <Pill tone="orange">Debe cambiar la contraseña</Pill>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={u.role === 'admin' ? 'gold' : 'blue'}>{ROLE_LABEL[u.role]}</Pill>
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={u.active ? 'green' : 'muted'}>{u.active ? 'Sí' : 'No'}</Pill>
                      </td>
                      <td className="px-4 py-3 text-silver-500">
                        {u.lastLogin ? fecha(u.lastLogin, true) : 'Nunca'}
                      </td>
                      <td className="px-4 py-3 text-silver-500">{fecha(u.createdAt)}</td>
                      <td className="px-4 py-3">{actionsFor(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* ------------------------------------------- tarjetas (en móvil) */}
          <ul className="mt-4 space-y-3 sm:hidden">
            {list.map((u) => (
              <li key={u.id}>
                <Panel className="p-4">
                  <p className="font-medium text-silver-100">
                    {u.name}
                    {user?.id === u.id && <span className="ml-2 text-[11px] text-gold-400">(tú)</span>}
                  </p>
                  <p className="mt-0.5 break-all text-[12px] text-silver-700">{u.email}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill tone={u.role === 'admin' ? 'gold' : 'blue'}>{ROLE_LABEL[u.role]}</Pill>
                    <Pill tone={u.active ? 'green' : 'muted'}>{u.active ? 'Activo' : 'Inactivo'}</Pill>
                    {u.mustChange && <Pill tone="orange">Debe cambiar la contraseña</Pill>}
                  </div>

                  <dl className="mt-3 space-y-1 text-[12px] text-silver-500">
                    <div className="flex justify-between gap-3">
                      <dt className="text-silver-700">Último acceso</dt>
                      <dd className="text-right">{u.lastLogin ? fecha(u.lastLogin, true) : 'Nunca'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-silver-700">Creado</dt>
                      <dd className="text-right">{fecha(u.createdAt)}</dd>
                    </div>
                  </dl>

                  <div className="mt-3">{actionsFor(u)}</div>
                </Panel>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* ------------------------------------------------------ los dos roles */}
      <Panel className="mt-6 p-5">
        <h2 className="font-display text-base font-extrabold tracking-tightest text-silver-100">Qué puede cada rol</h2>
        <dl className="mt-3 space-y-3 text-[13px] leading-relaxed">
          <div>
            <dt className="font-semibold text-gold-300">Administrador</dt>
            <dd className="text-silver-500">Acceso total, incluida la configuración y los usuarios.</dd>
          </div>
          <div>
            <dt className="font-semibold text-sky-300">Editor</dt>
            <dd className="text-silver-500">
              Gestiona catálogo, pedidos, permutas y portada, pero no la configuración de la empresa ni los usuarios.
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-[12px] leading-relaxed text-silver-700">
          Siempre debe quedar al menos un administrador activo, y nadie puede eliminarse ni quitarse a sí mismo el
          acceso de administrador: por eso esos controles aparecen apagados en tu propia fila.
        </p>
      </Panel>

      {creating && <CreateUser onClose={() => setCreating(false)} onSaved={load} />}
      {editing && (
        <EditUser
          target={editing}
          isSelf={user?.id === editing.id}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </>
  )
}
