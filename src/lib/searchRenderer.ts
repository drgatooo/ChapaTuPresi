// Mapa de jerarquía de cargos
const cargoWeight: Record<string, number> = {
  "PRESIDENTE": 1,
  "PRIMER_VICEPRESIDENTE": 2,
  "SEGUNDO_VICEPRESIDENTE": 3,
  "SENADOR": 4,
  "DIPUTADO": 5,
  "PARLAMENTO_ANDINO": 6
};

export function renderResults(data: any, container: HTMLElement) {
  if (data.partidos.length === 0 && data.candidatos.length === 0) {
    container.innerHTML = `
      <div class="py-20 text-center flex flex-col items-center gap-4">
        <div class="p-4 bg-stone-100 dark:bg-stone-800 rounded-full text-stone-400">
           <svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <p class="text-stone-500 font-medium">No se encontraron resultados exactos.</p>
        <p class="text-xs text-stone-400">Prueba quitando algunos filtros o buscando un término más general.</p>
      </div>
    `;
    return;
  }

  let html = '';

  // --- SECCIÓN PARTIDOS ---
  if (data.partidos.length > 0) {
    html += `
      <div>
        <h3 class="text-xl font-black mb-4 dark:text-white flex items-center gap-2">
           <svg class="w-6 h-6 text-roof-terracotta-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14 16.5V22h-4v-5.5l-4-4V3h12v9.5l-4 4z"/></svg> 
           Partidos Encontrados <span class="text-sm font-bold text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md ml-2">${data.partidos.length}</span>
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    `;
    data.partidos.forEach((p: any) => {
      html += `
        <a href="/partido/${p.slug}" class="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex items-center gap-4 hover:border-roof-terracotta-500 transition-all group shadow-sm hover:shadow-md">
          <img src="${p.logo_url}" class="w-12 h-12 object-contain" />
          <div class="overflow-hidden">
            <h4 class="dark:text-white font-black text-sm uppercase group-hover:text-roof-terracotta-600 transition-colors truncate">${p.nombre}</h4>
            <span class="text-[10px] text-stone-400 font-bold tracking-widest">${p.siglas}</span>
          </div>
        </a>
      `;
    });
    html += `</div></div>`;
  }

  // --- SECCIÓN CANDIDATOS ---
  if (data.candidatos.length > 0) {
    const sortedCandidatos = data.candidatos.sort((a: any, b: any) => {
      const pesoA = cargoWeight[a.cargo[0]] || 99;
      const pesoB = cargoWeight[b.cargo[0]] || 99;
      return pesoA - pesoB;
    });

    html += `
      <div class="${data.partidos.length > 0 ? 'mt-10' : ''}">
        <h3 class="text-xl font-black mb-4 dark:text-white flex items-center gap-2">
           <svg class="w-6 h-6 text-roof-terracotta-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
           Candidatos Encontrados <span class="text-sm font-bold text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md ml-2">${data.candidatos.length}</span>
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    `;
    sortedCandidatos.forEach((c: any) => {
      const hasSentencias = c.sentencias.length > 0;
      html += `
        <a href="/candidato/${c.slug}" class="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl flex items-center gap-4 hover:border-roof-terracotta-500 transition-all group shadow-sm hover:shadow-md">
          <div class="relative w-14 h-14 shrink-0">
            <img src="${c.foto_url}" class="w-full h-full rounded-xl object-cover candidate" />
            ${hasSentencias ? '<span class="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-white dark:border-stone-900" title="Sentencias Registradas"></span>' : ''}
          </div>
          <div class="grow overflow-hidden">
            <h4 class="dark:text-white font-bold text-sm truncate group-hover:text-roof-terracotta-600 transition-colors leading-tight">${c.nombre} ${c.apellido_p}</h4>
            <p class="text-[10px] font-black text-stone-400 uppercase tracking-tighter truncate mt-1 flex items-center gap-1">
               <img src="${c.partido.logo_url}" class="w-3 h-3 inline object-contain grayscale" /> 
               ${c.partido.siglas}
            </p>
            <span class="inline-block mt-1 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-300 text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">
               ${c.cargo[0].replace(/_/g, ' ')}
            </span>
          </div>
        </a>
      `;
    });
    html += `</div></div>`;
  }

  container.innerHTML = html;
}