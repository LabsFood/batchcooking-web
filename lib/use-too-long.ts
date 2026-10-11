'use client'

import { useEffect, useState } from "react";

/**
 * Dit si une attente dure trop longtemps.
 *
 * Un écran de chargement est une promesse : « patientez, ça arrive ». Quand ça
 * n'arrive pas, la promesse devient un mensonge, et la personne reste devant
 * un logo qui tourne sans savoir quoi faire. Ce crochet met une limite à la
 * patience : passé le délai, l'écran doit proposer une sortie.
 */
export function useTooLong(waiting: boolean, ms = 12_000): boolean {
  const [etat, setEtat] = useState({ waiting, expired: false });

  // Une nouvelle attente repart sur un compteur neuf. On ajuste pendant le
  // rendu plutôt que depuis un effet : un effet ferait un rendu de plus pour
  // la même information.
  if (etat.waiting !== waiting) setEtat({ waiting, expired: false });

  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(
      () => setEtat((e) => (e.waiting ? { ...e, expired: true } : e)),
      ms,
    );
    return () => clearTimeout(t);
  }, [waiting, ms]);

  return waiting && etat.waiting && etat.expired;
}
