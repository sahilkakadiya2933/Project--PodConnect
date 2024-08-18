async function fetchTwitchVideos() {
    try {
        document.getElementById('transcribe-form-card').style.display='none';
        document.getElementById('loading').style.display = 'block';
        const response = await fetch('http://localhost:8000/popularlist/twitch');
        if (!response.ok) {
            throw new Error('Failed to fetch videos');
        }
        const videos = await response.json();
        displayTwitchVideos(videos);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('transcribe-form-card').style.display='block';
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayTwitchVideos(videos) {
    const videosContainer = document.getElementById('videos-container');
    videosContainer.innerHTML = '';

    videos.forEach((video, index) => {
        const card = `
            <div class="card video-card">
                <div class="row no-gutters">
                   <!-- <div class="col-auto">
                        <img src="${video.thumbnail_url}" class="video-thumbnail" alt="${video.title}">
                    </div> -->
                    <div class="col">
                        <div class="card-body">
                            <h5 class="card-title">${index + 1}. ${video.title}</h5>
                            <p class="channel-info">${video.user_name} • ${video.view_count} views</p>
                            <p class="card-text">Published At: ${new Date(video.published_at).toLocaleDateString()}</p>
                            <p class="description">${video.description}</p>
                            <p class="description">Duration: ${video.duration}</p>
                            <button class="btn btn-primary" onclick="redirectToVideo('${video.url}')">Transcribe Video</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        videosContainer.innerHTML += card;
    });
}


function redirectToVideo(videoUrl) {
    window.location.href = `playTwitch.html?videoUrl=${encodeURIComponent(videoUrl)}`;
}


// Fetch videos when the page loads
document.addEventListener('DOMContentLoaded', fetchTwitchVideos);
