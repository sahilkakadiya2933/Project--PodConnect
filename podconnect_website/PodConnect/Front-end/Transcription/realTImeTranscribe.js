let micPermissionGranted = false;

document.getElementById('mic').addEventListener('click', () => {
    const micIcon = document.getElementById('mic');
    micIcon.classList.add('pulsing');

    if (micPermissionGranted) {
        startRecording();
    } else {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            micPermissionGranted = true;
            startRecording(stream);
        }).catch(error => {
            console.log('Error accessing media devices.', error);
            document.querySelector('#status').textContent = 'Error accessing microphone';
        });
    }
});

function startRecording(stream) {
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];
    const socket = new WebSocket('wss://api.deepgram.com/v1/listen', ['token', '369f36466d5ea29e50b3198100216e1d723e0991']);

    socket.onopen = () => {
        console.log({ event: 'onopen' });
        document.querySelector('#status').textContent = 'Transcribing';

        mediaRecorder.addEventListener('dataavailable', event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                if (socket.readyState === 1) {
                    socket.send(event.data);
                }
            }
        });

        mediaRecorder.start(250);
    };

    socket.onmessage = (message) => {
        console.log({ event: 'onmessage', message });
        const received = JSON.parse(message.data);
        const transcript = received.channel.alternatives[0].transcript;
        if (transcript && received.is_final) {
            document.querySelector('#subtitles').textContent = transcript;
        }
    };

    socket.onclose = () => {
        console.log({ event: 'onclose' });
    };

    socket.onerror = (error) => {
        console.log({ event: 'onerror', error });
        document.querySelector('#status').textContent = 'An error occurred during transcription';
        document.getElementById('mic').classList.remove('pulsing');
    };

    // Stop recording and close the socket on user click
    document.getElementById('mic').addEventListener('click', () => {
        mediaRecorder.stop();
        socket.close();
        document.getElementById('mic').classList.remove('pulsing');
        document.querySelector('#status').textContent = 'Recording stopped';
    });

    // Download the recorded audio
    mediaRecorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

        // Use FileReader to convert Blob to data URL
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            const audioUrl = reader.result;
            console.log('Audio Data URL:', audioUrl);

            // Check the prefix of the Data URL
            if (!audioUrl.startsWith('data:audio/wav;base64,')) {
                console.error('Invalid Data URL format.');
                return;
            }

            // Store the audio URL in localStorage
            localStorage.setItem('audioUrl', audioUrl);

            // Show loading GIF and text
            document.querySelector('#loading-container').style.display = 'block';

            // Add the audio file to the form
            const fileInput = document.getElementById('audioDropBox');
            const file = new File([audioBlob], 'transcription.wav', { type: 'audio/wav' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;

            // Send the form data via fetch
            const form = document.getElementById('conversion-form');
            const formData = new FormData(form);
            fetch('http://localhost:8000/uploadaudio/', {
                method: 'POST',
                body: formData,
            })
                .then(response => response.json())
                .then(jsonResponse => {
                    console.log('File uploaded successfully:', jsonResponse);

                    const { transcript_id, subtitles } = jsonResponse;

                    document.querySelector('#loading-container').style.display = 'none';
                    document.querySelector('#button-container').style.display = 'block';

                    // Add event listener for download button
                    document.getElementById('download-btn').addEventListener('click', () => {
                        $('#downloadOptionsModal').modal('show');
                    });

                    // Add event listener for listen button
                    document.getElementById('listen-btn').addEventListener('click', () => {
                        const encodedSubtitles = encodeURIComponent(JSON.stringify(subtitles));
                        window.open(`playrecording.html?transcriptionId=${transcript_id}&subtitles=${encodedSubtitles}`, '_blank');
                    });

                    // Handle downloads within the modal
                    document.getElementById('downloadSrt').addEventListener('click', async () => {
                        await sendPostRequest('srt', transcript_id);
                        downloadAudioFile(audioUrl);
                    });

                    document.getElementById('downloadVtt').addEventListener('click', async () => {
                        await sendPostRequest('vtt', transcript_id);
                        downloadAudioFile(audioUrl);
                    });

                    document.getElementById('downloadTxt').addEventListener('click', async () => {
                        await sendPostRequest('txt', transcript_id);
                        downloadAudioFile(audioUrl);
                    });
                })
                .catch(error => {
                    console.error('Failed to upload file:', error);
                });
        };
    });
}

async function sendPostRequest(fileType, transcriptId) {
    try {
        const response = await fetch('http://localhost:8000/download/' + fileType + '/' + transcriptId);
        if (!response.ok) {
            throw new Error('Failed to download file');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'subtitle.' + fileType; // You can set the file name here
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error:', error);
    }
}

function downloadAudioFile(audioUrl) {
    const audioDownloadLink = document.createElement('a');
    audioDownloadLink.style.display = 'none';
    audioDownloadLink.href = audioUrl;
    audioDownloadLink.download = 'transcription.wav';
    document.body.appendChild(audioDownloadLink);
    audioDownloadLink.click();
    window.URL.revokeObjectURL(audioUrl);
}
