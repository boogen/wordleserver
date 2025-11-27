#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import time
from typing import Dict, Any
from dotenv import load_dotenv
from google import genai
from google.genai import types


BASIC_PROMPT_PL = (
    " \"{word}\". "
)

import json
import time
from typing import Dict, List

def build_config_clues_generator():
    return types.GenerateContentConfig(
    system_instruction='''Jesteś twórcą krótkich, inteligentnych haseł krzyżówkowych z przymrużeniem oka. Twoim zadaniem jest wymyślenie opisu hasła, który jest **humorystyczny, dwuznaczny lub zaskakujący** (z przymrużeniem oka) dla każdego z podanych słów.

**Zasady, których musisz bezwzględnie przestrzegać:**
1.  Dla każdego podanego słowa, które jest ZAWSZE rzeczownikem, wymyśl **trzy** opisy odzielone średnikiem.
2.  Odpowiedź musi być **wyłącznie** obiektem JSON, który mapuje każde słowo (jako klucz) na jego opisy (jako wartość).
3.  W odpowiedzi **nie może** znaleźć się żaden tekst wprowadzający, wyjaśnienia ani dodatkowe komentarze — **tylko gotowy obiekt JSON**.
4.  **Oryginalność:** Preferowane są definicje **kreatywne** i nietypowe, które nie są oklepane.
5.  **Dowcip i Gra Słów:** Hasło musi być **zabawne**, wykorzystywać **dwuznaczności** SŁOWA-KLUCZA, kontekstu lub brzmienia. Najwyżej oceniane są te, które wywołują efekt "Aha!" lub uśmiech.
6. ** Powiedzenia i związki frazeologiczne:** możesz wykorzystywać znane powiedzenia, przysłowia lub frazeologizmy, ale z kreatywnym twistem odnoszącym się do SŁOWA-KLUCZA.

**Pożądany format odpowiedzi (WYŁĄCZNIE JSON):**
```json
{
  "SŁOWO_1": "Opis hasła w stylu krzyżówki z przymrużeniem oka;drugi zabawny opis;trzeci humorystyczny opis",
  "SŁOWO_2": "Inny zabawny, krótki opis;drugi opis;trzeci opis",
  "SŁOWO_N": "..."
}''',
    response_mime_type="application/json",
    temperature=0.8 # Optional: Adjust for creativity
    )

def build_config_clues_judge():
    return types.GenerateContentConfig(
    system_instruction='''Jesteś ekspertem w tworzeniu i ocenianiu **humorystycznych haseł do krzyżówek, opartych na grach słów, dwuznacznościach i zaskakujących skojarzeniach**. Twoim zadaniem jest ocenić zestawy haseł pod kątem ich **dowcipu, kreatywności, gry słów** oraz **zachowania poprawnej relacji** ze SŁOWEM-KLUCZEM.

Otrzymasz dane w formacie JSON, gdzie kluczem jest **SŁOWO-KLUCZ** (rozwiązanie krzyżówki), a wartością jest ciąg znaków zawierający co najmniej jedną definicję (hasło) oddzieloną średnikami.

**Format wejściowy (JSON):**
{'słowo_a': 'definicja1;definicja2;definicja3', 'słowo_b': 'definicja_x;definicja_y'}

**Kryteria Oceny Humorystycznej (Kolejność Priorytetów):**
1.  **Dowcip i Gra Słów:** Hasło musi być **zabawne**, wykorzystywać **dwuznaczności** SŁOWA-KLUCZA, kontekstu lub brzmienia. Najwyżej oceniane są te, które wywołują efekt "Aha!" lub uśmiech.
2.  **Poprawność Rozwiązania:** Pomimo humoru, definicja musi **jednoznacznie naprowadzać** na SŁOWO-KLUCZ (rozwiązanie).
3.  **Oryginalność:** Preferowane są definicje **kreatywne** i nietypowe, które nie są oklepane.
4.  **Zwięzłość:** Hasło powinno być **krótkie i dosadne**, aby punchline był natychmiastowy.

**Instrukcje dla Modelu:**
1.  Dla każdego **SŁOWA-KLUCZA** z wejściowego JSON, oceń wszystkie przypisane mu humorystyczne definicje.
2.  Wybierz **jedną, najlepszą** definicję, która jest najzabawniejsza i najbardziej kreatywnie wykorzystuje grę słów, spełniając jednocześnie wymóg poprawnej relacji ze SŁOWEM-KLUCZEM.
3.  Zwróć wynik jako **jednolity obiekt JSON**.

**Format wyjściowy (JSON):**
Zwróć JSON, w którym kluczem jest oryginalne **SŁOWO-KLUCZ**, a wartością jest **wybrana, najwyżej oceniona definicja humorystyczna**.

**Przykład Oczekiwany Wynik (JSON):**
{'słowo_a': 'wybrana_definicja_oparta_na_grze_słów', 'słowo_b': 'wybrana_zabawna_definicja'}''',
    response_mime_type="application/json",
    temperature=0.8 # Optional: Adjust for creativity
    )


def _request_clues_batch(client, words: List[str], max_retries: int = 3, delay: float = 2.0) -> Dict[str, str]:
    """
    Jedno wywołanie API, JSON mode. Zwraca mapę {słowo: opis} tylko dla słów z 'words'.
    """

    config = build_config_clues_generator()
    config_judge = build_config_clues_judge()
    print("Requesting clues for words:", words)
    for attempt in range(max_retries):
        try:
            resp = client.models.generate_content(
                model="gemini-2.5-pro", # Use a model that supports structured output
                contents="Słowa do opisania:\n"
                    + "\n".join(f"- {w}" for w in words),
                config=config)

            content = resp.text
            resp = client.models.generate_content(
                model="gemini-2.5-pro",
                contents=f"Oceń i wybierz najlepsze hasła z poniższego JSON:\n{content}",
                config=config_judge)
            content = resp.text
            print(content)
            parsed = json.loads(content)

            # Normalizacja: bierzemy tylko klucze odpowiadające wejściowym słowom (case-insensitive OK)
            out = {}
            lower_map = {w.lower(): w for w in words}
            for k, v in parsed.items():
                if not isinstance(k, str) or not isinstance(v, str):
                    continue
                key = k.lower()
                if key in lower_map:
                    out[lower_map[key]] = v.strip()
            return out
        except Exception:
            if attempt == max_retries - 1:
                raise
            time.sleep(delay * (2 ** attempt))
    return {}


def get_client():
    load_dotenv()
    return genai.Client()

def _save_json_atomic(path: str, data: Any) -> None:
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as out:
        json.dump(data, out, ensure_ascii=False, indent=2)
    os.replace(tmp, path)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("json_path", help="Path to crosswords.json generated by the generator")
    ap.add_argument("--force", action="store_true", help="Force regenerate all clues, even if they already exist")
    args = ap.parse_args()

    with open(args.json_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    client = get_client()

    # Build quick lookup to avoid duplicates
    for cw in data.get("crosswords", []):
        # Create a dict (word -> clue) for already present clues
        existing: Dict[str, str] = {
            c["word"].lower(): c["description"]
            for c in cw.get("clues", [])
            if "word" in c and "description" in c
        }

        words = [w["word"].lower() for w in cw.get("words", [])]

        if args.force:
            # regenerate all words; remove any existing clues for those words so we don't duplicate
            missing_words = words.copy()
            cw["clues"] = [c for c in cw.get("clues", []) if c.get("word", "").lower() not in set(words)]
        else:
            missing_words = [w for w in words if w not in existing]

        if missing_words:
            batch_map = _request_clues_batch(client, missing_words)

            to_append = []
            for w in missing_words:
                clue = batch_map.get(w)
                if clue:
                    print(f"Generated clue for {w}: {clue}")
                    to_append.append({"word": w, "description": clue})

            if to_append:
                cw.setdefault("clues", []).extend(to_append)

            _save_json_atomic(args.json_path, data)
            print(f"Saved intermediate results to {args.json_path}")

    _save_json_atomic(args.json_path, data)
    print(f"Updated clues and saved to {args.json_path}")

if __name__ == "__main__":
    main()
