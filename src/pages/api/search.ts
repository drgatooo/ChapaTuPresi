import type { APIRoute } from 'astro';
import prisma from '@/lib/prisma';
import { $Enums, Cargo } from '@prisma/client';
import Fuse from 'fuse.js';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  console.log(url.searchParams);

  const query = url.searchParams.get('q') || '';
  const type = url.searchParams.get('type') || 'todos';
  
  // Filtros Candidato
  const cargo = url.searchParams.get('cargo');
  const region = url.searchParams.get('region');
  const sentencias = url.searchParams.get('sentencias') === 'true';
  const postgrado = url.searchParams.get('postgrado') === 'true';
  const expPolitica = url.searchParams.get('exp_politica') === 'true';

  // Filtros Partido
  const ideologia = url.searchParams.get('ideologia');
  const posicion = url.searchParams.get('posicion');
  const alianza = url.searchParams.get('alianza') === 'true';
  const partido = url.searchParams.get('partido');

  try {
    let candidatosFinales: { slug: string; nombre: string; apellido_p: string; apellido_m: string; foto_url: string; cargo: $Enums.Cargo[]; sentencias: { id_expediente: string; delito: string; fallo: string; fecha: string; tx_pena: string; comentario: string | null; }[]; partido: { siglas: string; }; }[] = [];
    let partidosFinales: { slug: string; nombre: string; siglas: string; logo_url: string; }[] = [];

    // 1. OBTENER Y FILTRAR CANDIDATOS
    if (type === 'todos' || type === 'candidatos') {
      // Traemos pre-filtrados los datos "duros" desde la BD
      const candidatosDB = await prisma.candidato.findMany({
        where: {
          ...(cargo && { cargo: { has: cargo as Cargo } }),
          ...(region && { postula_region: region }),
          ...(sentencias && { sentencias: { isEmpty: false } }),
          ...(partido && { partido: { slug: partido } }),
          // Filtros anidados complejos:
          ...(postgrado && { educacion: { is: { universitario: { some: { postgrado: true } } } } }),
          ...(expPolitica && { experiencia: { some: { politica: true } } }),
        },
        // Solo seleccionamos lo necesario para no saturar la RAM del servidor
        select: {
          slug: true, nombre: true, apellido_p: true, apellido_m: true, foto_url: true, cargo: true, sentencias: true,
          partido: { select: { siglas: true, logo_url: true } }
        }
      });

      if (query) {
        // Concatenamos el nombre completo al vuelo para Fuse.js
        const candidatosConNombreCompleto = candidatosDB.map(c => ({
          ...c,
          nombre_completo: `${c.nombre} ${c.apellido_p} ${c.apellido_m}`
        }));

        const fuseCandidatos = new Fuse(candidatosConNombreCompleto, {
          keys: ['nombre_completo', 'partido.siglas'],
          threshold: 0.3, // 0.0 es coincidencia exacta, 1.0 es cualquier cosa. 0.3 es ideal para errores de tipeo.
          ignoreLocation: true,
        });

        candidatosFinales = fuseCandidatos.search(query).map(result => result.item).slice(0, 250);
        console.log(query);
        
      } else {
        candidatosFinales = candidatosDB.slice(0, 250);
      }
    }

    // 2. OBTENER Y FILTRAR PARTIDOS
    if (type === 'todos' || type === 'partidos') {
      const partidosDB = await prisma.partido.findMany({
        where: {
          ...(ideologia && { ideologia: { has: ideologia } }),
          ...(posicion && { posicion: { equals: posicion, mode: 'insensitive' } }),
          ...(alianza && { alianza: true }),
        },
        select: { slug: true, nombre: true, siglas: true, logo_url: true }
      });

      if (query) {
        const fusePartidos = new Fuse(partidosDB, {
          keys: ['nombre', 'siglas'],
          threshold: 0.3,
        });
        partidosFinales = fusePartidos.search(query).map(result => result.item);
      } else {
        partidosFinales = partidosDB;
      }
    }

    return new Response(JSON.stringify({ candidatos: candidatosFinales, partidos: partidosFinales }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Error en la búsqueda' }), { status: 500 });
  }
}