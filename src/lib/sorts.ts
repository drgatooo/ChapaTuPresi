import { Cargo } from "@prisma/client";

export function candSort(a: string[], b: string[]) {
    const order = [Cargo.PRESIDENTE, Cargo.PRIMER_VICEPRESIDENTE, Cargo.SEGUNDO_VICEPRESIDENTE, Cargo.DIPUTADO, Cargo.SENADOR];

    const aIndex = order.findIndex((cargo) => a.includes(cargo));
    const bIndex = order.findIndex((cargo) => b.includes(cargo));

    return aIndex - bIndex;
}

export function cargoSort(a: string, b: string) {
    const order: Cargo[] = [Cargo.PRESIDENTE, Cargo.PRIMER_VICEPRESIDENTE, Cargo.SEGUNDO_VICEPRESIDENTE, Cargo.DIPUTADO, Cargo.SENADOR];

    const aIndex = order.indexOf(a as Cargo);
    const bIndex = order.indexOf(b as Cargo);

    return aIndex - bIndex;
}