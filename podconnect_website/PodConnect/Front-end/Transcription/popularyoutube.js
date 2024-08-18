async function fetchVideos() {
    document.getElementById('transcribe-form-card').style.display='none';
    document.getElementById('loading').style.display = 'block';
    try {
        const response = await fetch('http://localhost:8000/popularlist/youtube');
        if (!response.ok) {
            throw new Error('Failed to fetch videos');
        }

        const videos = await response.json();
        console.log(videos);
        displayVideos(videos);
        document.getElementById('transcribe-form-card').style.display='block';
    } catch (error) {
        console.error('Error:', error);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayVideos(videos) {
    const videosContainer = document.getElementById('videos-container');
    videosContainer.innerHTML = '';

    videos.forEach((video, index) => {
        const card = `
            <div class="card video-card" data-aos="fade-up">
                <div class="row no-gutters">
                    <div class="col-auto">
                        <img src="${video.thumbnail}" class="video-thumbnail" alt="${video.title}">
                    </div>
                    <div class="col">
                        <div class="card-body">
                            <h5 class="card-title">${index + 1}. ${video.title}</h5>
                            <p class="channel-info">${video.channel} • ${video.views} views • ${video.likes} likes</p>
                            <p class="card-text">Published At: ${new Date(video.published_at).toLocaleDateString()}</p>
                            <p class="description">${video.description}</p>
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
    window.location.href = `playyoutube.html?videoUrl=${encodeURIComponent(videoUrl)}`;
}

// Fetch videos when the page loads
document.addEventListener('DOMContentLoaded', fetchVideos);
