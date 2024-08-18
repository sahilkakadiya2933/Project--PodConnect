const twitchForm = document.getElementById("twitch-form");
var iframeDocument = null;
var iframe = null;

document.addEventListener('DOMContentLoaded', async (event) => {
    event.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('videoUrl');
    const videoId = getVideoIdFromUrl(videoUrl);
    const formData = new FormData();
    formData.append("link", videoUrl);

    const response = await fetch('http://localhost:8000/twitchaudio/', {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();
    document.getElementById("loading").style.display='none';
    document.getElementById("videoContainer").style.display='block';
    // Remove any existing iframe if it exists
    const existingIframe = document.querySelector('#twitch-embed iframe');
    if (existingIframe) {
        existingIframe.remove();
    }

    // Create a new iframe
    var player = new  Twitch.Embed("player", {
        width: 640,
        height: 360,
        parent: ["localhost"], // Replace with your actual hostname if different
        layout: "video",
        autoplay: false,
        video: videoId
    })

    //Initialize subtitles
    const captions = data.subtitles.map(sub => ({
        start: sub.start,
        end: sub.end,
        text: sub.content.replace(/\n/g, '<br>')
    }));

    synchronizeSubtitles(player, captions);
});


function getVideoIdFromUrl(url) {
    const parts = url.split('/');
    return parts.pop(); // This will get the last part of the URL
}



function synchronizeSubtitles(iframe, captions) {
    let subtitleIndex = 0;
    const subtitleDiv = document.getElementById("subtitles");
    console.log(captions);
    const checkSubtitles = () => {
        const currentTime = getCurrentTime(iframe);
        console.log(currentTime);
        console.log(captions);
        if (currentTime === null) return;

        if (subtitleIndex < captions.length && currentTime >= captions[subtitleIndex].start) {
            subtitleDiv.innerHTML = captions[subtitleIndex].text;
            subtitleIndex++;
        }
        
        if (subtitleIndex < captions.length && currentTime >= captions[subtitleIndex].end) {
            subtitleDiv.innerHTML = "";
            subtitleIndex++;
        }
    };

    setInterval(checkSubtitles, 500); // Check every second
}

function getCurrentTime(iframe) {
    try {
        
        
        if (iframe) {
            return iframe.getCurrentTime();
        }
    } catch (error) {
        console.error("Error accessing iframe content:", error);
    }
    return null;
}
