const submitButton = document.getElementById("submit");
names = document.getElementById("search");
const form = document.getElementById("forms");
const captionsContainer = document.getElementById('captions');


form.addEventListener('submit', async (event) => {

    event.preventDefault();
    submitButton.disabled = true;

    const formData = new FormData();
    formData.append("search", names.value)

    try {

        const response = await fetch('http://localhost:8000/findpodcast/',{
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log(data);

        const podcasts = Array.isArray(data) ? data : [data]; // making sure data received is an array

        captionsContainer.innerHTML = ''; // Clear previous results

        podcasts.forEach(podcast => {

            if (!podcast) {
                captionsContainer.innerHTML = "<p>No podcasts found.</p>";
                return;
            }

            const podcastTitle = podcast["Podcast Title"];
            const audioLink = podcast["Audio link"];
            const imagelink = podcast["Image"];
            const descript = podcast["Description"];

            const podcastHTML = `
                <img src='${imagelink}' style= style='height: 100%; width: 100%; object-fit: contain'/img>
                <p><strong>${podcastTitle}</strong></p>
                <p><strong>Description:</strong> ${descript}</p>
                <p><strong>Audio Link:</strong> ${audioLink}</p>
            `;
        
            captionsContainer.innerHTML += podcastHTML;
         
        });

    }    catch (error) {
        //console.error(error);
        console.error('Fetch error:', error);
        captionsContainer.innerHTML = "<p>Error occurred while fetching the podcast information.</p>";
    }finally {
        submitButton.disabled = false;
    }
})

