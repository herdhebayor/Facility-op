export async function fetchStaffs() {
  const response = await fetch("api/departments");

  if (!response.ok) {
    throw new Error("Unable to fetch staffs");
  }

  const data = await response.json();

  return data.staff || [];
}
