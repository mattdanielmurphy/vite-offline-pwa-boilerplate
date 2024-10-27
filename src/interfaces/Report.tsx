export interface Report {
    id?: number;
    date: string;
    name: string;
    weather: string;
    time_in: string;
    time_out: string;
    details: string;
    tasks: string;
    is_overtime: boolean;
    overtime_hours: number;
}

export interface HoursTableReport extends Report {
    id?: number;
    date: string;
    name: string;
    time_in: string;
    time_out: string;
    is_overtime: boolean;
    overtime_hours: number;
}