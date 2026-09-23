# Mejorador de imagen (IA local) para la herramienta de pósters

Mejora la resolución y nitidez de una imagen **dentro del navegador**, con IA (modelos ESRGAN), antes de convertirla en póster. Funciona igual que upscale.media, pero sin servidor, sin costo y sin subir la imagen a internet.

- Todo va incluido en esta carpeta (librerías y modelos, ~9 MB). No depende de ningún CDN.
- Funciona en computadoras **sin tarjeta gráfica dedicada**: usa la GPU integrada vía WebGL y, si no la hay, la CPU.
- Si algo falla, hace un reescalado normal de alta calidad para que el flujo del póster nunca se detenga.

## Contenido

```
mejorador-imagen/
├── mejorador.js      ← el único archivo que tienes que incluir
├── demo.html         ← página de prueba (antes / después)
├── vendor/           ← TensorFlow.js + UpscalerJS + definiciones de modelos
├── modelos/          ← pesos de los modelos (rápido y calidad, 2× y 4×)
└── licencias/
```

## Integración en tu herramienta de pósters (3 pasos)

**1. Copia la carpeta** `mejorador-imagen/` dentro de tu proyecto, junto a tu `index.html`.

**2. Incluye el script** en tu HTML, antes de tu propio código:

```html
<script src="mejorador-imagen/mejorador.js"></script>
```

**3. Pasa la imagen subida por el mejorador antes de crear el póster.** Donde hoy tienes algo como:

```js
inputImagen.addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  crearPoster(URL.createObjectURL(archivo));   // ← tu código actual
});
```

cámbialo por:

```js
inputImagen.addEventListener('change', async (e) => {
  const archivo = e.target.files[0];

  const r = await MejoradorImagen.mejorar(archivo, {
    onEstado:   (texto) => mensaje.textContent = texto,           // "Cargando modelo…", "Mejorando imagen…"
    onProgreso: (p)     => barra.style.width = (p * 100) + '%',   // 0 → 1
  });

  crearPoster(r.url);   // la misma función de siempre, ahora con la imagen mejorada
});
```

`r` contiene:

| Propiedad | Qué es |
|---|---|
| `r.url` | URL de la imagen mejorada (para `<img src>`, `drawImage`, etc.) |
| `r.canvas` | un `<canvas>` con la imagen mejorada (si tu póster dibuja en canvas: `ctx.drawImage(r.canvas, …)`) |
| `r.blob` | el archivo PNG (para descargar o enviar) |
| `r.ancho`, `r.alto` | tamaño final en píxeles |
| `r.usoIA` | `true` si se aplicó IA; `false` si no hizo falta o hubo un error |
| `r.motivo` | por qué no se usó IA (si aplica) |

Opcional: llama `MejoradorImagen.precargar()` al abrir la página para que el modelo ya esté listo cuando el usuario suba la imagen.

## Opciones

```js
MejoradorImagen.mejorar(archivo, {
  modelo: 'rapido',       // 'rapido' (ligero) o 'calidad' (más detalle, ~3× más lento)
  escala: 'auto',         // 2, 4 o 'auto'
  ladoObjetivo: 3000,     // con 'auto': lado mayor deseado del póster, en px
  maxLadoEntrada: 1600,   // imágenes más grandes que esto ya tienen buena resolución y se dejan igual
  formato: 'image/png',   // o 'image/jpeg'
});
```

Con `escala: 'auto'` se elige el factor según lo que falte para llegar a `ladoObjetivo`: una foto de 800 px se amplía 4×, una de 1200 px 2×, y una de 3000 px se deja intacta.

## Importante: debe abrirse desde un servidor

Los navegadores no permiten cargar los modelos si abres el HTML con doble clic (`file://`). Opciones:

- **GitHub Pages** (lo más fácil si ya lo tienes en GitHub): *Settings → Pages → Deploy from branch → main*. Funciona tal cual.
- **En tu PC**: en la carpeta del proyecto ejecuta `npx serve` o `python -m http.server`, o usa la extensión *Live Server* de VS Code, y abre `http://localhost:…`.

## Rendimiento esperado

Depende del equipo. Con GPU integrada (WebGL), una imagen de ~800 px suele tardar unos segundos en modo rápido. Sin WebGL (solo CPU) es bastante más lento: en la prueba, una imagen de 200×150 a 4× tardó ~36 s en modo rápido. Por eso el límite `maxLadoEntrada` y el procesamiento por bloques (la página no se congela mientras trabaja).

Notas:
- El modelo trabaja en RGB; la transparencia de PNG (logos, recortes) se conserva reescalando el canal alfa aparte.
- Para imágenes muy grandes, el navegador puede quedarse sin memoria; baja `maxLadoEntrada` si pasa en equipos modestos.

## Licencias

- [UpscalerJS](https://github.com/thekevinscott/UpscalerJS) y sus modelos — MIT (pesos ESRGAN entrenados con *idealo/image-super-resolution*, Apache 2.0)
- [TensorFlow.js](https://github.com/tensorflow/tfjs) — Apache 2.0

Todas permiten uso comercial y en proyectos cerrados.
