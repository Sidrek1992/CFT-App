
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
/**
 * Calcula los días de feriado progresivo según la ley chilena:
 * 1 día adicional por cada 3 años con el actual empleador,
 * siempre que el trabajador ya tenga 10 años de trabajo total.
 */
export const calculateProgressiveDays = (entryDate: string | undefined, recognizedYears: number = 0): number => {
    if (!entryDate) return 0;

    const entry = new Date(entryDate);
    const today = new Date();

    // Cálculo de años con el empleador actual
    const currentTenureYears = (today.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    // El trabajador debe alcanzar primero los 10 años de trabajo total
    // Años que le faltaban para llegar a 10 cuando entró
    const yearsToReachThreshold = Math.max(0, 10 - recognizedYears);

    // Años trabajados con el empleador actual DESPUÉS de haber cumplido los 10 años totales
    const yearsAvailableForProgressive = currentTenureYears - yearsToReachThreshold;

    // 1 día por cada 3 años cumplidos
    return Math.max(0, Math.floor(yearsAvailableForProgressive / 3));
};

/**
 * Calcula los días proporcionales ganados a la fecha basándose en el límite anual configurado
 */
export const calculateProportionalDays = (entryDate: string | undefined, annualLimit: number = 15, referenceDate?: string): number => {
    if (!entryDate) return 0;

    const entry = new Date(entryDate);
    const end = referenceDate ? new Date(referenceDate) : new Date();

    // Tasa mensual (ej: 15 / 12 = 1.25)
    const monthlyRate = annualLimit / 12;

    // Diferencia en meses totales
    const months = (end.getFullYear() - entry.getFullYear()) * 12 + (end.getMonth() - entry.getMonth());

    // Días en el mes actual de referencia
    const days = end.getDate();

    // Tasa por mes completo + (días / 30 * tasa) para el mes parcial
    const proportional = (months * monthlyRate) + (days / 30 * monthlyRate);

    return Math.max(0, parseFloat(proportional.toFixed(2)));
};
