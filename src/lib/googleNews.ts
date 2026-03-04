/**
 * GoogleDecoder - Decodificador de URLs de Google News
 * Basado en el trabajo de zindont (https://github.com/zindont/google-news-url-decoder/)
 * * MIT License
 * Copyright (c) 2024 zindont
 * * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files... (y más vainas, pero un grande el tipazo :v)
 */

import { parse } from 'node-html-parser';
import * as cheerio from 'cheerio';
import axios from 'axios';

interface Base64Response {
    status: boolean;
    base64_str?: string;
    message?: string;
}

interface DecodingParamsResponse {
    status: boolean;
    signature?: string | null;
    timestamp?: string | null;
    base64_str?: string;
    message?: string;
}

interface ArticleMetadata {
    title?: string;
    source?: string;
    link?: string;
    date?: string;
    image?: string | null;
}

interface DecodeResult extends ArticleMetadata {
    status: boolean;
    source_url: string;
    message?: string;
}

// Para uso interno en el procesamiento por lotes
interface BatchInternalResult extends DecodingParamsResponse {
    source_url: string;
}

export class GoogleDecoder {
    private proxy: string | null;

    constructor(proxy: string | null = null) {
        this.proxy = proxy;
    }

    /**
     * Extrae el string base64 de una URL de Google News.
     */
    public getBase64Str(sourceUrl: string): Base64Response {
        try {
            const url = new URL(sourceUrl);
            const pathParts = url.pathname.split('/').filter(part => part.length > 0);

            if (
                url.hostname === "news.google.com" &&
                pathParts.length >= 2 &&
                ["articles", "read"].includes(pathParts[pathParts.length - 2])
            ) {
                return { status: true, base64_str: pathParts[pathParts.length - 1] };
            }
            return { status: false, message: "Invalid Google News URL format." };
        } catch (e) {
            const error = e as Error;
            return { status: false, message: `Error in getBase64Str: ${error.message}` };
        }
    }

    /**
     * Obtiene la firma (signature) y el timestamp necesarios para la decodificación.
     */
    public async getDecodingParams(base64Str: string): Promise<DecodingParamsResponse> {
        let response: Response | undefined;
        try {
            const url = `https://news.google.com/rss/articles/${base64Str}`;
            response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'max-age=0',
                    'Sec-Ch-Ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                }
            });

            if (!response.ok) {
                await response.body?.cancel();
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            const root = parse(html);
            const dataElement = root.querySelector('c-wiz > div[jscontroller]');

            if (!dataElement) {
                return {
                    status: false,
                    message: "Failed to fetch data attributes from Google News.",
                };
            }

            return {
                status: true,
                signature: dataElement.getAttribute('data-n-a-sg'),
                timestamp: dataElement.getAttribute('data-n-a-ts'),
                base64_str: base64Str,
            };
        } catch (e) {
            const error = e as Error;
            if (response && !response.bodyUsed) {
                try { await response.body?.cancel(); } catch { /* ignore */ }
            }
            return {
                status: false,
                message: `Error in getDecodingParams: ${error.message}`,
            };
        }
    }

    /**
     * Decodifica la URL usando batchexecute de Google.
     */
    public async decodeUrl(signature: string, timestamp: string, base64Str: string): Promise<DecodeResult> {
        let response: Response | undefined;
        try {
            const url = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
            const payload = [
                "Fbv4je",
                `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${base64Str}",${timestamp},"${signature}"]`,
            ];

            const reqData = `f.req=${encodeURIComponent(JSON.stringify([[payload]]))}`;

            response = await fetch(url, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                    "Accept": "*/*",
                    "Origin": "https://news.google.com",
                    "Referer": "https://news.google.com/",
                },
                body: reqData
            });

            if (!response.ok) {
                await response.body?.cancel();
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            const splitParts = text.split("\n\n");
            if (splitParts.length < 2) {
                throw new Error("Unexpected response format from batchexecute");
            }

            const jsonStr = splitParts[1];
            const parsedData = JSON.parse(jsonStr);
            const innerDataStr = parsedData[0][2];
            const innerData = JSON.parse(innerDataStr);
            const decodedUrl = innerData[1];

            return { status: true, link: decodedUrl, source_url: `https://news.google.com/rss/articles/${base64Str}` };
        } catch (e) {
            const error = e as Error;
            if (response && !response.bodyUsed) {
                try { await response.body?.cancel(); } catch { /* ignore */ }
            }
            return { status: false, message: `Error in decodeUrl: ${error.message}`, source_url: `https://news.google.com/rss/articles/${base64Str}` };
        }
    }

    /**
     * Decodifica múltiples URLs en una sola solicitud batch.
     */
    public async decodeBatch(sourceUrls: string[]): Promise<DecodeResult[]> {
    try {
        const results: BatchInternalResult[] = [];

        // --- Obtener parámetros de Google (Secuencial con delay para evitar bloqueos) ---
        for (const sourceUrl of sourceUrls) {
            const base64Response = this.getBase64Str(sourceUrl);
            if (!base64Response.status) {
                results.push({ status: false, source_url: sourceUrl, message: base64Response.message });
                continue;
            }
            await new Promise(r => setTimeout(r, 200)); 
            const params = await this.getDecodingParams(base64Response.base64_str!);
            results.push({ ...params, source_url: sourceUrl, base64_str: base64Response.base64_str });
        }

        const successfulRequests = results.filter(r => r.status && r.signature && r.timestamp);
        if (successfulRequests.length === 0) return results.map(r => ({ status: r.status, source_url: r.source_url, message: r.message }));

        // --- Decodificar URLs en masa con BatchExecute ---
        const url = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
        const payloads = successfulRequests.map(req => ([
            "Fbv4je",
            `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${req.base64_str}",${req.timestamp},"${req.signature}"]`,
        ]));

        const reqData = `f.req=${encodeURIComponent(JSON.stringify([payloads]))}`;
        const response = await fetch(url, { method: 'POST', headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: reqData });
        const text = await response.text();
        const batchResponses = JSON.parse(text.split("\n\n")[1]).filter((d: any) => d[1] === "Fbv4je");

        // --- Mapear URLs y extraer Metadata en Paralelo ---
        const successMap = new Map<string, string>();
        successfulRequests.forEach((req, idx) => {
            try {
                const innerData = JSON.parse(batchResponses[idx][2]);
                successMap.set(req.base64_str!, innerData[1]);
            } catch (e) {}
        });

        // Generamos los objetos finales
        const finalResults: DecodeResult[] = await Promise.all(results.map(async (res) => {
            if (!res.status) return { status: false, source_url: res.source_url, message: res.message };

            const decodedUrl = successMap.get(res.base64_str!);
            if (!decodedUrl) return { status: false, source_url: res.source_url, message: "Decoding failed" };

            // Extraemos todo de la web final
            const metadata = await this.getArticleMetadata(decodedUrl);

            return {
                status: true,
                source_url: res.source_url,
                ...metadata
            };
        }));

        return finalResults;

    } catch (e) {
        return [{ status: false, source_url: '', message: `Error: ${(e as Error).message}` }];
    }
}

    /**
     * Método principal para decodificar una sola URL.
     */
    public async decode(sourceUrl: string): Promise<DecodeResult> {
        try {
            const base64Response = this.getBase64Str(sourceUrl);
            if (!base64Response.status || !base64Response.base64_str) return base64Response as DecodeResult;

            const paramsResponse = await this.getDecodingParams(base64Response.base64_str);
            if (!paramsResponse.status || !paramsResponse.signature || !paramsResponse.timestamp) {
                return paramsResponse as DecodeResult;
            }

            return await this.decodeUrl(
                paramsResponse.signature,
                paramsResponse.timestamp,
                paramsResponse.base64_str!
            );
        } catch (e) {
            return { status: false, message: `Error in decode: ${(e as Error).message}`, source_url: sourceUrl };
        }
    }

    public async getArticleMetadata(url: string): Promise<ArticleMetadata> {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 10000 
        });

        const $ = cheerio.load(data);
        const urlObj = new URL(url);

        // 1. Título
        const title = $('meta[property="og:title"]').attr('content') || 
                      $('meta[name="twitter:title"]').attr('content') || 
                      $('title').text() || undefined;

        // 2. Nombre del sitio
        const source = $('meta[property="twitter:creator"]').attr('content') || 
                       $('meta[property="og:site_name"]').attr('content') || 
                       urlObj.hostname.replace('www.', '') || undefined;

        // 3. Fecha de publicación
        const date = $('meta[property="article:published_time"]').attr('content') || 
                     $('meta[name="pubdate"]').attr('content') || 
                     $('meta[name="publish-date"]').attr('content') || undefined;

        // 4. Imagen
        let image = $('meta[property="og:image"]').attr('content') || 
                    $('meta[name="twitter:image"]').attr('content') || 
                    $('meta[itemprop="image"]').attr('content') || null;

        if (image && image.startsWith('/')) {
            image = `${urlObj.protocol}//${urlObj.hostname}${image}`;
        }

        return {
            title: title?.trim(),
            source: source?.trim(),
            link: url,
            date: date,
            image: image
        };

    } catch (error) {
        console.error(`Error extrayendo metadata de ${url}`);
        return { link: url }; // A nadota :v
    }
}
}
