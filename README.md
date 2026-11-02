# Paso a paso

Aplicación web responsive para registrar los pasos diarios de un grupo y consultar el ranking del día, de la semana o histórico.

## Stack

- HTML, CSS y JavaScript vanilla.
- Firebase Firestore para almacenar los pasos y sincronizar el ranking en tiempo real.
- Firebase SDK cargado desde CDN, sin bundler ni servidor propio.
- GitHub Pages como hosting estático.

## Estructura

```text
.
├── .github/
├── .gitignore
├── index.html
├── site.webmanifest
├── dist/
│   ├── assets/
│   │   └── favicon.svg
│   ├── css/style.css
│   ├── js/
│   ├── site.webmanifest
│   └── .nojekyll
├── firestore.rules
├── README.md
├── scripts/build.py
└── src/
    ├── assets/
    │   └── favicon.svg
    ├── css/style.css
    ├── images/
    ├── js/
    │   ├── firebase-config.js
    │   └── main.js
    └── pages/
        └── home.html
```

`src/` contiene la fuente de desarrollo, `index.html` es la entrada que necesita
GitHub Pages cuando se publica desde la raíz y `dist/` es la salida generada
alternativa. No hay copias manuales de CSS, JavaScript o configuración Firebase:
la fuente única está en `src/`.

## Modelo de datos

Los pasos se guardan en la colección `steps` de Firestore. Cada documento representa a una persona en una fecha:

```text
steps/{persona}-{fecha}
├── person: "Jorge"
├── date: "2026-11-02"
├── steps: 8500
└── updatedAt: server timestamp
```

Si se vuelve a guardar la misma persona y fecha, se actualiza ese registro en vez de duplicarlo.

## Configuración de Firebase

La configuración pública del proyecto está en [`src/js/firebase-config.js`](./src/js/firebase-config.js). Las claves de configuración web de Firebase no son secretos; la protección real debe hacerse con Authentication y reglas de Firestore.

1. En Firebase Console, abre el proyecto `competicion-pasos`.
2. Activa **Firestore Database** en modo producción.
3. Publica el contenido de [`firestore.rules`](./firestore.rules) desde la pestaña **Firestore Database > Rules** y pulsa **Publish**. Guardar el archivo en GitHub no publica automáticamente las reglas en Firebase.
4. Comprueba que el dominio de GitHub Pages está autorizado en **Authentication > Settings > Authorized domains** si más adelante se añade login.

También puedes publicarlas con Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use competicion-pasos
firebase deploy --only firestore:rules
```

Para comprobarlo, abre la aplicación y revisa que la petición a
`googleapis.com` ya no devuelve `403`. Si el error continúa, verifica que
Firestore está abierto en el mismo proyecto cuyo `projectId` aparece en
[`src/js/firebase-config.js`](./src/js/firebase-config.js): `competicion-pasos`.

> La regla incluida permite lectura y escritura sin autenticación para esta primera versión, porque la app identifica a las personas mediante un selector. Aun así, valida los campos, las personas permitidas y el rango de pasos. Para un entorno público real se recomienda añadir Firebase Authentication y restringir las reglas por usuario.

## Ejecutar localmente

Al usar módulos ES y Firestore, hay que servir la carpeta con un servidor HTTP (no abrir el HTML directamente con `file://`):

```bash
python3 -m http.server 8080
```

Después abre `http://localhost:8080`.

## Publicar en GitHub Pages

1. Sube el contenido del repositorio a GitHub.
2. Ve a **Settings > Pages**.
3. En **Build and deployment**, selecciona `Deploy from a branch`.
4. Selecciona la rama principal y la carpeta `/ (root)`.
5. Guarda y espera a que GitHub Pages publique la URL.

La aplicación puede ejecutarse directamente desde la raíz con `index.html`. Para generar la salida organizada de GitHub Pages:

```bash
python3 scripts/build.py
```

El script genera `dist/index.html` con las rutas correctas para GitHub Pages.
Para GitHub Pages se puede seleccionar `dist` si el repositorio permite
configurar esa carpeta; si Pages solo ofrece la raíz, publica la raíz porque
mantiene el `index.html` original.

## Funcionalidades actuales

- Perfil inicial entre Jorge, Gema, José, Rosalía, Manuel Andrés, José Antonio, Pablo y Lucía.
- Registro de pasos por persona y fecha.
- Una única entrada diaria por persona, con edición desde el historial.
- Borrado de entradas desde el historial, con confirmación.
- El ranking solo muestra personas con actividad en el periodo elegido; el resto aparece en “Sin actividad”.
- Contador de entradas registradas por persona dentro del ranking.
- Modal reutilizable para añadir y corregir datos.
- Ranking diario, semanal e histórico.
- Distancia aproximada en kilómetros (750 metros por cada 1.000 pasos).
- Indicadores visuales para primer puesto (oro), segundo (plata), tercero (bronce) y último puesto (más vago).
- Sincronización en tiempo real entre dispositivos.
- Modo claro/oscuro.
- Preferencia de tema y perfil guardada en `localStorage` por navegador y dispositivo.
- Diseño mobile-first.
- Botón volver arriba.

## Preferencias locales

La aplicación guarda estas preferencias en el navegador:

```text
paso-a-paso-profile  -> perfil seleccionado
paso-a-paso-theme    -> "dark" o "light"
```

Por eso, cuando una persona vuelve a abrir la app en el mismo navegador y
dispositivo, conserva su perfil y el tema elegido. Estas preferencias no se
comparten entre móviles ni se almacenan en Firebase; los pasos sí son datos
compartidos en Firestore.
