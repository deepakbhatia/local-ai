import { useOnboardingStore } from '../store/onboarding';
import { format } from 'date-fns';
import { enUS, fr, de, es, pt, ja, ar } from 'date-fns/locale';

const locales: Record<string, any> = {
    en: enUS,
    fr,
    de,
    es,
    pt,
    ja,
    ar
};

export function useDateFormat() {
    const language = useOnboardingStore(state => state.language);

    const formatDate = (dateValue: number | Date, formatStr: string = 'PP') => {
        const locale = locales[language] || enUS;
        return format(dateValue, formatStr, { locale });
    };

    const formatTime = (dateValue: number | Date) => {
        return formatDate(dateValue, 'p');
    };

    return { formatDate, formatTime };
}
