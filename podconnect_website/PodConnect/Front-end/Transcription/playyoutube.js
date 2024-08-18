var captions = null;
var videoId;
var subtitleIndex = 0;
var player;
var done = false;

document.addEventListener('DOMContentLoaded', async (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('videoUrl');
    videoId = getVideoIdFromUrl(videoUrl);
    
    const formData = new FormData();
    formData.append("link", videoUrl);
    
    const startTime = performance.now(); // Record the start time
    try {
        const response = await fetch('http://localhost:8000/ytaudio/', {
            method: 'POST',
            body: formData,
        });
        const endTime = performance.now(); // Record the end time
        const durationInSeconds = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`Fetch request took ${durationInSeconds} seconds.`);

        const data = await response.json();
        document.getElementById("loading").style.display='none';
        document.getElementById("videoContainer").style.display='block';
        // Initialize subtitles
        captions = data.subtitles.map(sub => ({
            start: sub.start,
            end: sub.end,
            text: sub.content.replace(/\n/g, '<br>')
        }));
        
        // Load YouTube IFrame API
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
    } catch (error) {
        console.error('Error fetching subtitles:', error);
    }
});

function getVideoIdFromUrl(url) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("v");
}

function synchronizeSubtitles() {
    if (!captions || !player) return;

    const currentTime = player.getCurrentTime();
    if (currentTime === null) return;

    if (subtitleIndex < captions.length && currentTime >= captions[subtitleIndex].start) {
        document.getElementById("subtitles").innerHTML = captions[subtitleIndex].text;
        subtitleIndex++;
    }
    if (subtitleIndex < captions.length && currentTime >= captions[subtitleIndex].end) {
        document.getElementById("subtitles").innerHTML = "";
        subtitleIndex++;
    }
}

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '390',
        width: '640',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'autoplay': 0,
            'enablejsapi': 1  // Enable API for controlling the player
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
        }
    });
}

function onPlayerReady(event) {
    event.target.playVideo();
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING && !done) {
        if (captions) {
            setInterval(synchronizeSubtitles, 500);
            done = true;
        }
    }
}
