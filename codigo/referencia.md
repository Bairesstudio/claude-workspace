# Código de referencia - Baires Studio

## Expresión de duración en Build Slot

```js
{{
  (() => {
    const s = ($('Flatten + Base Fields').item.json.servicio || '')
      .toLowerCase().trim().normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ /g, '_');
    return Number($('CONFIG - Cliente').item.json['duracion_minutos_' + s] ?? 60);
  })()
}}
```

## Fórmula de overlap

Hay superposición si:

```
nuevo_inicio < existente_fin  Y  nuevo_fin > existente_inicio
```

Ejemplo: turno existente 10:00 a 11:30. Nuevo a las 11:30:
`11:30 < 11:30` -> falso. Resultado: no hay superposición. Se permite.

## Mensajes de respuesta recomendados

| Caso | Payload sugerido |
|---|---|
| Libre | `{ "ok": true, "message": "Turno reservado con éxito." }` |
| Ocupado | `{ "ok": false, "message": "Ese horario ya está ocupado, elegí otro." }` |
| Error interno | `{ "ok": false, "message": "Hubo un problema. Intenta nuevamente." }` |

---

## Notas / snippets futuros

_(Agregar acá nuevos nodos de código, fixes de bugs, y soluciones a problemas pendientes de la sección 10 del documento principal)_
