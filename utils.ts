
/**
 * Valida un RUT chileno (con o sin puntos y guión)
 */
export const validateRUT = (rut: string): boolean => {
    if (!rut || typeof rut !== 'string') return false;

    // Limpiar el RUT
    const cleanRUT = rut.replace(/[^0-9kK]/g, '');
    if (cleanRUT.length < 8 || cleanRUT.length > 9) return false;

    const dv = cleanRUT.slice(-1).toLowerCase();
    const num = parseInt(cleanRUT.slice(0, -1), 10);

    let m = 0;
    let s = 1;
    let t = num;
    for (; t; t = Math.floor(t / 10)) {
        s = (s + (t % 10) * (9 - (m++ % 6))) % 11;
    }

    const calculatedDV = s ? (s - 1).toString() : 'k';
    return calculatedDV === dv;
};

/**
 * Formatea un RUT a formato XX.XXX.XXX-X
 */
export const formatRUT = (rut: string): string => {
    const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 2) return clean;

    const dv = clean.slice(-1);
    const num = clean.slice(0, -1);

    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
};

/**
 * Calcula la diferencia en días entre una fecha y hoy
 */
export const getDaysDifference = (dateString: string): number => {
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

/**
 * Genera un ID único
 */
export const generateId = (): string => {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2);
};
