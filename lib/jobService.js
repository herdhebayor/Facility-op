export async function fetchJobs(){
    const response = fetch("/api/jobs?status=open,pending,in_progress", { cache: "no-store" });
    
    if(!response.ok){
        throw new Error("Could not load atsk at this moment please try again later")
    }

    const data = await response.json()

    return data.jobs
}