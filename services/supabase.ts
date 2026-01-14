
import { createClient } from '@supabase/supabase-js';

// Estos valores deberían venir de .env.local en el futuro
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Nota: Implementaremos los métodos CRUD una vez que tengamos las tablas 
 * configuradas en Supabase (officials, absences, compensatory_hours).
 */
export const supabaseService = {
    // Officials
    getOfficials: async () => {
        const { data, error } = await supabase.from('officials').select('*');
        if (error) throw error;
        return data;
    },

    saveOfficial: async (official: any) => {
        const { data, error } = await supabase.from('officials').upsert(official);
        if (error) throw error;
        return data;
    },

    // Absences
    getAbsences: async () => {
        const { data, error } = await supabase.from('absences').select('*');
        if (error) throw error;
        return data;
    },

    // Compensatory Hours
    getCompensatoryHours: async () => {
        const { data, error } = await supabase.from('compensatory_hours').select('*');
        if (error) throw error;
        return data;
    }
};
