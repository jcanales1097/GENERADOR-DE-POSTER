# Generador de Póster

Herramienta interna para armar afiches grandes imprimiéndolos en hojas de papel normal (Carta, Oficio, A4, Legal, Tabloide o un tamaño personalizado). Genera un PDF listo para imprimir, con vista previa de la cuadrícula, marcas de corte, numeración de hojas y una hoja guía con instrucciones de armado.

Es una sola página HTML (`index.html`) que corre completamente en el navegador: la imagen que subes **nunca se envía a ningún servidor**, y se incrusta en el PDF en su resolución original (sin recompresión), para no perder calidad.

**Diseñado por Ing. Jonathan Canales.**

## Uso local

No requiere instalación ni compilación. Simplemente abre `index.html` en un navegador moderno (Chrome, Edge, Safari, Firefox).

```bash
open index.html   # macOS
# o simplemente haz doble clic sobre el archivo
```

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub y sube este proyecto:

   ```bash
   git init
   git add .
   git commit -m "Generador de Póster"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git push -u origin main
   ```

2. En GitHub, entra a **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige la rama `main` y la carpeta `/ (root)`.
5. Guarda. GitHub publicará el sitio en `https://<tu-usuario>.github.io/<tu-repo>/` (puede tardar uno o dos minutos).

No hay backend ni variables de entorno que configurar: todo el procesamiento (lectura de la imagen y generación del PDF) ocurre en el navegador de quien use la herramienta.

## Requisitos de la imagen

- Formatos aceptados: **PNG** o **JPG/JPEG** (se incrustan en el PDF tal cual, sin recodificar, para preservar la calidad máxima).
- No hay límite de resolución fijado por la herramienta; el indicador de "Calidad de impresión (DPI)" te avisa si el tamaño final elegido excede lo que la resolución de tu imagen puede sostener con nitidez.

## Estructura

```
index.html   # aplicación completa (HTML + CSS + JS), sin dependencias de build
README.md    # este archivo
```

La única dependencia externa es [pdf-lib](https://pdf-lib.js.org/) (cargada desde CDN) para construir el PDF en el navegador.
