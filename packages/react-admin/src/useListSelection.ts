// Selection state for a list table's checkboxes. Keys that leave the list (another page, a
// refreshed result) leave the selection too, so a bulk action never reaches rows the reader no
// longer sees.
import { useCallback, useMemo, useState } from "react";

export interface ListSelection {
  selected: ReadonlySet<string>;
  onChange: (next: ReadonlySet<string>) => void;
  /** Empties the selection, for instance after a bulk action. */
  clear: () => void;
}

export function useListSelection(keys: readonly string[]): ListSelection {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set());
  const keyList = keys.join("\u0000");
  const selected = useMemo<ReadonlySet<string>>(() => {
    const present = new Set(keyList ? keyList.split("\u0000") : []);
    return new Set([...chosen].filter((key) => present.has(key)));
  }, [chosen, keyList]);
  const clear = useCallback(() => setChosen(new Set()), []);
  return { selected, onChange: setChosen, clear };
}
