interface Schedule {
    [key: string]: {
        [key: string]: string;
    };
}

export const defaultSchedule: Schedule = {
    '1': { // Monday
        '00:00': 'Marty Wanless',
        '08:00': 'Jason Earle',
        '16:00': 'Colin Butcher',
    },
    '2': { // Tuesday
        '00:00': 'Terry MacLaine',
        '08:00': 'Jason Earle',
        '16:00': 'Colin Butcher',
    },
    '3': { // Wednesday
        '00:00': 'Terry MacLaine',
        '08:00': 'Jason Earle',
        '16:00': 'Matthew Murphy',
    },
    '4': { // Thursday
        '00:00': 'Terry MacLaine',
        '08:00': 'Jason Earle',
        '16:00': 'Matthew Murphy',
    },
    '5': { // Friday
        '00:00': 'Terry MacLaine',
        '08:00': 'Jason Earle',
        '16:00': 'Matthew Murphy',
    },
    '6': { // Saturday
        '00:00': 'Marty Wanless',
        '08:00': 'Manpreet Kaur',
        '16:00': 'Matthew Murphy',
    },
    '0': { // Sunday
        '00:00': 'Marty Wanless',
        '08:00': 'Manpreet Kaur',
        '16:00': 'Matthew Murphy',
    },
};

export const vancouverWeather = {
    January: "Rainy",
    February: "Rainy",
    March: "Rainy",
    April: "Cloudy",
    May: "Cloudy",
    June: "Sunny",
    July: "Sunny",
    August: "Sunny",
    September: "Cloudy",
    October: "Rainy",
    November: "Rainy",
    December: "Rainy"
} as const;

export const getDefaultWeather = (): string => {
    const month = new Date().toLocaleString('default', { month: 'long' });
    return vancouverWeather[month as keyof typeof vancouverWeather];
}; 