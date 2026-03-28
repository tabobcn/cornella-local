# Audit — Auditoría técnica del proyecto

Realiza una auditoría técnica completa de `src/App.jsx` buscando bugs, problemas de UX, seguridad y rendimiento.

## Qué revisar

### CRÍTICO
- useEffect con dependencias incorrectas (stale closures, bucles infinitos)
- Accesos a `.property` en objetos que pueden ser null/undefined sin optional chaining
- `JSON.parse` sin try-catch (crash si localStorage corrupto)
- Channels Realtime de Supabase sin cleanup en return del useEffect
- Queries a Supabase sin `.limit()` que podrían descargar miles de filas
- Botones de submit sin protección contra doble click durante operaciones async

### MEDIO
- Mensajes de error técnicos expuestos al usuario (`error.message` de Supabase)
- `showToast` no pasado como prop a componentes que lo necesitan
- Estados que no se resetean al navegar entre pantallas
- Dependencias en `[user]` en lugar de `[user?.id]` (provoca re-renders por referencia)

### BAJO
- Variables de estado declaradas pero nunca usadas
- `catch` vacíos que silencian errores sin logging
- Mensajes hardcodeados que deberían estar en constantes
- Inconsistencia entre snake_case (Supabase) y camelCase (React) sin mapeo explícito

## Reglas específicas del proyecto a verificar
- NUNCA `alert()` → siempre `showToast()`
- NUNCA JOIN anidado en Supabase (ej: `profiles:user_id(...)`) → da PGRST200
- `businesses.owner_id` identifica al propietario (no `user_id`)
- `showToast` debe pasarse explícitamente como prop (no es global)
- Lightbox y modales deben renderizarse fuera de `overflow-x-hidden`

## Formato de salida

Agrupar por severidad con tabla:
| Línea | Problema | Impacto | Fix sugerido |

Terminar con lista de los 3 fixes más urgentes para hacer ahora.
