export async function fetchDepartments() {
  const response = await fetch("api/departments", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch departments");
  }

  const data = await response.json();

  return data.departments || [];
}
