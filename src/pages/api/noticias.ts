// src/pages/api/noticias.ts
import type { APIRoute } from 'astro';
import Parser from "rss-parser";
import { GoogleDecoder } from "@/lib/googleNews";
import { dateToRelativeTime } from '@/lib/ms-es';

export const GET: APIRoute = async ({ request, url }) => {
    const parser = new Parser();
    const decoder = new GoogleDecoder();
    
    // 1. Obtenemos el parámetro 'q' si existe
    const customQuery = url.searchParams.get('q');
    
    // Si hay un query custom, le agregamos "Perú" para dar contexto, sino la búsqueda general
    const query = customQuery ? `"${customQuery}" Perú` : "Elecciones generales de Perú de 2026";
    const URL = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&gl=PE&hl=es-419&ceid=PE:es-419`;

    try {
        const feed = await parser.parseURL(URL);
        const items = feed.items.slice(0, 5);
        const articleURLs = items.map((item) => item.link!);

        const decodedResults = await decoder.decodeBatch(articleURLs);

        const noticias = decodedResults.map((result, i) => {
            const originalRSSItem = items.find(it => it.content?.toLowerCase().includes(result.title?.toLowerCase() || ''));
            const date = result.date || originalRSSItem?.pubDate;

            return ({
                title: result.title || originalRSSItem?.title,
                source: result.source || originalRSSItem?.author,
                link: result.link || result.source_url,
                date: date ? dateToRelativeTime(new Date(date)) : null,
                image: result.image || null,
            });
        });

        return new Response(JSON.stringify(noticias), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                // Reducimos un poco el caché para candidatos específicos (30 mins en vez de 1h)
                "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600"
            }
        });
    } catch (e) {
        console.error("Error en API Noticias:", e);
        return new Response(JSON.stringify({ error: 'Fallo al obtener noticias' }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}