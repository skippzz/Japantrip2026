// ── Export: ICS Calendar Export ──

import { state } from './state.js';
import { findPlaceForItem, parseTimeToMinutes, getDayCity } from './helpers.js';
import { TRIP_START } from './data.js';
import { showToast } from './toast.js';

export function exportICS() {
    if (!state.itinerary.length) { showToast('No itinerary to export.', 'warn'); return; }

    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//TravelPlanner//EN\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:Japan 2026\r\n';

    state.itinerary.forEach((day, dayIdx) => {
        const dayDate = new Date(TRIP_START.getTime() + dayIdx * 86400000);
        const dateStr = formatICSDate(dayDate);

        day.items.forEach(item => {
            if (item.isNote) return;
            const place = findPlaceForItem(item);

            // Parse start time
            let startTime = null, endTime = null;
            if (item.time) {
                const mins = parseTimeToMinutes(item.time);
                if (mins != null) {
                    startTime = new Date(dayDate);
                    startTime.setHours(Math.floor(mins / 60), mins % 60, 0);
                }
            }
            if (item.timeEnd) {
                const mins = parseTimeToMinutes(item.timeEnd);
                if (mins != null) {
                    endTime = new Date(dayDate);
                    endTime.setHours(Math.floor(mins / 60), mins % 60, 0);
                }
            }
            // Default: 1 hour duration if only start time
            if (startTime && !endTime) {
                endTime = new Date(startTime.getTime() + 3600000);
            }
            // If no time at all, skip
            if (!startTime) return;

            const location = place?.address || place?.city || '';
            const description = [item.desc, place?.hours ? 'Hours: ' + place.hours : '', place?.notes].filter(Boolean).join('\\n');

            ics += 'BEGIN:VEVENT\r\n';
            ics += `DTSTART:${formatICSDateTime(startTime)}\r\n`;
            ics += `DTEND:${formatICSDateTime(endTime)}\r\n`;
            ics += `SUMMARY:${escICS(item.name)}\r\n`;
            if (location) ics += `LOCATION:${escICS(location)}\r\n`;
            if (description) ics += `DESCRIPTION:${escICS(description)}\r\n`;
            ics += `UID:${item.id}@travelplanner\r\n`;
            ics += 'END:VEVENT\r\n';
        });
    });

    ics += 'END:VCALENDAR\r\n';

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'japan-2026-itinerary.ics';
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${state.itinerary.length} days to calendar.`, 'success');
}

function formatICSDate(d) {
    return d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate());
}

function formatICSDateTime(d) {
    return formatICSDate(d) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
}

function pad(n) { return String(n).padStart(2, '0'); }

function escICS(str) {
    return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
