# Epidemias estacionales (Sentinelles)

Infecciones respiratorias agudas, diarrea aguda (gastroenteritis) y varicela en su región francesa, tal como la **red
Sentinelles** (Inserm, Sorbonne Université) las mide cada semana con médicos generalistas: un dispositivo por región,
con la tasa semanal de cada enfermedad y su tendencia. Incluye disparadores de escena, una acción de escena y un
widget de panel.

> **Información epidemiológica, no un consejo médico.** Son estimaciones para toda una región, con amplios intervalos
> de confianza. Para su salud, consulte a su médico.

Sin afiliación con la red Sentinelles.

## Lo que obtiene

- **Un dispositivo por zona** elegida: las 13 regiones de la Francia metropolitana y la Francia metropolitana entera.
- Para cada enfermedad, la **tasa de la última semana** (casos vistos por los médicos generalistas, por 100.000
  habitantes) y su **tendencia** respecto a la semana anterior (en aumento, estable, en descenso).
- La **semana de los datos** («43 (19 – 25 oct 2026)»).
- Dos **disparadores de escena** (una tasa supera un umbral o vuelve a bajar de él), una **acción de escena** (la
  semana en una frase) y un **widget de panel**.

## Requisitos

- Gladys Assistant 5.3.0 o posterior.
- Acceso a Internet desde Gladys. Ni cuenta ni clave.
- Solo Francia metropolitana: la red no cubre las regiones de ultramar.

## Configuración

### Ajustes

| Ajuste                                 | Por defecto | Función                                                                        |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| Zonas                                  | ninguna     | Las regiones que se siguen (y Francia metropolitana), un dispositivo cada una. |
| Idioma de los nombres de las funciones | Francés     | Nombres de nuevos dispositivos y funciones, idioma de sus textos y resumen.    |

Guarde y abra la pestaña **Descubrir** de la integración para crear los dispositivos que desee.

## Dispositivos

| Función                                 | Tipo   | Valor                                                    |
| --------------------------------------- | ------ | -------------------------------------------------------- |
| Infecciones respiratorias /100.000 hab. | número | Infecciones respiratorias agudas (gripe, COVID-19, VRS…) |
| Infecciones respiratorias, tendencia    | texto  | en aumento, estable o en descenso                        |
| Diarrea aguda /100.000 hab.             | número | Diarrea aguda (gastroenteritis)                          |
| Diarrea aguda, tendencia                | texto  | en aumento, estable o en descenso                        |
| Varicela /100.000 hab.                  | número | Varicela                                                 |
| Varicela, tendencia                     | texto  | en aumento, estable o en descenso                        |
| Semana de los datos                     | texto  | Número de semana ISO y sus días                          |

La **tendencia** es «en aumento» o «en descenso» cuando la tasa varió un 15 % o más respecto a la semana anterior **y**
5 por 100.000 o más; si no, «estable». Las tasas son números: una condición de escena como «infecciones respiratorias
≥ 200» funciona.

## Widget de panel

**Epidemias estacionales**: la zona elegida (si no, la primera seguida), con una línea por enfermedad con su tasa y
su tendencia, en naranja al alza y en verde a la baja, y una leyenda con la semana y la fuente. Un ajuste elige las
enfermedades mostradas y otro oculta la leyenda.

## Disparadores de escena

- **La tasa epidémica supera un umbral**: al publicarse una nueva semana, la tasa de una enfermedad en una zona supera
  el umbral elegido (de 25 a 1.000 por 100.000) al alza. Filtros: zona, enfermedad, umbral.
- **La tasa epidémica baja de un umbral**: lo mismo, a la baja: la ola ha pasado en su zona.

Variables: zona, enfermedad, tasa, tasa anterior, semana. La primera semana leída tras la instalación solo fija la
referencia: no dispara nada. La tasa anterior es la que mostraba el dispositivo: una revisión de semanas pasadas por
Sentinelles nunca dispara dos veces un cruce.

## Acción de escena

**Epidemias: obtener la semana en una frase**: devuelve, para una zona (vacío: la primera seguida), una frase lista
para una notificación, como «Occitania, semana 43 (casos por 100.000 habitantes): Infecciones respiratorias 196 (en
aumento), Diarrea aguda 58 (en aumento), Varicela 4 (estable).», en el idioma de la configuración, con el número de
semana y cada tasa como salidas separadas.

## Ejemplos de escenas

- Cada jueves a las 8 h, enviar la frase de su región al grupo familiar.
- Cuando la diarrea aguda supere 200 en su región, recordar a todos que se laven las manos.
- Cuando las infecciones respiratorias vuelvan a bajar de 100, anunciar el fin de la ola invernal.

## Fuentes de datos, licencia y cuotas

- Fuente: **réseau Sentinelles, INSERM, Sorbonne Université**, [www.sentiweb.fr](https://www.sentiweb.fr), API pública
  Sentiweb, leída sin cuenta. Son estimaciones a partir de los médicos generalistas de la red (con amplios intervalos
  de confianza para las regiones).
- Actualizada una vez por semana, por lo general el miércoles por la tarde. La API admite 15 solicitudes cada
  10 minutos y pide descargar solo lo que cambió: la integración consulta la versión de los datos una vez por hora y
  solo descarga los conjuntos de datos (3 por nivel, regiones o Francia) cuando ha cambiado. Tras una respuesta
  «demasiadas solicitudes», espera el plazo que anuncia la API, reinicios incluidos.
- El síndrome gripal, indicador histórico de la gripe, ya no se vigila: la gripe se cuenta en las infecciones
  respiratorias agudas.

## Solución de problemas

- **Ningún valor tras crear el dispositivo**: espere unos segundos a la primera descarga; compruebe que Gladys tiene
  acceso a Internet.
- El estado de conexión indica que los datos de Sentinelles no se pueden leer: la API no responde; se conservan los
  últimos valores y la integración lo vuelve a intentar cada hora.
- El estado de conexión indica que la API pide esperar: se alcanzó su límite de solicitudes (quizá por otro equipo de
  su red). La integración espera y lo vuelve a intentar sola.

## Límites

- Desarrollada y probada con la API real, aún no dentro de un Gladys en funcionamiento: se agradecen los comentarios.
- Las tasas regionales son estimaciones con amplios intervalos de confianza: un cambio pequeño no es significativo,
  de ahí el margen de la tendencia.
- Sin «nivel epidémico» oficial: Sentinelles publica tasas, y Santé publique France no publica un nivel epidémico
  regional abierto que una integración pueda leer. Los umbrales de los disparadores los elige usted.
