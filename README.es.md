[English](README.md) | [Español](README.es.md)

# Commands Viewer

Tu panel local para convertir comandos sueltos en una biblioteca útil,
buscable y editable.

`Commands Viewer` es una app local para guardar cheatsheets de CLI con una
interfaz cómoda: comandos, ejemplos, flags, tags, favoritos, notas y orden
manual por herramienta. La idea no es coleccionar snippets sin contexto, sino
tener una referencia viva que puedas consultar, depurar y mantener con el
tiempo.

<img src="docs/main.png" style="width:90%;">


### Compact Mode

<img src="docs/compact-mode.png" style="width:90%;">



### New Command

<img src="docs/new-command.png" style="width:40%;">



## Qué es

Piensa en esto como una mezcla entre:

- una chuleta personal de terminal,
- un pequeño catálogo editable de comandos reales,
- y una UI local para no depender de notas sueltas o Markdown disperso.

Todo corre en local. No hay cuentas, no hay sync externo, no hay telemetría.
Tus datos viven en [`data/commands.json`](data/commands.json).

## Lo más útil

- **170+ comandos seed** repartidos en varias herramientas, incluyendo una base
  amplia de Claude Code, Git, Docker, npm, Bash y Ollama.
- **Búsqueda global real**, incluyendo modificadores/flags dentro de cada
  comando.
- **Edición completa** de herramientas, comandos, tags, notas, favoritos y
  ejemplos desde la propia interfaz.
- **Subfilas expandibles** para modifiers, útiles cuando un comando tiene flags
  que merece la pena recordar bien.
- **Orden manual con drag & drop** tanto en tabs de herramientas como en listas
  de comandos.
- **Filtros persistentes** para quedarte con lo importante: favoritos,
  frecuencia mínima, tags e importancia.
- **Import / Export JSON** con previsualización y avisos antes de mezclar datos.
- **Persistencia real en disco** mediante una API Express que guarda en
  `commands.json` con escritura atómica.

## Por qué existe

Los comandos útiles suelen terminar repartidos entre historial del shell,
gists, notas rápidas, README antiguos o memoria a medias. Eso funciona un rato.
Luego deja de escalar.

`Commands Viewer` intenta resolver justo eso:

- centralizar tus comandos frecuentes,
- añadirles contexto útil,
- poder filtrarlos rápido,
- y mantenerlos sin salirte del proyecto.

## Stack

- **Frontend**: Vite 8 + React 19 + TypeScript + Tailwind CSS v4
- **Estado**: Zustand
- **Drag & drop**: dnd-kit
- **Iconografía**: lucide-react
- **Backend local**: Express 5 sobre `tsx`
- **Persistencia**: JSON plano con escritura atómica y tolerancia a Windows

## Requisitos

- Node.js **20** o superior
- npm **10** o superior

## Puesta en marcha

```bash
npm install
npm run dev
```

Esto levanta dos procesos en paralelo:

- **API** en `http://localhost:3001`
- **UI** en `http://localhost:5173`

Abre la URL de Vite. El frontend hace proxy de `/api/*` al backend, así que no
necesitas tocar nada más para empezar.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Arranca API + UI en paralelo con hot reload |
| `npm run server` | Ejecuta solo el backend Express en watch mode |
| `npm run build` | Type-check + build de producción en `dist/` |
| `npm run preview` | Sirve el build localmente |
| `npm run lint` | Ejecuta ESLint |

## Qué puedes hacer dentro

### Explorar

- navegar por herramientas en tabs reordenables,
- ordenar por nombre, importancia o frecuencia,
- expandir modifiers para ver flags y ejemplos,
- buscar tanto en comandos como en subfilas.

### Curar tu biblioteca

- crear y editar herramientas,
- añadir comandos con descripción, hint, notas y tags,
- marcar favoritos,
- ajustar frecuencia e importancia,
- reordenar listas a mano.

### Mover datos sin miedo

- exportar tu colección a JSON,
- importar desde un fichero externo,
- revisar una previsualización antes de aplicar cambios,
- detectar avisos como slugs duplicados o comandos huérfanos.

## Modelo de datos

```ts
interface Tool {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  order: number;
}

interface Modifier {
  flag: string;
  description: string;
  example?: string;
}

interface Command {
  id: string;
  toolId: string;
  section: string;
  name: string;
  description: string;
  hint: string;
  importance: "critical" | "high" | "medium" | "low";
  frequency: number;
  tags: string[];
  notes: string;
  favorite: boolean;
  order: number;
  modifiers: Modifier[];
}
```

El formato completo del JSON importable está documentado dentro de la propia
app, en el botón **Formato** del header.

## Estructura del proyecto

```text
Commands-Viewer/
├── data/
│   └── commands.json
├── server/
│   └── index.ts
├── src/
│   ├── components/
│   ├── lib/
│   ├── store/
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Accesibilidad y UX

- navegación usable por teclado,
- focus trap en modales,
- atributos `aria-*` en interacciones clave,
- focus ring visible cuando toca,
- densidad configurable entre modo compacto y confortable.

## Filosofía

- **Local-first**: tus datos son tuyos.
- **Simpleza útil**: un JSON plano antes que una base de datos innecesaria.
- **Edición rápida**: menos fricción, más mantenimiento real.
- **Persistencia fiable**: guardado atómico para no corromper tu biblioteca.

## Licencia

MIT © [luisgele](https://github.com/luisgele)

Ver [LICENSE](LICENSE) para el texto completo.

## Créditos

Proyecto personal de [luisgele](https://github.com/luisgele), construido con
Claude Code como apoyo de desarrollo.
