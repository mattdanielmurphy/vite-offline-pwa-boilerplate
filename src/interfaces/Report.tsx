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
