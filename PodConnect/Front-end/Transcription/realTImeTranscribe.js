document.getElementById('mic').addEventListener('click', () => {
    const micIcon = document.getElementById('mic');
    micIcon.classList.add('pulsing');
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        const socket = new WebSocket('wss://api.deepgram.com/v1/listen', ['token', '369f36466d5ea29e50b3198100216e1d723e0991']);

        socket.onopen = () => {
            console.log({ event: 'onopen' });
            document.querySelector('#status').textContent = 'Transcribing';
            mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data.size > 0 && socket.readyState == 1) {
                    socket.send(event.data);
                }
            });
            mediaRecorder.start(250);

            // Stop the execution after 10 seconds
            setTimeout(() => {
                mediaRecorder.stop();
                socket.close();
                micIcon.classList.remove('pulsing');
                document.querySelector('#status').textContent = 'Disconnected after 10 seconds';
            }, 10000);
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
        };
    });
});