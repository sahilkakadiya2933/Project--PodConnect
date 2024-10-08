const content = document.querySelector(".content"),
Playimage = content.querySelector(".music-image img"),
musicName = content.querySelector(".music-titles .name"),
Audio = document.querySelector(".main-song"),
playBtn = content.querySelector(".play-pause"),
playBtnIcon = content.querySelector(".play-pause span"),
prevBtn = content.querySelector("#prev"),
nextBtn = content.querySelector("#next"),
progressBar = content.querySelector(".progress-bar"),
progressDetails = content.querySelector(".progress-details"),
fileName= document.getElementById("fileName"),
audioDropBox = document.getElementById("audioDropBox");
const form = document.getElementById("conversion-form");

const captionsContainer = document.getElementById('captions');
const captionBox = document.getElementById('captions-container');
let captions = [];
let currentCaptionIndex = -1;
let transcriptionId;


function submitForm() {
  form.submit();
}

const submitButton = document.getElementById("submit");
const loadingGif = document.getElementById("loading-spinner");

window.addEventListener("load", ()=>{
    content.disabled=true;
    content.style.display="none";
    captionBox.style.display="none";
    
});

audioDropBox.addEventListener('change', async function (e) {
  const file = e.target.files[0];
  fileName.textContent = "Selected file:\n"+file.name;
  fileName.color = "red";
  const url = URL.createObjectURL(file);
  console.log(url);
  Audio.src = url;
  musicName.innerHTML = file.name;
  //Playimage.src = "photos/podcastImage.png";
});



form.addEventListener('submit', async(event) => {
  console.log("submit button clicked");
  event.preventDefault();
  submitButton.disabled=true;
  loadingGif.style.display = 'inline-block';
  submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`;
  
  const formData = new FormData(form);
  const startTime = performance.now(); // Record the start time
  const response = await fetch('http://localhost:8000/uploadaudio/',{
      method: 'POST',
      body: formData,
  });


  content.disabled=false;
  content.style.display="block";
  captionBox.style.display="block";

  // Only change button to download options if request is successful
  submitButton.textContent = "Download Options";
  submitButton.setAttribute("data-toggle", "modal");
  submitButton.setAttribute("data-target", "#downloadModal");
  submitButton.removeAttribute("type");

  const data = await response.json();
  const endTime = performance.now(); // Record the end time
  const durationInSeconds = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`Fetch request took ${durationInSeconds} seconds.`)
  transcriptionId= data.transcript_id;
  captions = data.subtitles.map(sub => ({
      start: sub.start,
      end: sub.end,
      text: sub.content.replace(/\n/g, '<br>')
  }));
  console.log(captions);
  displayCaptions(captions);
  loadingGif.style.display = 'none';
  submitButton.disabled = false;
})


// Function to display captions
function displayCaptions(captions) {
  captionsContainer.innerHTML = captions.map((caption, index) => 
    `<div id="caption-${index}" style="font-size: ${32}px;">${caption.text}</div>`
  ).join('');
  var contentHeight = document.querySelector('.content').clientHeight;
  // Set the height of the captions-container to match the content height
  document.querySelector('.captions-container').style.height = contentHeight-20 + 'px';

}


playBtn.addEventListener("click", ()=>{
  const isMusicPaused = content.classList.contains("paused");
  if(isMusicPaused){
    pauseSong();
  }
  else{
    playSong();
  }
});

function playSong(){
  content.classList.add("paused");
  playBtnIcon.innerHTML = "pause";
  Audio.play();
}

function pauseSong(){
  content.classList.remove("paused");
  playBtnIcon.innerHTML = "play_arrow";
  Audio.pause();
}

nextBtn.addEventListener("click", ()=>{
 
});

prevBtn.addEventListener("click", ()=>{
 
});


Audio.addEventListener("timeupdate", (e)=>{
  const initialTime = e.target.currentTime; // Get current music time
  const finalTime = e.target.duration; // Get music duration
  let BarWidth = (initialTime / finalTime) * 100;
  progressBar.style.width = BarWidth+"%";

  progressDetails.addEventListener("click", (e)=>{
    let progressValue = progressDetails.clientWidth; // Get width of Progress Bar
    let clickedOffsetX = e.offsetX; // get offset x value
    let MusicDuration = Audio.duration; // get total music duration

    Audio.currentTime = (clickedOffsetX / progressValue) * MusicDuration;
  });

  //Timer Logic
  Audio.addEventListener("loadeddata", ()=>{
    let finalTimeData = content.querySelector(".final");

    //Update finalDuration
    let AudioDuration = Audio.duration;
    let finalMinutes = Math.floor(AudioDuration / 60);
    let finalSeconds = Math.floor(AudioDuration % 60);
    if(finalSeconds < 10){
      finalSeconds = "0"+finalSeconds;
    }
    finalTimeData.innerText = finalMinutes+":"+finalSeconds;
  });

  //Update Current Duration
  let currentTimeData = content.querySelector(".current");
  let CurrentTime = Audio.currentTime;
  let currentMinutes = Math.floor(CurrentTime / 60);
  let currentSeconds = Math.floor(CurrentTime % 60);
  if(currentSeconds < 10){
    currentSeconds = "0"+currentSeconds;
  }
  currentTimeData.innerText = currentMinutes+":"+currentSeconds;

  const currentTime = Audio.currentTime;

    for (let i = 0; i < captions.length; i++) {
    if (currentTime >= captions[i].start && currentTime <= captions[i].end) {
        console.log(currentCaptionIndex);
        if (currentCaptionIndex !== i) {
        if (currentCaptionIndex !== -1) {
            document.getElementById(`caption-${currentCaptionIndex}`).classList.remove('highlight');
        }
        currentCaptionIndex = i;
        document.getElementById(`caption-${currentCaptionIndex}`).classList.add('highlight');
        document.getElementById(`caption-${currentCaptionIndex}`).scrollIntoView();
        }
        break;
    }
    }

});


document.getElementById("downloadSrt").addEventListener("click", async () => {
  await sendPostRequest('srt');
});

document.getElementById("downloadVtt").addEventListener("click", async () => {
  await sendPostRequest('vtt');
});

document.getElementById("downloadTxt").addEventListener("click", async () => {
  await sendPostRequest('txt');
});

async function sendPostRequest(fileType){
  try {
    const response = await fetch('http://localhost:8000/download/'+fileType+'/'+transcriptionId);
    if (!response.ok) {
        throw new Error('Failed to download file');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName.textContent+'.'+fileType; // you can set the file name here
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
} catch (error) {
    console.error('Error:', error);
}
}




