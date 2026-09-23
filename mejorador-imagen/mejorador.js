/*!
 * MejoradorImagen — mejora la calidad (super-resolución con IA) de una imagen
 * directamente en el navegador, sin servidor y sin subir la imagen a internet.
 *
 * Usa UpscalerJS (MIT) + TensorFlow.js (Apache 2.0) con modelos ESRGAN.
 * Todos los archivos necesarios están en esta carpeta (vendor/ y modelos/),
 * por lo que funciona sin conexión una vez publicado.
 *
 * Uso básico:
 *   <script src="mejorador-imagen/mejorador.js"></script>
 *   const r = await MejoradorImagen.mejorar(archivo, { onProgreso: p => ... });
 *   // r.canvas, r.blob, r.url, r.ancho, r.alto, r.escala, r.usoIA
 */
(function (global) {
  'use strict';

  // Carpeta donde vive este archivo (para encontrar vendor/ y modelos/).
  var BASE = (function () {
    var s = document.currentScript;
    if (s && s.src) return new URL('.', s.src).href;
    return new URL('mejorador-imagen/', location.href).href;
  })();

  var MODELOS = {
    rapido: {
      2: { script: 'vendor/esrgan-slim-2x.min.js', global: 'ESRGANSlim2x', path: 'modelos/esrgan-slim/x2/model.json' },
      4: { script: 'vendor/esrgan-slim-4x.min.js', global: 'ESRGANSlim4x', path: 'modelos/esrgan-slim/x4/model.json' }
    },
    calidad: {
      2: { script: 'vendor/esrgan-medium-2x.min.js', global: 'ESRGANMedium2x', path: 'modelos/esrgan-medium/x2/model.json' },
      4: { script: 'vendor/esrgan-medium-4x.min.js', global: 'ESRGANMedium4x', path: 'modelos/esrgan-medium/x4/model.json' }
    }
  };

  var OPCIONES_POR_DEFECTO = {
    modelo: 'rapido',        // 'rapido' (ligero, ideal sin tarjeta gráfica) o 'calidad' (más lento, más detalle)
    escala: 'auto',          // 2, 4 o 'auto' (elige según ladoObjetivo)
    ladoObjetivo: 3000,      // con escala 'auto': lado mayor deseado en px (p.ej. póster)
    maxLadoEntrada: 1600,    // si la imagen ya es más grande que esto, no se pasa por IA (ya tiene buena resolución)
    patchSize: 96,           // procesa por bloques para no congelar la página
    padding: 6,
    formato: 'image/png',    // formato del blob de salida ('image/png' o 'image/jpeg')
    calidadJpeg: 0.95,
    onProgreso: null,        // function(0..1)
    onEstado: null           // function(texto) — mensajes como "Cargando modelo…"
  };

  // ---------- utilidades de carga ----------
  var scriptsCargados = {};
  function cargarScript(rel) {
    if (scriptsCargados[rel]) return scriptsCargados[rel];
    scriptsCargados[rel] = new Promise(function (ok, fallo) {
      var s = document.createElement('script');
      s.src = BASE + rel;
      s.onload = ok;
      s.onerror = function () { delete scriptsCargados[rel]; fallo(new Error('No se pudo cargar ' + s.src)); };
      document.head.appendChild(s);
    });
    return scriptsCargados[rel];
  }

  var basePromesa = null;
  function cargarBase() {
    if (!basePromesa) {
      basePromesa = cargarScript('vendor/tf.min.js')
        .then(function () { return cargarScript('vendor/default-model.min.js'); })
        .then(function () { return cargarScript('vendor/upscaler.min.js'); })
        .then(function () { return global.tf.ready(); });
    }
    return basePromesa;
  }

  var instancias = {};
  function obtenerUpscaler(modelo, escala) {
    var clave = modelo + escala;
    if (instancias[clave]) return instancias[clave];
    var def = MODELOS[modelo] && MODELOS[modelo][escala];
    if (!def) return Promise.reject(new Error('Modelo no disponible: ' + modelo + ' ' + escala + 'x'));
    instancias[clave] = cargarBase()
      .then(function () { return cargarScript(def.script); })
      .then(function () {
        var definicion = Object.assign({}, global[def.global], { path: BASE + def.path });
        var up = new global.Upscaler({ model: definicion });
        return up.getModel().then(function () { return up; });
      })
      .catch(function (e) { delete instancias[clave]; throw e; });
    return instancias[clave];
  }

  // ---------- utilidades de imagen ----------
  function aImagen(entrada) {
    if (entrada instanceof HTMLImageElement) {
      return entrada.complete && entrada.naturalWidth ? Promise.resolve(entrada)
        : new Promise(function (ok, fallo) { entrada.onload = function () { ok(entrada); }; entrada.onerror = fallo; });
    }
    if (entrada instanceof HTMLCanvasElement) return Promise.resolve(entrada);
    var url;
    if (entrada instanceof Blob) url = URL.createObjectURL(entrada);
    else if (typeof entrada === 'string') url = entrada;
    else return Promise.reject(new Error('Entrada no soportada: use File, Blob, <img>, <canvas> o una URL.'));
    return new Promise(function (ok, fallo) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { ok(img); };
      img.onerror = function () { fallo(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }

  function dimensiones(img) {
    return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
  }

  function aCanvas(img, w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return c;
  }

  function tieneTransparencia(canvas) {
    var d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (var i = 3; i < d.length; i += 4) if (d[i] < 255) return true;
    return false;
  }

  function canvasABlob(canvas, formato, calidad) {
    return new Promise(function (ok) { canvas.toBlob(ok, formato, calidad); });
  }

  function elegirEscala(o, w, h) {
    if (o.escala === 2 || o.escala === 4) return o.escala;
    var necesaria = o.ladoObjetivo / Math.max(w, h);
    if (necesaria <= 1) return 1;
    return necesaria <= 2 ? 2 : 4;
  }

  // ---------- API pública ----------
  function mejorar(entrada, opciones) {
    var o = Object.assign({}, OPCIONES_POR_DEFECTO, opciones || {});
    var estado = function (t) { if (o.onEstado) o.onEstado(t); };
    var progreso = function (p) { if (o.onProgreso) o.onProgreso(p); };

    return aImagen(entrada).then(function (img) {
      var d = dimensiones(img);
      var original = aCanvas(img, d.w, d.h);
      var escala = elegirEscala(o, d.w, d.h);

      function sinIA(motivo, esc) {
        esc = esc || 1;
        var c = esc === 1 ? original : aCanvas(original, d.w * esc, d.h * esc);
        progreso(1);
        return canvasABlob(c, o.formato, o.calidadJpeg).then(function (blob) {
          return { canvas: c, blob: blob, url: URL.createObjectURL(blob), ancho: c.width, alto: c.height,
                   escala: esc, usoIA: false, motivo: motivo };
        });
      }

      if (escala === 1) return sinIA('La imagen ya tiene la resolución objetivo.');
      if (Math.max(d.w, d.h) > o.maxLadoEntrada) {
        return sinIA('La imagen ya es grande (' + d.w + '×' + d.h + '); se omitió la IA para no agotar la memoria.');
      }

      var transparente = tieneTransparencia(original);
      estado('Cargando modelo de IA…');
      return obtenerUpscaler(o.modelo, escala).then(function (upscaler) {
        estado('Mejorando imagen…');
        progreso(0);
        return upscaler.upscale(original, {
          output: 'tensor',
          patchSize: o.patchSize,
          padding: o.padding,
          awaitNextFrame: true,
          progress: function (p) { progreso(p); }
        });
      }).then(function (tensor) {
        var tf = global.tf;
        var t = tf.tidy(function () { return tensor.clipByValue(0, 255).round().cast('int32'); });
        tensor.dispose();
        var salida = document.createElement('canvas');
        salida.width = t.shape[1]; salida.height = t.shape[0];
        return tf.browser.toPixels(t, salida).then(function () {
          t.dispose();
          if (transparente) {
            // El modelo trabaja en RGB: se reescala el canal alfa por separado y se reaplica.
            var alfa = aCanvas(original, salida.width, salida.height).getContext('2d')
              .getImageData(0, 0, salida.width, salida.height).data;
            var ctx = salida.getContext('2d');
            var px = ctx.getImageData(0, 0, salida.width, salida.height);
            for (var i = 3; i < px.data.length; i += 4) px.data[i] = alfa[i];
            ctx.putImageData(px, 0, 0);
          }
          estado('Listo');
          progreso(1);
          return canvasABlob(salida, o.formato, o.calidadJpeg).then(function (blob) {
            return { canvas: salida, blob: blob, url: URL.createObjectURL(blob), ancho: salida.width, alto: salida.height,
                     escala: escala, usoIA: true, motivo: null };
          });
        });
      }).catch(function (err) {
        console.warn('[MejoradorImagen] Falló la IA, se usa reescalado normal:', err);
        estado('No se pudo usar la IA; se aplicó reescalado normal.');
        return sinIA('Error de IA: ' + (err && err.message), escala);
      });
    });
  }

  /** Carga el modelo por adelantado (p. ej. al abrir la página) para que la primera mejora sea más rápida. */
  function precargar(modelo, escala) {
    return obtenerUpscaler(modelo || 'rapido', escala || 2).then(function () { return true; });
  }

  global.MejoradorImagen = { mejorar: mejorar, precargar: precargar, opcionesPorDefecto: OPCIONES_POR_DEFECTO };
})(window);
