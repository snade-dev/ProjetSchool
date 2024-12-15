"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";

const localizer = momentLocalizer(moment);

// Définir `calendarEvents` avant l'utilisation dans le composant
  

const BigCalendar = ({data}: {data:{title: string,start: Date, end: Date}[]}) => {
  const [view, setView] = useState<View>(Views.WORK_WEEK);

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  return (
    <Calendar
      localizer={localizer}
      events={data}
      startAccessor="start"
      endAccessor="end"
      views={["work_week", "day"]}
      view={view}
      style={{ height: "98%" }}
      onView={handleOnChangeView}
      min={new Date(2025, 1, 0, 8, 0, 0)} // Mois 9 = octobre
      max={new Date(2025, 1, 0, 20, 0, 0)} // Ajustez les dates max pour tester
    />
  );
};

export default BigCalendar;
