const ytForm = document.getElementById("yt-form");
var captions = null;
var videoId;
var subtitleIndex = 0;
var player;
var done = false;

ytForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const ytLink = document.getElementById("ytLink").value;
    videoId = getVideoIdFromUrl(ytLink);
    const formData = new FormData();
    formData.append("link", ytLink);
    const startTime = performance.now(); // Record the start time
    const response = await fetch('http://localhost:8000/ytaudio/', {
        method: 'POST',
        body: formData,
    });
    const endTime = performance.now(); // Record the end time
    const durationInSeconds = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`Fetch request took ${durationInSeconds} seconds.`)
    const data = await response.json();

    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    //Initialize subtitles
    captions = data.subtitles.map(sub => ({
        start: sub.start,
        end: sub.end,
        text: sub.content.replace(/\n/g, '<br>')
    }));
});


function getVideoIdFromUrl(url) {
    const parts = url.split('=');
    return parts[parts.length - 1];
}


function synchronizeSubtitles() {
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
            'enablejsapi': 0  // Disable postMessage handling
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
        }
    }
}


