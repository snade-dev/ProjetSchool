// IT APPEARS THAT BIG CALENDAR SHOWS THE LAST WEEK WHEN THE CURRENT DAY IS A WEEKEND.
// FOR THIS REASON WE'LL GET THE LAST WEEK AS THE REFERENCE WEEK.
// IN THE TUTORIAL WE'RE TAKING THE NEXT WEEK AS THE REFERENCE WEEK.

const getLatestMonday = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const latestMonday = today;
    latestMonday.setDate(today.getDate() - daysSinceMonday);
    return latestMonday;
  };
  
/**
 * Ajuste les horaires des leçons pour qu'ils correspondent à la semaine actuelle.
 *
 * @param {Array<{ title: string; start: Date; end: Date }>} lessons - Un tableau d'objets représentant les leçons, chaque objet contenant un titre, une date de début et une date de fin.
 * @returns {Array<{ title: string; start: Date; end: Date }>} - Un tableau d'objets représentant les leçons ajustées, chaque objet contenant un titre, une date de début et une date de fin.
 *
 * Cette fonction prend un tableau de leçons et ajuste leurs dates de début et de fin pour qu'elles correspondent à la semaine actuelle. 
 * Elle utilise la fonction `getLatestMonday` pour obtenir le lundi le plus récent et ajuste les dates des leçons en conséquence.
 */
  export const adjustScheduleToCurrentWeek = (
    lessons: { title: string; start: Date; end: Date }[]
  ): { title: string; start: Date; end: Date }[] => {
    const latestMonday = getLatestMonday();
  
    return lessons.map((lesson) => {
      const lessonDayOfWeek = lesson.start.getDay();
  
      const daysFromMonday = lessonDayOfWeek === 0 ? 6 : lessonDayOfWeek - 1;
  
      const adjustedStartDate = new Date(latestMonday);
  
      adjustedStartDate.setDate(latestMonday.getDate() + daysFromMonday);
      adjustedStartDate.setHours(
        lesson.start.getHours(),
        lesson.start.getMinutes(),
        lesson.start.getSeconds()
      );
      const adjustedEndDate = new Date(adjustedStartDate);
      adjustedEndDate.setHours(
        lesson.end.getHours(),
        lesson.end.getMinutes(),
        lesson.end.getSeconds()
      );
  
      return {
        title: lesson.title,
        start: adjustedStartDate,
        end: adjustedEndDate,
      };
    });
  };