
export interface HoursTableReport {
    id?: number;
    date: string;
    name: string;
    time_in: string;
    time_out: string;
    is_overtime: boolean;
    overtime_hours: number;
}

export interface Report extends HoursTableReport {
    weather: string;
    details: string;
    tasks: string;
}