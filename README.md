
# 🇵🇪 Chapa tu Presi — Elecciones Generales 2026

![Astro](https://img.shields.io/badge/Astro-0C111A?style=for-the-badge&logo=astro&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

**Chapa tu Presi** es una iniciativa de tecnología cívica (*civic tech*) nacida del hartazgo y las ganas de mejorar nuestro país. Transformamos los PDFs burocráticos del Estado y la opacidad de los datos electorales en una plataforma rápida, clara y accesible para todos los peruanos.

El voto informado no debería ser un privilegio ni un dolor de cabeza.

## ✨ Características Principales

* 🔍 **Buscador Especializado:** Búsqueda difusa (fuzzy search) de candidatos y partidos por nombre, región, sentencias y nivel educativo.
* 🏛️ **Perfiles de Alto Impacto:** Hojas de vida limpias, destacando primero lo que importa: sentencias penales, formación académica y experiencia política.
* 📜 **Planes de Gobierno resumidos:** Resúmenes ejecutivos de los planes de gobierno estructurados por ejes (Social, Económico, Ambiental, Institucional).
* 📖 **Diccionario Político:** Un glosario interactivo para entender qué proponen las distintas ideologías y qué partidos las respaldan.
* ⚡ **Ultra Rápido y Ligero:** Construido con Astro para garantizar que la web cargue instantáneamente incluso en conexiones móviles 3G.

## 🛠️ Stack Tecnológico

* **Frontend:** [Astro](https://astro.build/) + [Tailwind CSS](https://tailwindcss.com/)
* **Backend / API:** Endpoints nativos de Astro + [Fuse.js](https://fusejs.io/) (para búsqueda)
* **Base de Datos:** [MongoDB](https://www.mongodb.com/)
* **ORM:** [Prisma](https://www.prisma.io/)
* **Lenguaje:** TypeScript

---

## 🚀 Instalación y Desarrollo Local

Si quieres correr el proyecto en tu máquina para experimentar o contribuir, sigue estos pasos:

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/drgatooo/ChapaTuPresi.git
   cd ChapaTuPresi
   ```

2. **Instala las dependencias:**
(Recomendamos usar `pnpm`, pero `npm` o `yarn` también funcionan)
```bash
pnpm install
```


3. **Configura las variables de entorno:**
Crea un archivo `.env` en la raíz del proyecto basándote en el `.env.example`:
```env
DATABASE_URL="mongodb+srv://<usuario>:<password>@cluster.mongodb.net/chapatupresi?retryWrites=true&w=majority"
```


4. **Sincroniza Prisma:**
Genera el cliente de Prisma para conectarte a tu base de datos:
```bash
pnpm run generate
pnpm run db:push
```


5. **Inicia el servidor de desarrollo:**
```bash
pnpm dev
```


Abre `http://localhost:4321` en tu navegador para ver la web :3

---

## 🗣️ Debates y Contribuciones (GitHub Discussions)

Este proyecto es de y para los ciudadanos. Sabemos que la política peruana es compleja y los datos a veces tienen matices o errores de origen (JNE, etc.).

Por eso, **utilizamos activamente [GitHub Discussions](https://github.com/drgatooo/ChapaTuPresi/discussions) como nuestro foro público.**

¿Para qué usar Discussions?

* 📊 **Corrección de Datos:** ¿Un candidato actualizó su información judicial? ¿Falta un partido? Abre un hilo con la fuente oficial (JNE, Poder Judicial, El Peruano) para debatirlo y actualizar la base de datos.
* 💡 **Nuevas Ideas (Features):** Si se te ocurre un filtro nuevo, una métrica interesante o una mejor forma de visualizar el parlamento, cuéntanos tu idea antes de escribir código.
* 🐛 **Reporte de Bugs:** Si algo se rompió en la web, avísanos.

### ¿Quieres programar? (Pull Requests)

¡Toda ayuda técnica es bienvenida!

1. Revisa los *Issues* abiertos o propón tu idea en *Discussions*.
2. Haz un Fork del repositorio.
3. Crea tu rama (`git checkout -b feature/nueva-idea`).
4. Haz commit de tus cambios (`git commit -m 'Añade filtro por experiencia'`).
5. Haz push a la rama (`git push origin feature/nueva-idea`).
6. Abre un Pull Request.

---

## 👥 El Equipo

Proyecto construido por ciudadanos independientes, sin afiliación partidaria:

* **Dr. Gato** (yio :3) - Desarrollo y Arquitectura
* **Flan** - Diseño e Investigación

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE.md](LICENSE.md) para más detalles. Los datos mostrados pertenecen a fuentes públicas del Estado Peruano.
