import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getFallbackDismissalOptions, type DismissalOption } from '../lib/dismissalOptions';

interface DismissalTypeRow {
  code: string;
  label: string;
}

interface UseDismissalTypesResult {
  options: DismissalOption[];
  loading: boolean;
}

export function useDismissalTypes(): UseDismissalTypesResult {
  const [options, setOptions] = useState<DismissalOption[]>(() => getFallbackDismissalOptions());
  const [loading, setLoading] = useState(true);

  const fetchOptions = useCallback(async () => {
    const { data, error } = await supabase
      .from('dismissal_types')
      .select('code, label')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });

    if (error || !data || data.length === 0) {
      setOptions(getFallbackDismissalOptions());
      setLoading(false);
      return;
    }

    const mapped = (data as DismissalTypeRow[]).map((row) => ({
      value: row.code,
      label: row.label,
    }));
    setOptions(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchOptions();
  }, [fetchOptions]);

  return { options, loading };
}
