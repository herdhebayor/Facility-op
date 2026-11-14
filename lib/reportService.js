
 
export async function fetchReports(){
    const response = fetch("api/reports");

    if(!response.ok){
        throw new Error('Could not load reports at this moment please try again later')
    }

    const data = response.json()
    return data
}