# Herramientas de Impresión

Dos herramientas internas que corren **completamente en el navegador** — ningún archivo se sube a un servidor:

- **Generador de Póster** (`poster.html`) — arma un afiche grande imprimiéndolo en hojas de papel normal (Carta, Oficio, A4, Legal, Tabloide o un tamaño personalizado). Genera un PDF listo para imprimir, con vista previa de la cuadrícula, marcas de corte, numeración de hojas y una hoja guía con instrucciones de armado. Si la imagen que subes tiene poca resolución, se mejora automáticamente con IA antes de usarla (ver abajo).
- **Mejorador de Imágenes** (`mejorador.html`) — amplía y afina una foto con inteligencia artificial (modelos ESRGAN), mostrando el antes y el después, con descarga del resultado en PNG. Se puede usar de forma independiente o como paso previo al póster.
- **Menú** (`index.html`) — pantalla de inicio para elegir cuál de las dos abrir.

**Diseñado por Ing. Jonathan Canales.**

## Uso local

No requiere instalación ni compilación. Pero el mejorador de imágenes **sí necesita abrirse desde un servidor** (no funciona con doble clic / `file://`), porque el navegador bloquea la carga de los modelos de IA en ese modo. Ver la sección de publicación más abajo, o localmente:

```bash
npx serve .
# o
python3 -m http.server
```

y abre `http://localhost:.../index.html`.

(El Generador de Póster por sí solo, sin mejora de imagen, sí abre con doble clic; pero como ambas herramientas comparten el mismo `index.html` de inicio, lo más simple es siempre usar un servidor local o GitHub Pages.)

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub y sube este proyecto (todas las carpetas y archivos, incluida `mejorador-imagen/`):

   ```bash
   git init
   git add .
   git commit -m "Herramientas de impresión"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git push -u origin main
   ```

2. En GitHub, entra a **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige la rama `main` y la carpeta `/ (root)`.
5. Guarda. GitHub publicará el sitio en `https://<tu-usuario>.github.io/<tu-repo>/` (puede tardar uno o dos minutos).

No hay backend ni variables de entorno que configurar: todo el procesamiento (mejora de imagen, lectura de la imagen y generación del PDF) ocurre en el navegador de quien use la herramienta.

## Cómo funciona la mejora de imagen con IA

Usa [UpscalerJS](https://github.com/thekevinscott/UpscalerJS) (MIT) + [TensorFlow.js](https://github.com/tensorflow/tfjs) (Apache 2.0) con modelos ESRGAN incluidos en la carpeta `mejorador-imagen/` (no dependen de ningún CDN externo, ~9 MB en total).

- Funciona en computadoras sin tarjeta gráfica dedicada (usa la GPU integrada vía WebGL, y si no hay, la CPU).
- Si la imagen ya tiene buena resolución, o si algo falla, se usa la imagen original sin ningún cambio — el flujo nunca se detiene.
- En **Generador de Póster**, esto ocurre automáticamente al cargar una imagen (se puede desactivar con el interruptor "Mejorar con IA al cargar"). Solo se aplica si realmente hace falta: una imagen que ya es grande se deja intacta, tal cual la subiste, para no perder calidad ni tiempo de proceso.
- En **Mejorador de Imágenes**, se controla manualmente: eliges modelo (rápido o calidad), escala (2×, 4× o automática) y el tamaño objetivo.

## Requisitos de la imagen

- Formatos aceptados: **PNG** o **JPG/JPEG**.
- Cuando no se aplica mejora con IA, la imagen se incrusta en el PDF tal cual, sin recodificar, para preservar la calidad máxima.
- El indicador de "Calidad de impresión (DPI)" en el Generador de Póster avisa si el tamaño final elegido excede lo que la resolución de la imagen puede sostener con nitidez.

## Estructura

```
index.html            # menú de inicio (elige herramienta)
poster.html            # Generador de Póster
mejorador.html          # Mejorador de Imágenes (standalone)
mejorador-imagen/        # motor de mejora con IA (compartido por ambas herramientas)
  mejorador.js
  vendor/                # TensorFlow.js + UpscalerJS
  modelos/                # pesos de los modelos ESRGAN (rápido y calidad, 2× y 4×)
  licencias/
README.md
```

Dependencias externas: [pdf-lib](https://pdf-lib.js.org/) (cargada desde CDN, solo en `poster.html`, para construir el PDF). Todo lo demás —incluida la IA— va incluido en el proyecto.
