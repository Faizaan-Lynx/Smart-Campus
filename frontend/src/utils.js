import assets from "./assets";

export const color1 = "rgba(94, 55, 255, 0.85)";
export const color2 = "rgba(106, 210, 255, 0.85)";
export const color3 = "rgba(225, 233, 248, 0.85)";
// #5e37ffd9  #6ad2ffd9 #e1e9f8d9

export const token1 =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJraGF3aXIiLCJpc19zdXBlcnVzZXIiOnRydWUsImV4cCI6MTcxOTYyNzc1MX0.-HpsRRmZt48_uR2pUMnuHy8qLjpr-lf16j16L8x3K_M";
export const token =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpc19hZG1pbiIsImlzX3N1cGVydXNlciI6ZmFsc2UsImV4cCI6MTcxOTU2MjMwOH0.k4Xse0ZSubj26cfwEMHbZSfXr0r-Mi8Mg5aJ7_R5_OI";
// export const localurl = "https://khawir-pulse-be.hf.space";
// export const localurl = "http://13.212.84.18/api";
// export const localurl = "http://54.179.81.103/api";
// export const localurl = "http://app.pulsse.io/api";
export const localurl = "http://vs1.gpuhut.com/api";


// export const localurl = "https://khawir-pulse-be.hf.space";
function formatDateToISO(date) {
  const year = date.getFullYear();
  // Months are zero-indexed, so we add 1 to get the correct month
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const filterVisits = (data, filterString) => {
  const currentDate = new Date(); // Get the current date
  switch (filterString) {
    case "last12Hours":
      // Calculate the date and time 12 hours ago from the current time
      const last12Hours = new Date(currentDate.getTime() - 12 * 60 * 60 * 1000);

      return {
        ...data,
        visits: data.visits.filter((visit) => {
          const visitDate = new Date(`${visit.date_in}T${visit.time_in}`);
          return visitDate >= last12Hours;
        }),
      };

    case "today":
      return {
        ...data,
        visits: data.visits.filter((visit) => {
          const visitDate = new Date(visit.date_in);

          return formatDateToISO(visitDate) == formatDateToISO(currentDate);
        }),
      };
    case "yesterday":
      const yesterday = new Date(currentDate);
      yesterday.setDate(currentDate.getDate() - 1);
      return {
        ...data,
        visits: data.visits.filter((visit) => {
          const visitDate = new Date(visit.date_in);
          return formatDateToISO(visitDate) == formatDateToISO(yesterday);
        }),
      };
    case "last7Days":
      const last7Days = new Date(currentDate);
      last7Days.setDate(currentDate.getDate() - 7);
      return {
        ...data,
        visits: data.visits.filter(
          (visit) => new Date(visit.date_in) >= last7Days
        ),
      };
    case "lastMonth":
      const lastMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        currentDate.getDate()
      );
      return {
        ...data,
        visits: data.visits.filter(
          (visit) => new Date(visit.date_in) >= lastMonth
        ),
      };
    case "allTime":
      return data; // Return the data object as is
    default:
      return { ...data, visits: [] }; // Return empty visits array for unknown filters
  }
};

export const generateDummyData = () => {
  const data = [];
  for (let i = 0; i < 20; i++) {
    const timeInHour = Math.floor(Math.random() * 24);
    const timeInMinute = Math.floor(Math.random() * 60);
    const timeOutHour = Math.floor(Math.random() * 24);
    const timeOutMinute = Math.floor(Math.random() * 60);

    const timeIn = `${timeInHour < 10 ? "0" : ""}${timeInHour}:${
      timeInMinute < 10 ? "0" : ""
    }${timeInMinute}`;
    const timeOut = `${timeOutHour < 10 ? "0" : ""}${timeOutHour}:${
      timeOutMinute < 10 ? "0" : ""
    }${timeOutMinute}`;

    const stayHours = timeOutHour - timeInHour;
    const stayMinutes = timeOutMinute - timeInMinute;
    const stay = stayHours * 60 + stayMinutes;

    data.push({
      visitDate: `2024-04-${Math.floor(Math.random() * 30) + 1}`,
      visits: Math.floor(Math.random() * 100),
      gender: Math.random() > 0.5 ? "Male" : "Female",
      age: Math.floor(Math.random() * 80) + 10,
      group: Math.random() > 0.5 ? "Yes" : "No",
      timeIn,
      timeOut,
      stay,
    });
  }
  return data;
};
