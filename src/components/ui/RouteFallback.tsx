/** Esqueleto que ocupa el lugar de una ruta perezosa mientras llega su codigo. */
export default function RouteFallback() {
  return (
    <div aria-busy="true" className="container-x section-y min-h-[70vh]">
      <span className="sr-only">Cargando contenido</span>

      <div aria-hidden="true">
        <div className="skeleton h-3 w-28 rounded-full" />
        <div className="skeleton mt-4 h-9 w-full max-w-lg rounded-xl sm:h-12" />
        <div className="skeleton mt-3 h-4 w-3/4 max-w-md rounded-lg" />

        <div className="mt-10 grid grid-cols-2 gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton aspect-[4/5] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
