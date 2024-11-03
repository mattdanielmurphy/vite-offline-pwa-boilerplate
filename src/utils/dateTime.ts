// Date and time formatting utilities
export const formatDate = (dateValue: string | Date | null): string => {
    if (!dateValue) return 'No date';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatTime = (timeString: string | null): string => {
    if (!timeString) return '-';

    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return '-';

    const ampm = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    return minutes === 0 ? `${formattedHours}${ampm}` : `${formattedHours}:${minutes.toString().padStart(2, '0')}${ampm}`;
};

export const calculateHours = (timeIn: string | null, timeOut: string | null): number => {
    if (!timeIn || !timeOut) return 0;

    const [inHours, inMinutes] = timeIn.split(':').map(Number);
    const [outHours, outMinutes] = timeOut.split(':').map(Number);

    if (isNaN(inHours) || isNaN(inMinutes) || isNaN(outHours) || isNaN(outMinutes)) {
        return 0;
    }

    let totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
    if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
    }

    return Number((totalMinutes / 60).toFixed(2));
};

export const formatHoursDisplay = (hours: number | null): string => {
    if (!hours) return '0h';
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return minutes === 0 ? `${wholeHours}h` : `${wholeHours}h ${minutes}m`;
}; 