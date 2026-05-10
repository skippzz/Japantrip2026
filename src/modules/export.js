// ── Export: ICS Calendar Export ──

import { state } from './state.js';
import { findPlaceForItem, parseTimeToMinutes, getDayCity } from './helpers.js';
import { TRIP_START } from './data.js';
import { showToast } from './toast.js';
import { getActiveTrip } from './trips.js';

export function exportICS() {
    if (!state.itinerary.length) { showToast('No itinerary to export.', 'warn'); return; }

    // Phase 6.2: use active trip metadata instead of hard-coded TRIP_START.
    const trip = getActiveTrip();
    const tripName = trip?.name || 'Trip';
    const tripStart = trip?.dateStart ? new Date(trip.dateStart) : TRIP_START;

    let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//TravelPlanner//EN\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:${escICS(tripName)}\r\nX-WR-TIMEZONE:Asia/Tokyo\r\n`;

    let eventCount = 0, allDayCount = 0;

    state.itinerary.forEach((day, dayIdx) => {
        const dayDate = new Date(tripStart.getTime() + dayIdx * 86400000);
        // All-day "container" event for the day so the day shows up even if items are timeless.
        ics += 'BEGIN:VEVENT\r\n';
        ics += `DTSTART;VALUE=DATE:${formatICSDate(dayDate)}\r\n`;
        ics += `DTEND;VALUE=DATE:${formatICSDate(new Date(dayDate.getTime() + 86400000))}\r\n`;
        ics += `SUMMARY:${escICS(`📅 ${day.title || ('Day ' + (dayIdx + 1))}`)}\r\n`;
        ics += `UID:${day.id}-day@travelplanner\r\n`;
        ics += 'TRANSP:TRANSPARENT\r\n';
        ics += 'END:VEVENT\r\n';
        allDayCount++;

        day.items.forEach(item => {
            if (item.isNote) return;
            const place = findPlaceForItem(item);

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
            if (startTime && !endTime) {
                endTime = new Date(startTime.getTime() + 3600000);
            }
            if (!startTime) return;

            const location = place?.address || place?.city || '';
            const description = [item.desc, place?.hours ? 'Hours: ' + place.hours : '', place?.notes].filter(Boolean).join('\\n');

            ics += 'BEGIN:VEVENT\r\n';
            ics += `DTSTART:${formatICSDateTime(startTime)}\r\n`;
            ics += `DTEND:${formatICSDateTime(endTime)}\r\n`;
            ics += `SUMMARY:${escICS(item.name)}\r\n`;
            if (location) ics += `LOCATION:${escICS(location)}\r\n`;
            if (description) ics += `DESCRIPTION:${escICS(description)}\r\n`;
            if (place?.url) ics += `URL:${place.url}\r\n`;
            ics += `UID:${item.id}@travelplanner\r\n`;
            // Reminder 15 min before
            ics += 'BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Reminder\r\nTRIGGER:-PT15M\r\nEND:VALARM\r\n';
            ics += 'END:VEVENT\r\n';
            eventCount++;
        });
    });

    ics += 'END:VCALENDAR\r\n';

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = tripName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = slug + '-itinerary.ics';
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${allDayCount} days, ${eventCount} timed events.`, 'success');
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
